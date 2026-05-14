package middleware

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	ContextRequestID = "request_id"
	ContextUserID    = "user_id"
	ContextEmail     = "email"
	ContextRole      = "role"
	ContextGroupName = "group_name"
	ContextConsent   = "personal_data_consent"
)

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.NewString()
		}
		c.Header("X-Request-ID", requestID)
		c.Set(ContextRequestID, requestID)
		c.Request = c.Request.WithContext(context.WithValue(c.Request.Context(), ContextRequestID, requestID))
		c.Next()
	}
}
