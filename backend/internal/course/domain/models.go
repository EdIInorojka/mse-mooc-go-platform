package domain

import "time"

type Course struct {
	ID                int64     `json:"id"`
	Title             string    `json:"title"`
	Description       string    `json:"description"`
	Provider          string    `json:"provider"`
	Category          string    `json:"category"`
	DeliveryFormat    string    `json:"delivery_format"`
	Audience          string    `json:"audience"`
	SourceType        string    `json:"source_type"`
	ExternalURL       string    `json:"external_url"`
	SubjectTags       string    `json:"subject_tags"`
	MaterialLinks     string    `json:"material_links"`
	Language          string    `json:"language"`
	Price             int       `json:"price"`
	Credits           int       `json:"credits"`
	Reviews           float32   `json:"reviews"`
	SeatsLeft         int       `json:"seats_left"`
	DurationWeeks     int       `json:"duration_weeks"`
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
