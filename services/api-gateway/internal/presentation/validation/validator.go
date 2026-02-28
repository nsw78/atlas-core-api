package validation

import (
	"fmt"
	"regexp"
	"strings"

	"atlas-core-api/services/api-gateway/internal/domain/types"
)

// Validator handles request validation
type Validator struct{}

// NewValidator creates a new validator
func NewValidator() *Validator {
	return &Validator{}
}

// ValidateEmail validates an email address
func ValidateEmail(email string) error {
	if email == "" {
		return fmt.Errorf("email is required")
	}

	pattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	matched, err := regexp.MatchString(pattern, email)
	if err != nil || !matched {
		return fmt.Errorf("invalid email format")
	}

	return nil
}

// ValidatePassword validates a password
func ValidatePassword(password string, minLength int, requireSpecial bool) error {
	if password == "" {
		return fmt.Errorf("password is required")
	}

	if len(password) < minLength {
		return fmt.Errorf("password must be at least %d characters", minLength)
	}

	if requireSpecial {
		specialCharPattern := `[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`
		matched, _ := regexp.MatchString(specialCharPattern, password)
		if !matched {
			return fmt.Errorf("password must contain at least one special character")
		}
	}

	return nil
}

// ValidateUsername validates a username
func ValidateUsername(username string) error {
	if username == "" {
		return fmt.Errorf("username is required")
	}

	if len(username) < 3 || len(username) > 255 {
		return fmt.Errorf("username must be between 3 and 255 characters")
	}

	pattern := `^[a-zA-Z0-9_-]+$`
	matched, _ := regexp.MatchString(pattern, username)
	if !matched {
		return fmt.Errorf("username can only contain letters, numbers, hyphens, and underscores")
	}

	return nil
}

// ValidateURL validates a URL
func ValidateURL(url string) error {
	if url == "" {
		return fmt.Errorf("URL is required")
	}

	pattern := `^https?://[^\s/$.?#].[^\s]*$`
	matched, _ := regexp.MatchString(pattern, strings.ToLower(url))
	if !matched {
		return fmt.Errorf("invalid URL format")
	}

	return nil
}

// ValidatePhoneNumber validates a phone number
func ValidatePhoneNumber(phone string) error {
	if phone == "" {
		return fmt.Errorf("phone number is required")
	}

	// Remove common separators
	cleaned := strings.NewReplacer(
		"-", "",
		" ", "",
		"(", "",
		")", "",
		"+", "",
	).Replace(phone)

	// Check if only digits (and +)
	pattern := `^[0-9]{7,15}$`
	matched, _ := regexp.MatchString(pattern, cleaned)
	if !matched {
		return fmt.Errorf("invalid phone number format")
	}

	return nil
}

// ValidateLength validates string length
func ValidateLength(value string, minLength, maxLength int) error {
	length := len(value)
	if minLength > 0 && length < minLength {
		return fmt.Errorf("minimum length is %d characters", minLength)
	}

	if maxLength > 0 && length > maxLength {
		return fmt.Errorf("maximum length is %d characters", maxLength)
	}

	return nil
}

// ValidateNotEmpty validates that a value is not empty
func ValidateNotEmpty(value string, fieldName string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%s is required", fieldName)
	}
	return nil
}

// ValidateOneOf validates that a value is one of the allowed options
func ValidateOneOf(value string, allowedValues []string, fieldName string) error {
	for _, allowed := range allowedValues {
		if value == allowed {
			return nil
		}
	}
	return fmt.Errorf("%s must be one of: %s", fieldName, strings.Join(allowedValues, ", "))
}

// ValidateMinValue validates minimum numeric value
func ValidateMinValue(value, minValue int64, fieldName string) error {
	if value < minValue {
		return fmt.Errorf("%s must be at least %d", fieldName, minValue)
	}
	return nil
}

// ValidateMaxValue validates maximum numeric value
func ValidateMaxValue(value, maxValue int64, fieldName string) error {
	if value > maxValue {
		return fmt.Errorf("%s must be at most %d", fieldName, maxValue)
	}
	return nil
}

// ValidateRange validates that a value is within a range
func ValidateRange(value, minValue, maxValue int64, fieldName string) error {
	if value < minValue || value > maxValue {
		return fmt.Errorf("%s must be between %d and %d", fieldName, minValue, maxValue)
	}
	return nil
}

// BuildValidationError builds an API error from validation errors
func BuildValidationError(errors map[string]string) *types.APIError {
	details := make(map[string]interface{})
	for field, message := range errors {
		details[field] = message
	}
	return types.NewAPIErrorWithDetails(types.ErrValidationFailed, "Validation failed", details)
}
