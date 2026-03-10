package valueobjects

import (
	"fmt"
	"regexp"
	"strings"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

type Email struct {
	value string
}

func NewEmail(email string) (Email, error) {
	normalized := strings.ToLower(strings.TrimSpace(email))
	if !emailRegex.MatchString(normalized) {
		return Email{}, fmt.Errorf("invalid email format: %s", email)
	}
	return Email{value: normalized}, nil
}

func (e Email) String() string        { return e.value }
func (e Email) Equals(other Email) bool { return e.value == other.value }
