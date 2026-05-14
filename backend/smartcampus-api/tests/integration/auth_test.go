package integration

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/smartcampus/smartcampus-api/internal/middleware"
	"github.com/smartcampus/smartcampus-api/internal/security"
)

func TestJWTProtectedRouteAndRBAC(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	secret := "integration_secret"
	router.GET("/admin", middleware.Auth(secret), middleware.RequireRole("admin"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
	token, err := security.GenerateJWT(secret, time.Hour, security.Claims{UserID: "u1", Role: "student"})
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, "/admin", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}
