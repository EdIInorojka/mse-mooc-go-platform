package transport

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"mse-mooc/backend/internal/course/app"
	"mse-mooc/backend/internal/course/domain"
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
	r.Get("/courses", h.listCourses)
	r.Group(func(pr chi.Router) {
		pr.Use(sharedauth.RequireAuth(h.tokens))
		pr.Get("/courses/mine", h.myCourses)
		pr.Group(func(wr chi.Router) {
			wr.Use(sharedauth.RequireRoles(sharedauth.RoleTeacher, sharedauth.RoleAdmin))
			wr.Post("/courses", h.createCourse)
			wr.Put("/courses/{id}", h.updateCourse)
			wr.Delete("/courses/{id}", h.deleteCourse)
		})
	})
	r.Get("/courses/{id}", h.getCourse)
	return r
}

type coursePayload struct {
	Title             string  `json:"title"`
	Description       string  `json:"description"`
	Language          string  `json:"language"`
	Price             int     `json:"price"`
	Credits           int     `json:"credits"`
	Reviews           float32 `json:"reviews"`
	Certificated      bool    `json:"certificated"`
	IsCertificatePaid bool    `json:"is_certificate_paid"`
	StartDate         string  `json:"start_date"`
	EndDate           string  `json:"end_date"`
}

func (h *Handler) listCourses(w http.ResponseWriter, r *http.Request) {
	courses, err := h.svc.ListCourses(r.Context(), r.URL.Query().Get("search"), r.URL.Query().Get("sortBy"), r.URL.Query().Get("sortOrder"))
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, courses)
}

func (h *Handler) myCourses(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	actorID, ok := actorIDFromClaims(claims)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	courses, err := h.svc.ListCoursesByCreator(r.Context(), actorID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, courses)
}

func (h *Handler) getCourse(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	course, err := h.svc.GetCourse(r.Context(), id)
	switch {
	case errors.Is(err, app.ErrNotFound):
		httpx.Error(w, http.StatusNotFound, err.Error())
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, err.Error())
	default:
		httpx.JSON(w, http.StatusOK, course)
	}
}

func (h *Handler) createCourse(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	actorID, ok := actorIDFromClaims(claims)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	var payload coursePayload
	if err := httpx.DecodeJSON(r, &payload); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	course, err := payload.toDomain()
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	created, err := h.svc.CreateCourse(r.Context(), actorID, claims.Role, course)
	handleCourseWrite(w, created, err, http.StatusCreated)
}

func (h *Handler) updateCourse(w http.ResponseWriter, r *http.Request) {
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
	var payload coursePayload
	if err := httpx.DecodeJSON(r, &payload); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	course, err := payload.toDomain()
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	updated, err := h.svc.UpdateCourse(r.Context(), actorID, claims.Role, id, course)
	handleCourseWrite(w, updated, err, http.StatusOK)
}

func (h *Handler) deleteCourse(w http.ResponseWriter, r *http.Request) {
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
	err = h.svc.DeleteCourse(r.Context(), actorID, claims.Role, id)
	switch {
	case errors.Is(err, app.ErrNotFound):
		httpx.Error(w, http.StatusNotFound, err.Error())
	case errors.Is(err, app.ErrForbidden):
		httpx.Error(w, http.StatusForbidden, err.Error())
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, err.Error())
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

func handleCourseWrite(w http.ResponseWriter, course domain.Course, err error, status int) {
	switch {
	case errors.Is(err, app.ErrInvalidInput):
		httpx.Error(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, app.ErrForbidden):
		httpx.Error(w, http.StatusForbidden, err.Error())
	case errors.Is(err, app.ErrNotFound):
		httpx.Error(w, http.StatusNotFound, err.Error())
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, err.Error())
	default:
		httpx.JSON(w, status, course)
	}
}

func (p coursePayload) toDomain() (domain.Course, error) {
	start, err := time.Parse(time.RFC3339, p.StartDate)
	if err != nil {
		return domain.Course{}, err
	}
	end, err := time.Parse(time.RFC3339, p.EndDate)
	if err != nil {
		return domain.Course{}, err
	}
	return domain.Course{Title: p.Title, Description: p.Description, Language: p.Language, Price: p.Price, Credits: p.Credits, Reviews: p.Reviews, Certificated: p.Certificated, IsCertificatePaid: p.IsCertificatePaid, StartDate: start, EndDate: end}, nil
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
