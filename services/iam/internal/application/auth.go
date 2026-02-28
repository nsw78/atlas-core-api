package service

import (
	"errors"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	models "atlas-core-api/services/iam/internal/domain"
	"atlas-core-api/services/iam/internal/infrastructure/repository"
)

type AuthService struct {
	userRepo       repository.UserRepository
	jwtSecret      string
	logger         *zap.Logger
	blacklistedMu  sync.RWMutex
	blacklistedTkn map[string]time.Time
}

func NewAuthService(userRepo repository.UserRepository, jwtSecret string, logger ...*zap.Logger) *AuthService {
	var l *zap.Logger
	if len(logger) > 0 && logger[0] != nil {
		l = logger[0]
	} else {
		l = zap.NewNop()
	}
	svc := &AuthService{
		userRepo:       userRepo,
		jwtSecret:      jwtSecret,
		logger:         l,
		blacklistedTkn: make(map[string]time.Time),
	}
	go svc.cleanupBlacklist()
	return svc
}

func (s *AuthService) Login(username, password string) (*models.User, string, string, error) {
	s.logger.Info("Login attempt", zap.String("username", username))

	user, err := s.userRepo.GetByUsername(username)
	if err != nil {
		s.logger.Error("User not found", zap.String("username", username), zap.Error(err))
		return nil, "", "", errors.New("invalid credentials")
	}

	if !user.Active {
		s.logger.Warn("Login attempt for deactivated account", zap.String("username", username))
		return nil, "", "", errors.New("account deactivated")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		s.logger.Error("Password verification failed", zap.String("username", username))
		return nil, "", "", errors.New("invalid credentials")
	}

	accessToken, err := s.generateAccessToken(user.ID, user.Username, user.Roles)
	if err != nil {
		return nil, "", "", err
	}

	refreshToken, err := s.generateRefreshToken(user.ID)
	if err != nil {
		return nil, "", "", err
	}

	s.logger.Info("Login successful", zap.String("username", username))
	return user, accessToken, refreshToken, nil
}

func (s *AuthService) Register(username, email, password, firstName, lastName string) (*models.User, error) {
	if len(password) < 8 {
		return nil, errors.New("password must be at least 8 characters")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	user := &models.User{
		Username:     username,
		Email:        email,
		PasswordHash: string(hashedPassword),
		FirstName:    firstName,
		LastName:     lastName,
		Active:       true,
	}

	if err := s.userRepo.Create(user); err != nil {
		if errors.Is(err, repository.ErrUserAlreadyExists) {
			return nil, errors.New("user already exists")
		}
		s.logger.Error("Failed to create user", zap.Error(err))
		return nil, errors.New("failed to create user")
	}

	user.PasswordHash = ""
	return user, nil
}

func (s *AuthService) RefreshTokens(refreshTokenStr string) (string, string, error) {
	token, err := jwt.Parse(refreshTokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(s.jwtSecret), nil
	})
	if err != nil {
		return "", "", errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return "", "", errors.New("invalid refresh token")
	}

	tokenType, _ := claims["type"].(string)
	if tokenType != "refresh" {
		return "", "", errors.New("not a refresh token")
	}

	if s.IsTokenBlacklisted(refreshTokenStr) {
		return "", "", errors.New("token has been revoked")
	}

	userID, _ := claims["user_id"].(string)
	if userID == "" {
		return "", "", errors.New("invalid token claims")
	}

	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return "", "", errors.New("user not found")
	}

	if !user.Active {
		return "", "", errors.New("account deactivated")
	}

	// Blacklist old refresh token (rotation)
	s.BlacklistToken(refreshTokenStr)

	accessToken, err := s.generateAccessToken(user.ID, user.Username, user.Roles)
	if err != nil {
		return "", "", err
	}

	newRefreshToken, err := s.generateRefreshToken(user.ID)
	if err != nil {
		return "", "", err
	}

	return accessToken, newRefreshToken, nil
}

func (s *AuthService) BlacklistToken(tokenStr string) {
	s.blacklistedMu.Lock()
	defer s.blacklistedMu.Unlock()
	s.blacklistedTkn[tokenStr] = time.Now().Add(8 * 24 * time.Hour)
	s.logger.Debug("Token blacklisted")
}

func (s *AuthService) IsTokenBlacklisted(tokenStr string) bool {
	s.blacklistedMu.RLock()
	defer s.blacklistedMu.RUnlock()
	_, exists := s.blacklistedTkn[tokenStr]
	return exists
}

func (s *AuthService) RecordLogin(userID string) {
	if err := s.userRepo.UpdateLastLogin(userID); err != nil {
		s.logger.Warn("Failed to record login time", zap.String("user_id", userID), zap.Error(err))
	}
}

func (s *AuthService) ValidateToken(tokenString string) (map[string]interface{}, error) {
	if s.IsTokenBlacklisted(tokenString) {
		return nil, errors.New("token has been revoked")
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(s.jwtSecret), nil
	})
	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

func (s *AuthService) generateAccessToken(userID, username string, roles []string) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  userID,
		"username": username,
		"roles":    roles,
		"exp":      time.Now().Add(time.Hour).Unix(),
		"iat":      time.Now().Unix(),
		"type":     "access",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) generateRefreshToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
		"type":    "refresh",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) cleanupBlacklist() {
	ticker := time.NewTicker(30 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		s.blacklistedMu.Lock()
		now := time.Now()
		for token, expiry := range s.blacklistedTkn {
			if now.After(expiry) {
				delete(s.blacklistedTkn, token)
			}
		}
		s.blacklistedMu.Unlock()
	}
}
