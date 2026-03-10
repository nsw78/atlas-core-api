package valueobjects

import "github.com/google/uuid"

type UserID struct {
	value string
}

func NewUserID() UserID {
	return UserID{value: uuid.New().String()}
}

func UserIDFromString(id string) (UserID, error) {
	if _, err := uuid.Parse(id); err != nil {
		return UserID{}, err
	}
	return UserID{value: id}, nil
}

func (id UserID) String() string       { return id.value }
func (id UserID) IsZero() bool         { return id.value == "" }
func (id UserID) Equals(o UserID) bool { return id.value == o.value }
