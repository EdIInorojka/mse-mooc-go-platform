package auth

const (
	RoleStudent = "student"
	RoleTeacher = "teacher"
	RoleAdmin   = "admin"
)

func IsKnownRole(role string) bool {
	switch role {
	case RoleStudent, RoleTeacher, RoleAdmin:
		return true
	default:
		return false
	}
}

func CanSelfRegister(role string) bool {
	switch role {
	case "", RoleStudent, RoleTeacher:
		return true
	default:
		return false
	}
}
