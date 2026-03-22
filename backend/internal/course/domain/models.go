package domain

import "time"

type Course struct {
	ID                int64     `json:"id"`
	Title             string    `json:"title"`
	Description       string    `json:"description"`
	Language          string    `json:"language"`
	Price             int       `json:"price"`
	Credits           int       `json:"credits"`
	Reviews           float32   `json:"reviews"`
	Certificated      bool      `json:"certificated"`
	IsCertificatePaid bool      `json:"is_certificate_paid"`
	StartDate         time.Time `json:"start_date"`
	EndDate           time.Time `json:"end_date"`
	CreatedByUserID   int64     `json:"created_by_user_id"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type CourseFilter struct {
	Search      string
	SortBy      string
	SortOrder   string
	CreatedByID *int64
}
