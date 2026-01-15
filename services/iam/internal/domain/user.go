package models

type User struct {
	ID           string
	Username     string
	Email        string
	PasswordHash string
	Roles        []string
	Active       bool
	CreatedAt    string
	UpdatedAt    string
}
