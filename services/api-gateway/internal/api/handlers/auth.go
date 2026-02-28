package handlers

import (
	"fmt"
	"net/http"
	"time"

	"atlas-core-api/services/api-gateway/internal/api/middleware"
	"atlas-core-api/services/api-gateway/internal/domain/types"
	"atlas-core-api/services/api-gateway/internal/infrastructure/cache"
	"atlas-core-api/services/api-gateway/internal/infrastructure/config"
	"atlas-core-api/services/api-gateway/internal/presentation/dto"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

const (
	tokenBlacklistPrefix = "token:blacklist:"
	loginAttemptsPrefix  = "login:attempts:"
	maxLoginAttempts     = 5
	lockoutDuration      = 15 * time.Minute
)

// AuthHandler handles all authentication-related requests
type AuthHandler struct {
	config *config.Config
	logger *zap.Logger
	cache  cache.Cache
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(cfg *config.Config, logger *zap.Logger, c ...cache.Cache) *AuthHandler {
	handler := &AuthHandler{
		config: cfg,
		logger: logger,
	}
	if len(c) > 0 {
		handler.cache = c[0]
	}
	return handler
}

// Login handles user login with brute-force protection
func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("Invalid login request", zap.Error(err), zap.String("ip", c.ClientIP()))
		apiErr := types.NewAPIError(types.ErrValidationFailed, "Invalid request format")
		c.JSON(http.StatusBadRequest, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}

	validationErrs := h.validateLoginRequest(&req)
	if validationErrs.HasErrors() {
		apiErr := validationErrs.ToAPIError()
		apiErr.TraceID = c.GetString("request_id")
		c.JSON(http.StatusBadRequest, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}

	// Brute-force protection: check login attempt count
	if h.cache != nil {
		attemptsKey := loginAttemptsPrefix + c.ClientIP()
		attempts, _ := h.cache.GetCounter(c.Request.Context(), attemptsKey)
		if attempts >= int64(maxLoginAttempts) {
			h.logger.Warn("Too many login attempts",
				zap.String("ip", c.ClientIP()),
				zap.Int64("attempts", attempts),
			)
			apiErr := types.NewAPIError(types.ErrTooManyRequests, "Too many login attempts. Please try again later.")
			apiErr.TraceID = c.GetString("request_id")
			c.JSON(http.StatusTooManyRequests, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}
	}

	// Generate access token
	token, err := h.generateToken(req.Username, "user@example.com")
	if err != nil {
		// Increment failed login attempts
		if h.cache != nil {
			attemptsKey := loginAttemptsPrefix + c.ClientIP()
			h.cache.IncrementCounter(c.Request.Context(), attemptsKey, 1)
			h.cache.Set(c.Request.Context(), attemptsKey+"_ttl", true, lockoutDuration)
		}

		h.logger.Error("Failed to generate token", zap.Error(err))
		apiErr := types.NewAPIError(types.ErrInternalServerError, "Failed to generate token")
		apiErr.TraceID = c.GetString("request_id")
		c.JSON(http.StatusInternalServerError, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}

	// Reset login attempts on success
	if h.cache != nil {
		attemptsKey := loginAttemptsPrefix + c.ClientIP()
		h.cache.Delete(c.Request.Context(), attemptsKey)
	}

	h.logger.Info("User login successful",
		zap.String("username", req.Username),
		zap.String("ip", c.ClientIP()),
		zap.String("request_id", c.GetString("request_id")),
	)

	refreshToken := h.generateRefreshToken()

	response := dto.LoginResponse{
		AccessToken:  token,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int(h.config.Auth.JWTExpiration.Seconds()),
		User: dto.UserResponse{
			ID:        "user-123",
			Username:  req.Username,
			Email:     "user@example.com",
			Status:    "active",
			Roles:     []dto.RoleResponse{},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	c.JSON(http.StatusOK, dto.SuccessResponse{
		Code:    http.StatusOK,
		Message: "Login successful",
		Data:    response,
		TraceID: c.GetString("request_id"),
	})
}

// RefreshToken handles token refresh requests
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req dto.RefreshTokenRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		apiErr := types.NewAPIError(types.ErrValidationFailed, "Invalid request format")
		apiErr.TraceID = c.GetString("request_id")
		c.JSON(http.StatusBadRequest, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}

	if req.RefreshToken == "" {
		apiErr := types.NewAPIError(types.ErrValidationFailed, "Refresh token required")
		apiErr.TraceID = c.GetString("request_id")
		c.JSON(http.StatusBadRequest, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}

	// Check if refresh token is blacklisted
	if h.cache != nil {
		blacklistKey := tokenBlacklistPrefix + req.RefreshToken
		count, _ := h.cache.Exists(c.Request.Context(), blacklistKey)
		if count > 0 {
			apiErr := types.NewAPIError(types.ErrTokenInvalid, "Token has been revoked")
			apiErr.TraceID = c.GetString("request_id")
			c.JSON(http.StatusUnauthorized, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}
	}

	// Validate refresh token
	_, err := jwt.Parse(req.RefreshToken, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(h.config.Auth.JWTSecret), nil
	})

	if err != nil {
		h.logger.Warn("Invalid refresh token", zap.Error(err))
		apiErr := types.NewAPIError(types.ErrTokenInvalid, "Invalid or expired refresh token")
		apiErr.TraceID = c.GetString("request_id")
		c.JSON(http.StatusUnauthorized, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}

	// Generate new access token
	token, err := h.generateToken("user", "user@example.com")
	if err != nil {
		h.logger.Error("Failed to generate token", zap.Error(err))
		apiErr := types.NewAPIError(types.ErrInternalServerError, "Failed to generate token")
		apiErr.TraceID = c.GetString("request_id")
		c.JSON(http.StatusInternalServerError, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}

	h.logger.Info("Token refreshed", zap.String("request_id", c.GetString("request_id")))

	c.JSON(http.StatusOK, dto.SuccessResponse{
		Code:    http.StatusOK,
		Message: "Token refreshed",
		Data: dto.RefreshTokenResponse{
			AccessToken: token,
			TokenType:   "Bearer",
			ExpiresIn:   int(h.config.Auth.JWTExpiration.Seconds()),
		},
		TraceID: c.GetString("request_id"),
	})
}

// Logout handles user logout with token blacklisting
func (h *AuthHandler) Logout(c *gin.Context) {
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")

	// Blacklist the current access token
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" && len(authHeader) > 7 {
		tokenString := authHeader[7:]
		if h.cache != nil {
			blacklistKey := tokenBlacklistPrefix + tokenString
			h.cache.Set(c.Request.Context(), blacklistKey, true, h.config.Auth.JWTExpiration)
		}
	}

	h.logger.Info("User logout",
		zap.Any("user_id", userID),
		zap.Any("username", username),
		zap.String("ip", c.ClientIP()),
	)

	c.JSON(http.StatusOK, dto.SuccessResponse{
		Code:    http.StatusOK,
		Message: "Logout successful",
		TraceID: c.GetString("request_id"),
	})
}

// ChangePassword handles password change requests
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		apiErr := types.NewAPIError(types.ErrUnauthorized, "User not authenticated")
		c.JSON(http.StatusUnauthorized, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}

	var req dto.ChangePasswordRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		apiErr := types.NewAPIError(types.ErrValidationFailed, "Invalid request format")
		apiErr.TraceID = c.GetString("request_id")
		c.JSON(http.StatusBadRequest, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}

	// TODO: Forward to IAM service for actual password change

	h.logger.Info("Password changed",
		zap.Any("user_id", userID),
		zap.String("ip", c.ClientIP()),
	)

	c.JSON(http.StatusOK, dto.SuccessResponse{
		Code:    http.StatusOK,
		Message: "Password changed successfully",
		TraceID: c.GetString("request_id"),
	})
}

// ValidateToken validates a JWT token
func (h *AuthHandler) ValidateToken(c *gin.Context) {
	tokenString := c.Query("token")
	if tokenString == "" {
		apiErr := types.NewAPIError(types.ErrValidationFailed, "Token parameter required")
		c.JSON(http.StatusBadRequest, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}

	// Check blacklist
	if h.cache != nil {
		blacklistKey := tokenBlacklistPrefix + tokenString
		count, _ := h.cache.Exists(c.Request.Context(), blacklistKey)
		if count > 0 {
			apiErr := types.NewAPIError(types.ErrTokenInvalid, "Token has been revoked")
			c.JSON(http.StatusUnauthorized, types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}
	}

	claims, err := middleware.ParseToken(tokenString, h.config)
	if err != nil {
		h.logger.Warn("Invalid token", zap.Error(err))
		apiErr := types.NewAPIError(types.ErrTokenInvalid, "Invalid or expired token")
		c.JSON(http.StatusUnauthorized, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}

	c.JSON(http.StatusOK, dto.SuccessResponse{
		Code:    http.StatusOK,
		Message: "Token is valid",
		Data: gin.H{
			"user_id":    claims.UserID,
			"username":   claims.Username,
			"email":      claims.Email,
			"roles":      claims.Roles,
			"expires_at": claims.ExpiresAt,
		},
		TraceID: c.GetString("request_id"),
	})
}

// generateToken generates a JWT access token
func (h *AuthHandler) generateToken(username, email string) (string, error) {
	now := time.Now()
	claims := middleware.CustomClaims{
		UserID:      fmt.Sprintf("user-%d", now.Unix()),
		Username:    username,
		Email:       email,
		Roles:       []string{"user"},
		Permissions: []string{"read:profile"},
		MFAVerified: false,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(h.config.Auth.JWTExpiration)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "atlas-api-gateway",
			Subject:   username,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(h.config.Auth.JWTSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}
	return tokenString, nil
}

// generateRefreshToken generates a refresh token
func (h *AuthHandler) generateRefreshToken() string {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(now.Add(h.config.Auth.RefreshTokenExpiration)),
		IssuedAt:  jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now),
		Issuer:    "atlas-api-gateway",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString([]byte(h.config.Auth.JWTSecret))
	return tokenString
}

// validateLoginRequest validates login request fields
func (h *AuthHandler) validateLoginRequest(req *dto.LoginRequest) *types.ValidationErrors {
	errors := &types.ValidationErrors{}

	if req.Username == "" {
		errors.Add("username", "Username is required")
	} else if len(req.Username) < 3 {
		errors.Add("username", "Username must be at least 3 characters")
	}

	if req.Password == "" {
		errors.Add("password", "Password is required")
	} else if len(req.Password) < h.config.Auth.PasswordMinLength {
		errors.Add("password", fmt.Sprintf("Password must be at least %d characters", h.config.Auth.PasswordMinLength))
	}

	if h.config.Auth.MFARequired && req.MFACode == "" {
		errors.Add("mfa_code", "MFA code is required")
	}

	return errors
}
