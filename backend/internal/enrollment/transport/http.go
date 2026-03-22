package transport

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"mse-mooc/backend/internal/enrollment/app"
	sharedauth "mse-mooc/backend/internal/shared/auth"
	"mse-mooc/backend/internal/shared/httpx"
)

type Handler struct {
	svc    *app.Service
	tokens *sharedauth.TokenManager
}

func NewHandler(svc *app.Service, tm *sharedauth.TokenManager) *Handler {
	return &Handler{svc: svc, tokens: tm}
}

func (h *Handler) Router() http.Handler {
	r := chi.NewRouter()
	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	r.Get("/readyz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})
	r.Group(func(pr chi.Router) {
		pr.Use(sharedauth.RequireAuth(h.tokens))
		pr.Post("/enrollments", h.enroll)
		pr.Delete("/enrollments/{id}", h.unenroll)
		pr.Get("/users/{userID}/enrollments", h.userEnrollments)
		pr.Get("/users/{userID}/courses/{courseID}/eligible-certificate", h.canGetCertificate)
		pr.Get("/groups/mine", h.listMyGroups)
		pr.Post("/groups", h.createGroup)
		pr.Get("/groups/{id}/members", h.listGroupMembers)
		pr.Post("/groups/{id}/invites", h.createInvite)
		pr.Post("/invites/join", h.joinByInvite)
		pr.Post("/grades", h.assignGrade)
		pr.Get("/grades/me", h.myGrades)
	})
	return r
}

type enrollPayload struct {
	StudentID int64 `json:"student_id"`
	CourseID  int64 `json:"course_id"`
}
type createGroupPayload struct {
	CourseID int64  `json:"course_id"`
	Name     string `json:"name"`
}
type createInvitePayload struct {
	TTLHours int `json:"ttl_hours"`
}
type joinInvitePayload struct {
	Token string `json:"token"`
}
type assignGradePayload struct {
	GroupID   int64   `json:"group_id"`
	StudentID int64   `json:"student_id"`
	Value     float64 `json:"value"`
	Comment   string  `json:"comment"`
}

func (h *Handler) enroll(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	actorID, ok := actorIDFromClaims(claims)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	var payload enrollPayload
	if err := httpx.DecodeJSON(r, &payload); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	enrollment, err := h.svc.Enroll(r.Context(), actorID, claims.Role, payload.StudentID, payload.CourseID)
	handleWrite(w, enrollment, err, http.StatusCreated)
}

func (h *Handler) unenroll(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	actorID, ok := actorIDFromClaims(claims)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	err = h.svc.Unenroll(r.Context(), actorID, claims.Role, id)
	switch {
	case errors.Is(err, app.ErrForbidden):
		httpx.Error(w, http.StatusForbidden, err.Error())
	case errors.Is(err, app.ErrNotFound):
		httpx.Error(w, http.StatusNotFound, err.Error())
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, err.Error())
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

func (h *Handler) userEnrollments(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	actorID, ok := actorIDFromClaims(claims)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	userID, err := strconv.ParseInt(chi.URLParam(r, "userID"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	enrollments, err := h.svc.ByUser(r.Context(), actorID, claims.Role, userID)
	switch {
	case errors.Is(err, app.ErrForbidden):
		httpx.Error(w, http.StatusForbidden, err.Error())
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, err.Error())
	default:
		httpx.JSON(w, http.StatusOK, enrollments)
	}
}

func (h *Handler) canGetCertificate(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	actorID, ok := actorIDFromClaims(claims)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	userID, err := strconv.ParseInt(chi.URLParam(r, "userID"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	courseID, err := strconv.ParseInt(chi.URLParam(r, "courseID"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid course id")
		return
	}
	eligible, err := h.svc.CanGetCertificate(r.Context(), actorID, claims.Role, userID, courseID)
	switch {
	case errors.Is(err, app.ErrForbidden):
		httpx.Error(w, http.StatusForbidden, err.Error())
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, err.Error())
	default:
		httpx.JSON(w, http.StatusOK, map[string]bool{"eligible": eligible})
	}
}

func (h *Handler) createGroup(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	actorID, ok := actorIDFromClaims(claims)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	var payload createGroupPayload
	if err := httpx.DecodeJSON(r, &payload); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	group, err := h.svc.CreateGroup(r.Context(), actorID, claims.Role, payload.Name, payload.CourseID)
	handleWrite(w, group, err, http.StatusCreated)
}

func (h *Handler) listMyGroups(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	actorID, ok := actorIDFromClaims(claims)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	groups, err := h.svc.ListOwnGroups(r.Context(), actorID, claims.Role)
	switch {
	case errors.Is(err, app.ErrForbidden):
		httpx.Error(w, http.StatusForbidden, err.Error())
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, err.Error())
	default:
		httpx.JSON(w, http.StatusOK, groups)
	}
}

func (h *Handler) createInvite(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	actorID, ok := actorIDFromClaims(claims)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid group id")
		return
	}
	var payload createInvitePayload
	if err := httpx.DecodeJSON(r, &payload); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	invite, err := h.svc.CreateInvite(r.Context(), actorID, claims.Role, groupID, time.Duration(payload.TTLHours)*time.Hour)
	handleWrite(w, invite, err, http.StatusCreated)
}

func (h *Handler) listGroupMembers(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	actorID, ok := actorIDFromClaims(claims)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	groupID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid group id")
		return
	}
	members, err := h.svc.ListGroupMembers(r.Context(), actorID, claims.Role, groupID)
	switch {
	case errors.Is(err, app.ErrForbidden):
		httpx.Error(w, http.StatusForbidden, err.Error())
	case errors.Is(err, app.ErrNotFound):
		httpx.Error(w, http.StatusNotFound, err.Error())
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, err.Error())
	default:
		httpx.JSON(w, http.StatusOK, members)
	}
}

func (h *Handler) joinByInvite(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	actorID, ok := actorIDFromClaims(claims)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	var payload joinInvitePayload
	if err := httpx.DecodeJSON(r, &payload); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	result, err := h.svc.JoinByInvite(r.Context(), actorID, claims.Role, payload.Token)
	handleWrite(w, result, err, http.StatusOK)
}

func (h *Handler) assignGrade(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	actorID, ok := actorIDFromClaims(claims)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	var payload assignGradePayload
	if err := httpx.DecodeJSON(r, &payload); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	grade, err := h.svc.AssignGrade(r.Context(), actorID, claims.Role, payload.GroupID, payload.StudentID, payload.Value, payload.Comment)
	handleWrite(w, grade, err, http.StatusCreated)
}

func (h *Handler) myGrades(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	actorID, ok := actorIDFromClaims(claims)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	grades, err := h.svc.ListMyGrades(r.Context(), actorID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, grades)
}

func handleWrite(w http.ResponseWriter, payload any, err error, status int) {
	switch {
	case errors.Is(err, app.ErrInvalidInput):
		httpx.Error(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, app.ErrForbidden):
		httpx.Error(w, http.StatusForbidden, err.Error())
	case errors.Is(err, app.ErrNotFound):
		httpx.Error(w, http.StatusNotFound, err.Error())
	case errors.Is(err, app.ErrAlreadyEnrolled), errors.Is(err, app.ErrAlreadyInGroup):
		httpx.Error(w, http.StatusConflict, err.Error())
	case errors.Is(err, app.ErrInviteExpired):
		httpx.Error(w, http.StatusGone, err.Error())
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, err.Error())
	default:
		httpx.JSON(w, status, payload)
	}
}

func actorIDFromClaims(claims *sharedauth.Claims) (int64, bool) {
	if claims == nil {
		return 0, false
	}
	actorID, err := sharedauth.SubjectToUserID(claims.Subject)
	if err != nil {
		return 0, false
	}
	return actorID, true
}
