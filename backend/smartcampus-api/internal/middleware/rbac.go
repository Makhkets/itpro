package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/smartcampus/smartcampus-api/internal/response"
	"github.com/smartcampus/smartcampus-api/internal/security"
)

func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString(ContextRole)
		if !security.RoleAllowed(role, roles...) {
			response.WriteError(c, response.Forbidden("Insufficient permissions"))
			return
		}
		c.Next()
	}
}
