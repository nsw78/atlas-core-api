package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
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

// iamLoginResponse represents the response from the IAM service's login endpoint.
type iamLoginResponse struct {
	Data struct {
		ID       string   `json:"id"`
		Username string   `json:"username"`
		Email    string   `json:"email"`
		Roles    []string `json:"roles"`
	} `json:"data"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
}

// Login handles user login with brute-force protection.
// It forwards credentials to the IAM service for validation, then issues a
// gateway JWT containing the real user data returned by IAM.
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

	// ---- Forward login request to the IAM service ----
	iamBaseURL, exists := h.config.Services.Registry["iam-service"]
	if !exists {
		// Fallback to the dedicated IAMService config
		iamBaseURL = h.config.Services.IAMService.URL
	}

	iamPayload, _ := json.Marshal(map[string]string{
		"username": req.Username,
		"password": req.Password,
	})

	iamReq, err := http.NewRequestWithContext(
		c.Request.Context(),
		http.MethodPost,
		iamBaseURL+"/api/v1/auth/login",
		bytes.NewReader(iamPayload),
	)
	if err != nil {
		h.logger.Error("Failed to create IAM request", zap.Error(err))
		apiErr := types.NewAPIError(types.ErrInternalServerError, "Internal server error")
		apiErr.TraceID = c.GetString("request_id")
		c.JSON(http.StatusInternalServerError, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}
	iamReq.Header.Set("Content-Type", "application/json")
	iamReq.Header.Set("X-Request-ID", c.GetString("request_id"))

	iamTimeout := h.config.Services.IAMService.Timeout
	if iamTimeout == 0 {
		iamTimeout = 10 * time.Second
	}
	httpClient := &http.Client{Timeout: iamTimeout}

	iamResp, err := httpClient.Do(iamReq)
	if err != nil {
		h.logger.Error("IAM service unreachable", zap.Error(err))
		apiErr := types.NewAPIError(types.ErrInternalServerError, "Authentication service unavailable")
		apiErr.TraceID = c.GetString("request_id")
		c.JSON(http.StatusServiceUnavailable, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}
	defer iamResp.Body.Close()

	iamBody, _ := io.ReadAll(iamResp.Body)

	// If IAM rejected the credentials, increment brute-force counter and relay error
	if iamResp.StatusCode != http.StatusOK {
		if h.cache != nil {
			attemptsKey := loginAttemptsPrefix + c.ClientIP()
			h.cache.IncrementCounter(c.Request.Context(), attemptsKey, 1)
			h.cache.Set(c.Request.Context(), attemptsKey+"_ttl", true, lockoutDuration)
		}

		h.logger.Warn("IAM login rejected",
			zap.String("username", req.Username),
			zap.Int("iam_status", iamResp.StatusCode),
		)
		apiErr := types.NewAPIError(types.ErrUnauthorized, "Invalid username or password")
		apiErr.TraceID = c.GetString("request_id")
		c.JSON(http.StatusUnauthorized, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}

	// Parse IAM response to extract real user data
	var iamLogin iamLoginResponse
	if err := json.Unmarshal(iamBody, &iamLogin); err != nil {
		h.logger.Error("Failed to parse IAM response", zap.Error(err), zap.String("body", string(iamBody)))
		apiErr := types.NewAPIError(types.ErrInternalServerError, "Failed to process authentication response")
		apiErr.TraceID = c.GetString("request_id")
		c.JSON(http.StatusInternalServerError, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}

	userData := iamLogin.Data
	if userData.ID == "" {
		h.logger.Error("IAM response missing user ID", zap.String("body", string(iamBody)))
		apiErr := types.NewAPIError(types.ErrInternalServerError, "Invalid authentication response")
		apiErr.TraceID = c.GetString("request_id")
		c.JSON(http.StatusInternalServerError, types.NewErrorResponse(apiErr, c.Request.URL.Path))
		return
	}

	// Derive permissions from roles
	permissions := derivePermissions(userData.Roles)

	// Generate a gateway JWT using real user data from IAM
	token, err := h.generateToken(userData.ID, userData.Username, userData.Email, userData.Roles, permissions)
	if err != nil {
		h.logger.Error("Failed to generate gateway token", zap.Error(err))
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
		zap.String("user_id", userData.ID),
		zap.String("username", userData.Username),
		zap.String("ip", c.ClientIP()),
		zap.String("request_id", c.GetString("request_id")),
	)

	refreshToken := h.generateRefreshToken()

	// Build role responses from the IAM roles list
	roleResponses := make([]dto.RoleResponse, 0, len(userData.Roles))
	for _, r := range userData.Roles {
		roleResponses = append(roleResponses, dto.RoleResponse{Name: r})
	}

	response := dto.LoginResponse{
		AccessToken:  token,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int(h.config.Auth.JWTExpiration.Seconds()),
		User: dto.UserResponse{
			ID:        userData.ID,
			Username:  userData.Username,
			Email:     userData.Email,
			Status:    "active",
			Roles:     roleResponses,
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

// derivePermissions maps role names to a base set of permissions.
func derivePermissions(roles []string) []string {
	permSet := map[string]struct{}{}
	for _, role := range roles {
		switch role {
		case "admin":
			permSet["admin:all"] = struct{}{}
			permSet["read:profile"] = struct{}{}
			permSet["write:profile"] = struct{}{}
		case "analyst":
			permSet["read:profile"] = struct{}{}
			permSet["read:reports"] = struct{}{}
			permSet["write:reports"] = struct{}{}
		default:
			permSet["read:profile"] = struct{}{}
		}
	}
	perms := make([]string, 0, len(permSet))
	for p := range permSet {
		perms = append(perms, p)
	}
	return perms
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
	parsedToken, err := jwt.Parse(req.RefreshToken, func(token *jwt.Token) (interface{}, error) {
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

	// Extract user info from the refresh token claims for the new access token
	refreshClaims, ok := parsedToken.Claims.(jwt.MapClaims)
	refreshUserID := "unknown"
	refreshUsername := "unknown"
	refreshEmail := ""
	var refreshRoles []string
	var refreshPermissions []string
	if ok {
		if v, exists := refreshClaims["user_id"]; exists {
			if s, ok := v.(string); ok {
				refreshUserID = s
			}
		}
		if v, exists := refreshClaims["username"]; exists {
			if s, ok := v.(string); ok {
				refreshUsername = s
			}
		}
		if v, exists := refreshClaims["email"]; exists {
			if s, ok := v.(string); ok {
				refreshEmail = s
			}
		}
		if v, exists := refreshClaims["roles"]; exists {
			if arr, ok := v.([]interface{}); ok {
				for _, item := range arr {
					if s, ok := item.(string); ok {
						refreshRoles = append(refreshRoles, s)
					}
				}
			}
		}
		if v, exists := refreshClaims["permissions"]; exists {
			if arr, ok := v.([]interface{}); ok {
				for _, item := range arr {
					if s, ok := item.(string); ok {
						refreshPermissions = append(refreshPermissions, s)
					}
				}
			}
		}
	}
	if len(refreshRoles) == 0 {
		refreshRoles = []string{"user"}
	}
	if len(refreshPermissions) == 0 {
		refreshPermissions = []string{"read:profile"}
	}

	// Generate new access token
	token, err := h.generateToken(refreshUserID, refreshUsername, refreshEmail, refreshRoles, refreshPermissions)
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

// generateToken generates a JWT access token using real user data.
func (h *AuthHandler) generateToken(userID, username, email string, roles, permissions []string) (string, error) {
	now := time.Now()
	claims := middleware.CustomClaims{
		UserID:      userID,
		Username:    username,
		Email:       email,
		Roles:       roles,
		Permissions: permissions,
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
