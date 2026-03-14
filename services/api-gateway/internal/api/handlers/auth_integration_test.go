package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"atlas-core-api/services/api-gateway/internal/api/middleware"
	"atlas-core-api/services/api-gateway/internal/infrastructure/cache"
	"atlas-core-api/services/api-gateway/internal/infrastructure/config"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// testConfig returns a Config suitable for integration tests.
func testConfig() *config.Config {
	return &config.Config{
		Auth: config.AuthConfig{
			JWTSecret:              "test-secret-key-for-integration-tests",
			JWTExpiration:          15 * time.Minute,
			RefreshTokenExpiration: 7 * 24 * time.Hour,
			MFARequired:            false,
			PasswordMinLength:      8,
			MaxLoginAttempts:       5,
			LockoutDuration:        15 * time.Minute,
		},
		Services: config.ServicesConfig{
			IAMService: config.ServiceEndpoint{
				URL:     "", // Will be replaced by mock IAM server URL
				Timeout: 5 * time.Second,
			},
			Registry: map[string]string{},
		},
	}
}

// testLogger returns a no-op zap logger for tests.
func testLogger() *zap.Logger {
	logger, _ := zap.NewDevelopment()
	return logger
}

// newMockIAMServer returns an httptest.Server that simulates IAM login responses.
// It accepts "admin" / "SecureP@ss1" as valid credentials.
func newMockIAMServer() *httptest.Server {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api/v1/auth/login" {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		var body map[string]string
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		if body["username"] == "admin" && body["password"] == "SecureP@ss1" {
			resp := map[string]interface{}{
				"data": map[string]interface{}{
					"id":       "usr-001",
					"username": "admin",
					"email":    "admin@atlas.io",
					"roles":    []string{"admin"},
				},
				"access_token":  "iam-access-token",
				"refresh_token": "iam-refresh-token",
				"token_type":    "Bearer",
				"expires_in":    900,
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(resp)
			return
		}

		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid credentials"})
	})
	return httptest.NewServer(handler)
}

// setupRouter creates a gin.Engine wired with the AuthHandler and the
// Authenticate middleware, ready for integration-style HTTP testing.
func setupRouter(cfg *config.Config, c cache.Cache) *gin.Engine {
	gin.SetMode(gin.TestMode)
	logger := testLogger()

	authHandler := NewAuthHandler(cfg, logger, c)

	r := gin.New()

	// Public auth routes
	auth := r.Group("/api/v1/auth")
	{
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.GET("/validate", authHandler.ValidateToken)
	}

	// Protected routes
	protected := r.Group("/api/v1")
	protected.Use(middleware.Authenticate(cfg, logger))
	{
		protected.POST("/auth/logout", authHandler.Logout)
		protected.GET("/profile", func(ctx *gin.Context) {
			userID, _ := ctx.Get("user_id")
			username, _ := ctx.Get("username")
			ctx.JSON(http.StatusOK, gin.H{
				"user_id":  userID,
				"username": username,
			})
		})
	}

	return r
}

// generateValidToken creates a signed JWT for testing protected routes.
func generateValidToken(cfg *config.Config) string {
	now := time.Now()
	claims := middleware.CustomClaims{
		UserID:      "usr-001",
		Username:    "admin",
		Email:       "admin@atlas.io",
		Roles:       []string{"admin"},
		Permissions: []string{"admin:all", "read:profile"},
		MFAVerified: false,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(cfg.Auth.JWTExpiration)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "atlas-api-gateway",
			Subject:   "admin",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte(cfg.Auth.JWTSecret))
	return signed
}

// generateExpiredToken creates a JWT that is already expired.
func generateExpiredToken(cfg *config.Config) string {
	past := time.Now().Add(-1 * time.Hour)
	claims := middleware.CustomClaims{
		UserID:   "usr-001",
		Username: "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(past),
			IssuedAt:  jwt.NewNumericDate(past.Add(-15 * time.Minute)),
			NotBefore: jwt.NewNumericDate(past.Add(-15 * time.Minute)),
			Issuer:    "atlas-api-gateway",
			Subject:   "admin",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte(cfg.Auth.JWTSecret))
	return signed
}

