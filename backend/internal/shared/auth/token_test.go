package auth

import (
	"testing"
	"time"
)

func TestIssueAndParse(t *testing.T) {
	tm := NewTokenManager("test-secret", time.Minute, time.Hour, "test")
	tok, err := tm.IssueAccess(42, RoleAdmin)
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}
	claims, err := tm.Parse(tok)
	if err != nil {
		t.Fatalf("parse token: %v", err)
	}
	if claims.Subject != "42" {
		t.Fatalf("expected subject 42, got %s", claims.Subject)
	}
	if claims.Role != RoleAdmin {
		t.Fatalf("expected role admin, got %s", claims.Role)
	}
	if claims.TokenUse != TokenUseAccess {
		t.Fatalf("expected token use access, got %s", claims.TokenUse)
	}
}
