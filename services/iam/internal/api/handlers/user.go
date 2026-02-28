package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	service "atlas-core-api/services/iam/internal/application"
)

type UserHandler struct {
	userService *service.UserService
}

func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// GetCurrentUser returns the authenticated user's profile
func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "User ID not found in context",
		})
		return
	}

	user, err := h.userService.GetByID(userID.(string))
	if err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "not_found",
				"message": "User not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to retrieve user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": user})
}

// GetUser returns a user by ID
func (h *UserHandler) GetUser(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "User ID is required",
		})
		return
	}

	user, err := h.userService.GetByID(id)
	if err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "not_found",
				"message": "User not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to retrieve user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": user})
}

// UpdateUser updates a user by ID
func (h *UserHandler) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "User ID is required",
		})
		return
	}

	// Authorization: users can only update themselves, admins can update anyone
	currentUserID, _ := c.Get("user_id")
	roles, _ := c.Get("roles")
	isAdmin := false
	if userRoles, ok := roles.([]interface{}); ok {
		for _, r := range userRoles {
			if rs, ok := r.(string); ok && rs == "admin" {
				isAdmin = true
				break
			}
		}
	}

	if currentUserID.(string) != id && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "You can only update your own profile",
		})
		return
	}

	var req service.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": err.Error(),
		})
		return
	}

	user, err := h.userService.Update(id, req)
	if err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "not_found",
				"message": "User not found",
			})
			return
		}
		if errors.Is(err, service.ErrUserAlreadyExists) {
			c.JSON(http.StatusConflict, gin.H{
				"error":   "conflict",
				"message": "Username or email already in use",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to update user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    user,
		"message": "User updated successfully",
	})
}

// DeleteUser soft-deletes a user by ID (admin only)
func (h *UserHandler) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "User ID is required",
		})
		return
	}

	if err := h.userService.Delete(id); err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "not_found",
				"message": "User not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to delete user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// ListUsers returns paginated list of users (admin only)
func (h *UserHandler) ListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	result, err := h.userService.List(page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to list users",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result.Users,
		"meta": gin.H{
			"total": result.Total,
			"page":  result.Page,
			"limit": result.Limit,
		},
	})
}

// ListRoles returns all available roles
func (h *UserHandler) ListRoles(c *gin.Context) {
	roles, err := h.userService.ListRoles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to list roles",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": roles})
}

// CreateRole creates a new role (admin only)
func (h *UserHandler) CreateRole(c *gin.Context) {
	var req service.CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": err.Error(),
		})
		return
	}

	role, err := h.userService.CreateRole(req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "bad_request",
				"message": err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to create role",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    role,
		"message": "Role created successfully",
	})
}

// AssignRole assigns a role to a user (admin only)
func (h *UserHandler) AssignRole(c *gin.Context) {
	userID := c.Param("id")
	roleID := c.Param("roleId")

	if userID == "" || roleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "User ID and Role ID are required",
		})
		return
	}

	if err := h.userService.AssignRole(userID, roleID); err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "not_found",
				"message": "User not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to assign role",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role assigned successfully"})
}

// RemoveRole removes a role from a user (admin only)
func (h *UserHandler) RemoveRole(c *gin.Context) {
	userID := c.Param("id")
	roleID := c.Param("roleId")

	if userID == "" || roleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "bad_request",
			"message": "User ID and Role ID are required",
		})
		return
	}

	if err := h.userService.RemoveRole(userID, roleID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_error",
			"message": "Failed to remove role",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role removed successfully"})
}
