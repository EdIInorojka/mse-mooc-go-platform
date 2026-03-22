package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	TokenUseAccess  = "access"
	TokenUseRefresh = "refresh"
)

type Claims struct {
	Role     string `json:"role"`
	TokenUse string `json:"token_use"`
	jwt.RegisteredClaims
}

type TokenManager struct {
	secret            []byte
	accessTTL         time.Duration
	refreshTTL        time.Duration
	refreshIssuerName string
}

func NewTokenManager(secret string, accessTTL, refreshTTL time.Duration, issuer string) *TokenManager {
	return &TokenManager{
		secret:            []byte(secret),
		accessTTL:         accessTTL,
		refreshTTL:        refreshTTL,
		refreshIssuerName: issuer,
	}
}

func (tm *TokenManager) IssueAccess(userID int64, role string) (string, error) {
	return tm.issue(userID, role, TokenUseAccess, tm.accessTTL)
}

func (tm *TokenManager) IssueRefresh(userID int64, role string) (string, error) {
	return tm.issue(userID, role, TokenUseRefresh, tm.refreshTTL)
}

func (tm *TokenManager) AccessTTL() time.Duration {
	return tm.accessTTL
}

func (tm *TokenManager) Parse(token string) (*Claims, error) {
	claims := &Claims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (any, error) {
		if t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, errors.New("invalid signing method")
		}
		return tm.secret, nil
	})
	if err != nil {
		return nil, err
	}
	if !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

func SubjectToUserID(subject string) (int64, error) {
	return strconv.ParseInt(subject, 10, 64)
}

func (tm *TokenManager) issue(userID int64, role, tokenUse string, ttl time.Duration) (string, error) {
	now := time.Now().UTC()
	jti, err := randomTokenID()
	if err != nil {
		return "", err
	}
	claims := Claims{
		Role:     role,
		TokenUse: tokenUse,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			Subject:   strconv.FormatInt(userID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			Issuer:    tm.refreshIssuerName,
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(tm.secret)
}

func randomTokenID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
