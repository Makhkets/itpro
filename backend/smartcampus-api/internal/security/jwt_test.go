package security

import (
	"testing"
	"time"
)

func TestJWTGenerationValidation(t *testing.T) {
	token, err := GenerateJWT("test_secret_for_jwt", time.Hour, Claims{
		UserID: "user-1", Email: "student@example.com", Role: "student", GroupName: "ИСП-21",
	})
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}
	claims, err := ParseJWT("test_secret_for_jwt", token)
	if err != nil {
		t.Fatalf("parse token: %v", err)
	}
	if claims.UserID != "user-1" || claims.Role != "student" || claims.GroupName != "ИСП-21" {
		t.Fatalf("unexpected claims: %+v", claims)
	}
	if _, err := ParseJWT("wrong_secret", token); err == nil {
		t.Fatal("token signed with another secret must be rejected")
	}
}
