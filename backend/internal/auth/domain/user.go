package domain

import "time"

type User struct {
	ID           int64     `json:"id"`
	Login        string    `json:"login"`
	FullName     string    `json:"full_name"`
	Email        string    `json:"email"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	PasswordHash string    `json:"-"`
}
