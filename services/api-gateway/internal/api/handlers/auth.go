package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

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
	User         User   `json:"user"`
}

type User struct {
	ID          string   `json:"id"`
	Username    string   `json:"username"`
	Roles       []string `json:"roles"`
	Permissions []string `json:"permissions"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Call IAM service for authentication
	// For now, return mock response
	accessToken := "mock-access-token"
	refreshToken := "mock-refresh-token"

	// Set httpOnly cookies for security
	c.SetCookie(
		"access_token",      // name
		accessToken,         // value
		3600,                // maxAge (1 hour)
		"/",                 // path
		"",                  // domain (empty = current domain)
		true,                // secure (HTTPS only)
		true,                // httpOnly (not accessible via JavaScript)
	)

	c.SetCookie(
		"refresh_token",
		refreshToken,
		86400*7,             // maxAge (7 days)
		"/",
		"",
		true,
		true,
	)

	response := User{
		ID:          "user-123",
		Username:    req.Username,
		Roles:       []string{"analyst"},
		Permissions: []string{"read:risks", "write:scenarios"},
	}

	c.JSON(http.StatusOK, gin.H{"data": response})
}

func RefreshToken(c *gin.Context) {
	// TODO: Implement token refresh
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}
