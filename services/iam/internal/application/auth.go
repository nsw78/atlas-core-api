package service

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	models "atlas-core-api/services/iam/internal/domain"
	"atlas-core-api/services/iam/internal/infrastructure/repository"
)

type AuthService struct {
	userRepo repository.UserRepository
	jwtSecret string
	logger    *zap.Logger
}

func NewAuthService(userRepo repository.UserRepository, jwtSecret string, logger ...*zap.Logger) *AuthService {
	var l *zap.Logger
	if len(logger) > 0 && logger[0] != nil {
		l = logger[0]
	} else {
		l = zap.NewNop()
	}
	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
		logger:    l,
	}
}

func (s *AuthService) Login(username, password string) (*models.User, string, string, error) {
	s.logger.Info("Login attempt", zap.String("username", username))

	// Get user by username
	user, err := s.userRepo.GetByUsername(username)
	if err != nil {
		s.logger.Error("User not found", zap.String("username", username), zap.Error(err))
		return nil, "", "", errors.New("invalid credentials")
	}

	s.logger.Info("User found", zap.String("username", username), zap.String("userID", user.ID))

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		s.logger.Error("Password verification failed", zap.String("username", username), zap.Error(err))
		return nil, "", "", errors.New("invalid credentials")
	}

	s.logger.Info("Password verified successfully", zap.String("username", username))

	// Generate tokens
	accessToken, err := s.generateAccessToken(user.ID, user.Username, user.Roles)
	if err != nil {
		s.logger.Error("Failed to generate access token", zap.String("username", username), zap.Error(err))
		return nil, "", "", err
	}

	refreshToken, err := s.generateRefreshToken(user.ID)
	if err != nil {
		s.logger.Error("Failed to generate refresh token", zap.String("username", username), zap.Error(err))
		return nil, "", "", err
	}

	s.logger.Info("Login successful", zap.String("username", username))
	return user, accessToken, refreshToken, nil
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

func (s *AuthService) ValidateToken(tokenString string) (map[string]interface{}, error) {
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
