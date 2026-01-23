package handlers

import (
	"net/http"

	"atlas-core-api/services/api-gateway/internal/api/proxy"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	iamService *proxy.Service
}

func NewAuthHandler(iamService *proxy.Service) *AuthHandler {
	return &AuthHandler{iamService: iamService}
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
	User         User   `json:"user"`
}

type User struct {
	ID          string   `json:"id"`
	Username    string   `json:"username"`
	Roles       []string `json:"roles"`
	Permissions []string `json:"permissions"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	h.iamService.ForwardRequest(c)
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// TODO: Implement token refresh by proxying to iam-service
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}
