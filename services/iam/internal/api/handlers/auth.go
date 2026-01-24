package handlers

import (
	"net/http"

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

type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, accessToken, refreshToken, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Set httpOnly cookies
	c.SetCookie(
		"access_token",
		accessToken,
		3600,                // 1 hour
		"/",
		"",
		true,                // secure
		true,                // httpOnly
	)

	c.SetCookie(
		"refresh_token",
		refreshToken,
		86400*7,             // 7 days
		"/",
		"",
		true,
		true,
	)

	// Return user data in response
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id": user.ID,
			"username": user.Username,
			"roles": user.Roles,
			"permissions": []string{}, // TODO: Get actual permissions
		},
		"access_token": accessToken,
		"refresh_token": refreshToken,
		"token_type": "Bearer",
		"expires_in": 3600,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	// Clear cookies by setting maxAge to -1
	c.SetCookie("access_token", "", -1, "/", "", true, true)
	c.SetCookie("refresh_token", "", -1, "/", "", true, true)

	// TODO: Implement token blacklisting in Redis
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// TODO: Implement token refresh
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}
