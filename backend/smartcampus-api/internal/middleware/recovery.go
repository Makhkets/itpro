package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/smartcampus/smartcampus-api/internal/response"
)

func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, _ any) {
		response.WriteError(c, response.Internal("Internal server error"))
	})
}
