package domain

import "time"

type Enrollment struct {
	ID        int64     `json:"id"`
	StudentID int64     `json:"student_id"`
	CourseID  int64     `json:"course_id"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type Group struct {
	ID        int64     `json:"id"`
	CourseID  int64     `json:"course_id"`
	TeacherID int64     `json:"teacher_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type GroupInvite struct {
	ID        int64      `json:"id"`
	GroupID   int64      `json:"group_id"`
	Token     string     `json:"token"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	CreatedBy int64      `json:"created_by"`
	CreatedAt time.Time  `json:"created_at"`
}

type GroupMember struct {
	GroupID      int64     `json:"group_id"`
	StudentID    int64     `json:"student_id"`
	StudentLogin string    `json:"student_login"`
	StudentEmail string    `json:"student_email"`
	JoinedAt     time.Time `json:"joined_at"`
}

type Grade struct {
	ID         int64     `json:"id"`
	StudentID  int64     `json:"student_id"`
	CourseID   int64     `json:"course_id"`
	GroupID    int64     `json:"group_id"`
	TeacherID  int64     `json:"teacher_id"`
	Value      float64   `json:"value"`
	Comment    string    `json:"comment"`
	AssignedAt time.Time `json:"assigned_at"`
}

type JoinInviteResult struct {
	GroupID           int64     `json:"group_id"`
	CourseID          int64     `json:"course_id"`
	StudentID         int64     `json:"student_id"`
	JoinedAt          time.Time `json:"joined_at"`
	EnrollmentCreated bool      `json:"enrollment_created"`
}