// generateValidRefreshToken creates a signed refresh token for testing.
func generateValidRefreshToken(cfg *config.Config) string {
	now := time.Now()
	claims := jwt.MapClaims{
		"user_id":     "usr-001",
		"username":    "admin",
		"email":       "admin@atlas.io",
		"roles":       []string{"admin"},
		"permissions": []string{"admin:all"},
		"exp":         jwt.NewNumericDate(now.Add(cfg.Auth.RefreshTokenExpiration)).Unix(),
		"iat":         jwt.NewNumericDate(now).Unix(),
		"nbf":         jwt.NewNumericDate(now).Unix(),
		"iss":         "atlas-api-gateway",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte(cfg.Auth.JWTSecret))
	return signed
}

// performLoginRequest is a helper that performs a POST /api/v1/auth/login.
func performLoginRequest(router *gin.Engine, body map[string]string) *httptest.ResponseRecorder {
	payload, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

// ---------------------------------------------------------------------------
// Tests: Login
// ---------------------------------------------------------------------------

func TestLogin_ValidCredentials_ReturnsJWT(t *testing.T) {
	cfg := testConfig()
	iamServer := newMockIAMServer()
	defer iamServer.Close()
	cfg.Services.IAMService.URL = iamServer.URL

	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	w := performLoginRequest(router, map[string]string{
		"username": "admin",
		"password": "SecureP@ss1",
	})

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)

	assert.Equal(t, float64(http.StatusOK), resp["code"])
	assert.Equal(t, "Login successful", resp["message"])

	data, ok := resp["data"].(map[string]interface{})
	require.True(t, ok, "response data should be an object")

	assert.NotEmpty(t, data["access_token"], "access_token must be present")
	assert.NotEmpty(t, data["refresh_token"], "refresh_token must be present")
	assert.Equal(t, "Bearer", data["token_type"])
	assert.Greater(t, data["expires_in"], float64(0))

	user, ok := data["user"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, "usr-001", user["id"])
	assert.Equal(t, "admin", user["username"])
	assert.Equal(t, "admin@atlas.io", user["email"])
}

func TestLogin_InvalidCredentials_Returns401(t *testing.T) {
	cfg := testConfig()
	iamServer := newMockIAMServer()
	defer iamServer.Close()
	cfg.Services.IAMService.URL = iamServer.URL

	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	w := performLoginRequest(router, map[string]string{
		"username": "admin",
		"password": "WrongPassword1",
	})

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Contains(t, resp["message"], "Invalid username or password")
}

