package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	service "atlas-core-api/services/iam/internal/application"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	MFACode  string `json:"mfa_code,omitempty"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": err.Error(),
		})
		return
	}

	user, accessToken, refreshToken, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Invalid credentials",
		})
		return
	}

	// Update last login
	h.authService.RecordLogin(user.ID)

	// Set httpOnly cookies
	c.SetCookie("access_token", accessToken, 3600, "/", "", true, true)
	c.SetCookie("refresh_token", refreshToken, 86400*7, "/", "", true, true)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"roles":    user.Roles,
		},
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    3600,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	// Extract token for blacklisting
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			h.authService.BlacklistToken(parts[1])
		}
	}

	// Also try cookie
	if token, err := c.Cookie("access_token"); err == nil && token != "" {
		h.authService.BlacklistToken(token)
	}
	if token, err := c.Cookie("refresh_token"); err == nil && token != "" {
		h.authService.BlacklistToken(token)
	}

	// Clear cookies
	c.SetCookie("access_token", "", -1, "/", "", true, true)
	c.SetCookie("refresh_token", "", -1, "/", "", true, true)

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// Get refresh token from body, header, or cookie
	var refreshToken string

	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.ShouldBindJSON(&body); err == nil && body.RefreshToken != "" {
		refreshToken = body.RefreshToken
	}

	if refreshToken == "" {
		if token, err := c.Cookie("refresh_token"); err == nil {
			refreshToken = token
		}
	}

	if refreshToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "Refresh token is required",
		})
		return
	}

	// Validate refresh token and generate new pair
	accessToken, newRefreshToken, err := h.authService.RefreshTokens(refreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "Invalid or expired refresh token",
		})
		return
	}

	// Set new cookies
	c.SetCookie("access_token", accessToken, 3600, "/", "", true, true)
	c.SetCookie("refresh_token", newRefreshToken, 86400*7, "/", "", true, true)

	c.JSON(http.StatusOK, gin.H{
		"access_token":  accessToken,
		"refresh_token": newRefreshToken,
		"token_type":    "Bearer",
		"expires_in":    3600,
	})
}

type RegisterRequest struct {
	Username  string `json:"username" binding:"required,min=3,max=50"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": err.Error(),
		})
		return
	}

	user, err := h.authService.Register(req.Username, req.Email, req.Password, req.FirstName, req.LastName)
	if err != nil {
		if err.Error() == "user already exists" {
			c.JSON(http.StatusConflict, gin.H{
				"error":   "conflict",
				"message": "Username or email already in use",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to create account",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
		},
		"message": "Account created successfully",
	})
}
