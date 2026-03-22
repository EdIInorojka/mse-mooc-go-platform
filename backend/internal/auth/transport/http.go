package transport

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"mse-mooc/backend/internal/auth/app"
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

	r.Route("/auth", func(r chi.Router) {
		r.Post("/register", h.register)
		r.Post("/login", h.login)
		r.Post("/refresh", h.refresh)

		r.Group(func(pr chi.Router) {
			pr.Use(sharedauth.RequireAuth(h.tokens))
			pr.Get("/me", h.me)
			pr.Patch("/me", h.updateMe)
		})
	})

	return r
}

type registerRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	FullName string `json:"full_name,omitempty"`
}

type loginRequest struct {
	LoginOrEmail string `json:"login_or_email"`
	Password     string `json:"password"`
	Role         string `json:"role,omitempty"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type updateMeRequest struct {
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	user, tokens, err := h.svc.Register(r.Context(), app.RegisterInput{
		Login:    req.Login,
		FullName: req.FullName,
		Password: req.Password,
		Email:    req.Email,
		Role:     req.Role,
	})
	switch {
	case errors.Is(err, app.ErrUserExists):
		httpx.Error(w, http.StatusConflict, err.Error())
		return
	case errors.Is(err, app.ErrInvalidInput):
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	case errors.Is(err, app.ErrPublicAdminRegistration):
		httpx.Error(w, http.StatusForbidden, err.Error())
		return
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"user": user, "tokens": tokens})
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	user, tokens, err := h.svc.Login(r.Context(), app.LoginInput{
		LoginOrEmail: req.LoginOrEmail,
		Password:     req.Password,
	})
	switch {
	case errors.Is(err, app.ErrInvalidCredentials):
		httpx.Error(w, http.StatusUnauthorized, err.Error())
		return
	case errors.Is(err, app.ErrInvalidInput):
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": user, "tokens": tokens})
}

func (h *Handler) refresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	tokens, err := h.svc.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, tokens)
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "missing claims")
		return
	}
	userID, err := sharedauth.SubjectToUserID(claims.Subject)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	user, err := h.svc.ByID(r.Context(), userID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "user not found")
		return
	}
	httpx.JSON(w, http.StatusOK, user)
}

func (h *Handler) updateMe(w http.ResponseWriter, r *http.Request) {
	claims := sharedauth.ClaimsFromContext(r.Context())
	if claims == nil {
		httpx.Error(w, http.StatusUnauthorized, "missing claims")
		return
	}
	userID, err := sharedauth.SubjectToUserID(claims.Subject)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid subject")
		return
	}
	var req updateMeRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid json")
		return
	}
	user, err := h.svc.UpdateProfile(r.Context(), userID, app.UpdateProfileInput{
		FullName: req.FullName,
		Email:    req.Email,
		Password: req.Password,
	})
	switch {
	case errors.Is(err, app.ErrInvalidInput):
		httpx.Error(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, app.ErrUserExists):
		httpx.Error(w, http.StatusConflict, err.Error())
	case errors.Is(err, app.ErrUserNotFound):
		httpx.Error(w, http.StatusNotFound, err.Error())
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, err.Error())
	default:
		httpx.JSON(w, http.StatusOK, user)
	}
}
