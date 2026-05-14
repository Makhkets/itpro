package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/smartcampus/smartcampus-api/internal/response"
	"github.com/smartcampus/smartcampus-api/internal/security"
)

func Auth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			response.WriteError(c, response.Unauthorized("Authorization bearer token is required"))
			return
		}
		token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
		claims, err := security.ParseJWT(jwtSecret, token)
		if err != nil {
			response.WriteError(c, response.Unauthorized("Invalid or expired token"))
			return
		}
		c.Set(ContextUserID, claims.UserID)
		c.Set(ContextEmail, claims.Email)
		c.Set(ContextRole, claims.Role)
		c.Set(ContextGroupName, claims.GroupName)
		c.Set(ContextConsent, claims.PersonalDataConsent)
		c.Next()
	}
}
