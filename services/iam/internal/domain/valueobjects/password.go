package valueobjects

import (
	"errors"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

type HashedPassword struct {
	hash string
}

func NewHashedPassword(plaintext string) (HashedPassword, error) {
	if err := validatePasswordPolicy(plaintext); err != nil {
		return HashedPassword{}, err
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(plaintext), bcrypt.DefaultCost)
	if err != nil {
		return HashedPassword{}, errors.New("failed to hash password")
	}
	return HashedPassword{hash: string(hashed)}, nil
}

func HashedPasswordFromStore(hash string) HashedPassword {
	return HashedPassword{hash: hash}
}

func (p HashedPassword) Verify(plaintext string) bool {
	return bcrypt.CompareHashAndPassword([]byte(p.hash), []byte(plaintext)) == nil
}

func (p HashedPassword) String() string { return p.hash }

func validatePasswordPolicy(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters")
	}
	var hasUpper, hasLower, hasDigit bool
	for _, c := range password {
		switch {
		case unicode.IsUpper(c):
			hasUpper = true
		case unicode.IsLower(c):
			hasLower = true
		case unicode.IsDigit(c):
			hasDigit = true
		}
	}
	if !hasUpper || !hasLower || !hasDigit {
		return errors.New("password must contain uppercase, lowercase, and digit")
	}
	return nil
}
