package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"atlas-core-api/services/api-gateway/internal/domain/types"
	"atlas-core-api/services/api-gateway/internal/infrastructure/config"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

// CustomClaims represents JWT custom claims
type CustomClaims struct {
	UserID      string   `json:"user_id"`
	Username    string   `json:"username"`
	Email       string   `json:"email"`
	Roles       []string `json:"roles"`
	Permissions []string `json:"permissions"`
	MFAVerified bool     `json:"mfa_verified"`
	jwt.RegisteredClaims
}

// Authenticate validates JWT token and extracts user information
func Authenticate(cfg *config.Config, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			apiErr := types.NewAPIError(types.ErrUnauthorized, "Authorization header required")
			c.AbortWithStatusJSON(http.StatusUnauthorized, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		// Check Bearer token format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			apiErr := types.NewAPIError(types.ErrUnauthorized, "Invalid authorization header format")
			c.AbortWithStatusJSON(http.StatusUnauthorized, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		tokenString := parts[1]

		// Parse and validate JWT
		token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
			// Validate signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(cfg.Auth.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			logger.Warn("Invalid token", zap.Error(err), zap.String("user_ip", c.ClientIP()))
			apiErr := types.NewAPIError(types.ErrTokenInvalid, "Invalid or expired token")
			c.AbortWithStatusJSON(http.StatusUnauthorized, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		// Extract and validate claims
		claims, ok := token.Claims.(*CustomClaims)
		if !ok {
			logger.Warn("Invalid token claims")
			apiErr := types.NewAPIError(types.ErrTokenInvalid, "Invalid token claims")
			c.AbortWithStatusJSON(http.StatusUnauthorized, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		// Check if token is expired
		if claims.ExpiresAt != nil && claims.ExpiresAt.Before(jwt.NumericDate{}.Time) {
			logger.Warn("Token expired", zap.String("user_id", claims.UserID))
			apiErr := types.NewAPIError(types.ErrTokenExpired, "Token has expired")
			c.AbortWithStatusJSON(http.StatusUnauthorized, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		// If MFA is required, verify it was done
		if cfg.Auth.MFARequired && !claims.MFAVerified {
			logger.Warn("MFA required but not verified", zap.String("user_id", claims.UserID))
			apiErr := types.NewAPIError(types.ErrMFARequired, "MFA verification required")
			c.AbortWithStatusJSON(http.StatusForbidden, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		// Store claims in context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("email", claims.Email)
		c.Set("roles", claims.Roles)
		c.Set("permissions", claims.Permissions)
		c.Set("mfa_verified", claims.MFAVerified)

		logger.Debug("User authenticated", zap.String("user_id", claims.UserID), zap.Strings("roles", claims.Roles))

		c.Next()
	}
}

// RequireRole checks if user has required role(s)
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRoles, exists := c.Get("roles")
		if !exists {
			apiErr := types.NewAPIError(types.ErrForbidden, "User roles not found")
			c.AbortWithStatusJSON(http.StatusForbidden, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		userRolesList, ok := userRoles.([]string)
		if !ok {
			apiErr := types.NewAPIError(types.ErrForbidden, "Invalid user roles format")
			c.AbortWithStatusJSON(http.StatusForbidden, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		// Check if user has any of the required roles
		hasRole := false
		for _, requiredRole := range roles {
			for _, userRole := range userRolesList {
				if userRole == requiredRole {
					hasRole = true
					break
				}
			}
			if hasRole {
				break
			}
		}

		if !hasRole {
			apiErr := types.NewAPIError(types.ErrPermissionDenied, "Insufficient permissions")
			c.AbortWithStatusJSON(http.StatusForbidden, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		c.Next()
	}
}

// RequirePermission checks if user has required permission
func RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		permissions, exists := c.Get("permissions")
		if !exists {
			apiErr := types.NewAPIError(types.ErrForbidden, "User permissions not found")
			c.AbortWithStatusJSON(http.StatusForbidden, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		permissionsList, ok := permissions.([]string)
		if !ok {
			apiErr := types.NewAPIError(types.ErrForbidden, "Invalid permissions format")
			c.AbortWithStatusJSON(http.StatusForbidden, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		// Check if user has the required permission
		hasPermission := false
		for _, p := range permissionsList {
			if p == permission || p == "*" {
				hasPermission = true
				break
			}
		}

		if !hasPermission {
			apiErr := types.NewAPIError(types.ErrPermissionDenied, fmt.Sprintf("Permission '%s' required", permission))
			c.AbortWithStatusJSON(http.StatusForbidden, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		c.Next()
	}
}

// ParseToken parses and validates a JWT token without requiring it in context
func ParseToken(tokenString string, cfg *config.Config) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(cfg.Auth.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		return nil, err
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}