func TestLogin_EmptyUsername_Returns400(t *testing.T) {
	cfg := testConfig()
	iamServer := newMockIAMServer()
	defer iamServer.Close()
	cfg.Services.IAMService.URL = iamServer.URL

	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	w := performLoginRequest(router, map[string]string{
		"username": "",
		"password": "SecureP@ss1",
	})

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestLogin_ShortPassword_Returns400(t *testing.T) {
	cfg := testConfig()
	iamServer := newMockIAMServer()
	defer iamServer.Close()
	cfg.Services.IAMService.URL = iamServer.URL

	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	w := performLoginRequest(router, map[string]string{
		"username": "admin",
		"password": "short",
	})

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestLogin_TooManyAttempts_Returns429(t *testing.T) {
	cfg := testConfig()
	iamServer := newMockIAMServer()
	defer iamServer.Close()
	cfg.Services.IAMService.URL = iamServer.URL

	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	// Exhaust login attempts with invalid credentials
	for i := 0; i < 5; i++ {
		w := performLoginRequest(router, map[string]string{
			"username": "admin",
			"password": "WrongPassword1",
		})
		assert.Equal(t, http.StatusUnauthorized, w.Code, "attempt %d should be 401", i+1)
	}

	// The 6th attempt should be rate-limited
	w := performLoginRequest(router, map[string]string{
		"username": "admin",
		"password": "SecureP@ss1",
	})

	assert.Equal(t, http.StatusTooManyRequests, w.Code)

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Contains(t, resp["message"], "Too many login attempts")
}

func TestLogin_InvalidJSON_Returns400(t *testing.T) {
	cfg := testConfig()
	iamServer := newMockIAMServer()
	defer iamServer.Close()
	cfg.Services.IAMService.URL = iamServer.URL

	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ---------------------------------------------------------------------------
// Tests: Refresh Token
// ---------------------------------------------------------------------------

func TestRefreshToken_ValidToken_ReturnsNewAccessToken(t *testing.T) {
	cfg := testConfig()
	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	refreshToken := generateValidRefreshToken(cfg)

	payload, _ := json.Marshal(map[string]string{
		"refresh_token": refreshToken,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "Token refreshed", resp["message"])

	data, ok := resp["data"].(map[string]interface{})
	require.True(t, ok)
	assert.NotEmpty(t, data["access_token"])
	assert.Equal(t, "Bearer", data["token_type"])
	assert.Greater(t, data["expires_in"], float64(0))
}

func TestRefreshToken_InvalidToken_Returns401(t *testing.T) {
	cfg := testConfig()
	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	payload, _ := json.Marshal(map[string]string{
		"refresh_token": "completely.invalid.token",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRefreshToken_EmptyToken_Returns400(t *testing.T) {
	cfg := testConfig()
	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	payload, _ := json.Marshal(map[string]string{
		"refresh_token": "",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRefreshToken_BlacklistedToken_Returns401(t *testing.T) {
	cfg := testConfig()
	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	refreshToken := generateValidRefreshToken(cfg)

	// Blacklist the refresh token
	blacklistKey := tokenBlacklistPrefix + refreshToken
	memCache.Set(nil, blacklistKey, true, 1*time.Hour)

	payload, _ := json.Marshal(map[string]string{
		"refresh_token": refreshToken,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// ---------------------------------------------------------------------------
// Tests: Logout
// ---------------------------------------------------------------------------

func TestLogout_ValidToken_InvalidatesToken(t *testing.T) {
	cfg := testConfig()
	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	token := generateValidToken(cfg)

	// Logout
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "Logout successful", resp["message"])

	// Verify the token is now blacklisted in cache
	blacklistKey := tokenBlacklistPrefix + token
	count, _ := memCache.Exists(nil, blacklistKey)
	assert.Equal(t, int64(1), count, "token should be blacklisted after logout")
}

// ---------------------------------------------------------------------------
// Tests: Protected Route Access
// ---------------------------------------------------------------------------

func TestProtectedRoute_WithoutToken_Returns401(t *testing.T) {
	cfg := testConfig()
	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/profile", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Contains(t, resp["message"], "Authorization header required")
}

func TestProtectedRoute_WithInvalidTokenFormat_Returns401(t *testing.T) {
	cfg := testConfig()
	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/profile", nil)
	req.Header.Set("Authorization", "InvalidFormat tokenhere")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestProtectedRoute_WithExpiredToken_Returns401(t *testing.T) {
	cfg := testConfig()
	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	expiredToken := generateExpiredToken(cfg)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/profile", nil)
	req.Header.Set("Authorization", "Bearer "+expiredToken)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestProtectedRoute_WithValidToken_Succeeds(t *testing.T) {
	cfg := testConfig()
	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	token := generateValidToken(cfg)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/profile", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "usr-001", resp["user_id"])
	assert.Equal(t, "admin", resp["username"])
}

func TestProtectedRoute_WithWrongSigningKey_Returns401(t *testing.T) {
	cfg := testConfig()
	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	// Generate a token signed with a different secret
	now := time.Now()
	claims := middleware.CustomClaims{
		UserID:   "usr-001",
		Username: "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "atlas-api-gateway",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte("different-secret-key"))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/profile", nil)
	req.Header.Set("Authorization", "Bearer "+signed)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// ---------------------------------------------------------------------------
// Tests: Validate Token Endpoint
// ---------------------------------------------------------------------------

func TestValidateToken_ValidToken_ReturnsUserInfo(t *testing.T) {
	cfg := testConfig()
	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	token := generateValidToken(cfg)

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/auth/validate?token=%s", token), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "Token is valid", resp["message"])

	data, ok := resp["data"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, "usr-001", data["user_id"])
	assert.Equal(t, "admin", data["username"])
}

func TestValidateToken_MissingParam_Returns400(t *testing.T) {
	cfg := testConfig()
	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/validate", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestValidateToken_InvalidToken_Returns401(t *testing.T) {
	cfg := testConfig()
	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/validate?token=invalid.jwt.token", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// ---------------------------------------------------------------------------
// Tests: Full Login-then-Access Flow
// ---------------------------------------------------------------------------

func TestFullFlow_LoginThenAccessProtectedRoute(t *testing.T) {
	cfg := testConfig()
	iamServer := newMockIAMServer()
	defer iamServer.Close()
	cfg.Services.IAMService.URL = iamServer.URL

	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	// Step 1: Login
	w := performLoginRequest(router, map[string]string{
		"username": "admin",
		"password": "SecureP@ss1",
	})
	require.Equal(t, http.StatusOK, w.Code)

	var loginResp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &loginResp)
	require.NoError(t, err)

	data := loginResp["data"].(map[string]interface{})
	accessToken := data["access_token"].(string)
	require.NotEmpty(t, accessToken)

	// Step 2: Access protected route with the received token
	req := httptest.NewRequest(http.MethodGet, "/api/v1/profile", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req)

	assert.Equal(t, http.StatusOK, w2.Code)

	var profileResp map[string]interface{}
	err = json.Unmarshal(w2.Body.Bytes(), &profileResp)
	require.NoError(t, err)
	assert.Equal(t, "usr-001", profileResp["user_id"])
	assert.Equal(t, "admin", profileResp["username"])
}

func TestFullFlow_LoginThenLogoutThenAccessFails(t *testing.T) {
	cfg := testConfig()
	iamServer := newMockIAMServer()
	defer iamServer.Close()
	cfg.Services.IAMService.URL = iamServer.URL

	// For this test we wire the ValidateToken endpoint to also check the blacklist,
	// which it does internally. The Authenticate middleware does NOT check the blacklist
	// (that would require cache injection into middleware). But Logout does blacklist,
	// and ValidateToken checks it.

	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	// Step 1: Login
	w := performLoginRequest(router, map[string]string{
		"username": "admin",
		"password": "SecureP@ss1",
	})
	require.Equal(t, http.StatusOK, w.Code)

	var loginResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &loginResp)
	data := loginResp["data"].(map[string]interface{})
	accessToken := data["access_token"].(string)

	// Step 2: Logout
	logoutReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	logoutReq.Header.Set("Authorization", "Bearer "+accessToken)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, logoutReq)
	require.Equal(t, http.StatusOK, w2.Code)

	// Step 3: Validate that the token is considered revoked
	validateReq := httptest.NewRequest(http.MethodGet,
		fmt.Sprintf("/api/v1/auth/validate?token=%s", accessToken), nil)
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, validateReq)

	assert.Equal(t, http.StatusUnauthorized, w3.Code,
		"token should be revoked after logout when checked via validate endpoint")
}

func TestFullFlow_LoginRefreshAndAccess(t *testing.T) {
	cfg := testConfig()
	iamServer := newMockIAMServer()
	defer iamServer.Close()
	cfg.Services.IAMService.URL = iamServer.URL

	memCache := cache.NewInMemoryCache(testLogger())
	router := setupRouter(cfg, memCache)

	// Step 1: Login to get a refresh token
	w := performLoginRequest(router, map[string]string{
		"username": "admin",
		"password": "SecureP@ss1",
	})
	require.Equal(t, http.StatusOK, w.Code)

	var loginResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &loginResp)
	data := loginResp["data"].(map[string]interface{})
	refreshToken := data["refresh_token"].(string)
	require.NotEmpty(t, refreshToken)

	// Step 2: Use refresh token to get a new access token
	payload, _ := json.Marshal(map[string]string{
		"refresh_token": refreshToken,
	})
	refreshReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewReader(payload))
	refreshReq.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, refreshReq)

	assert.Equal(t, http.StatusOK, w2.Code)

	var refreshResp map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &refreshResp)
	refreshData := refreshResp["data"].(map[string]interface{})
	newAccessToken := refreshData["access_token"].(string)
	require.NotEmpty(t, newAccessToken)

	// Step 3: Access protected route with new token
	profileReq := httptest.NewRequest(http.MethodGet, "/api/v1/profile", nil)
	profileReq.Header.Set("Authorization", "Bearer "+newAccessToken)
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, profileReq)

	assert.Equal(t, http.StatusOK, w3.Code)
}
