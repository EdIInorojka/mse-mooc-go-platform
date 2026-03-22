package domain

import "time"

type User struct {
	ID           int64     `json:"id"`
	Login        string    `json:"login"`
	Email        string    `json:"email"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	PasswordHash string    `json:"-"`
}
