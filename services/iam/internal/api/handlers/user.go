package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	service "atlas-core-api/services/iam/internal/application"
)

type UserHandler struct {
	userService *service.UserService
}

func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	userID, _ := c.Get("user_id")
	
	user, err := h.userService.GetByID(userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": user})
}

func (h *UserHandler) GetUser(c *gin.Context) {
	// TODO: Implement
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	// TODO: Implement
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}

func (h *UserHandler) ListRoles(c *gin.Context) {
	// TODO: Implement
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}

func (h *UserHandler) CreateRole(c *gin.Context) {
	// TODO: Implement
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}
