package response

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

const (
	CodeValidationError       = "VALIDATION_ERROR"
	CodeUnauthorized          = "UNAUTHORIZED"
	CodeForbidden             = "FORBIDDEN"
	CodeNotFound              = "NOT_FOUND"
	CodeConflict              = "CONFLICT"
	CodeRateLimited           = "RATE_LIMITED"
	CodeBadRequest            = "BAD_REQUEST"
	CodeInternalError         = "INTERNAL_ERROR"
	CodeAIProviderUnavailable = "AI_PROVIDER_UNAVAILABLE"
)

type AppError struct {
	Status  int
	Code    string
	Message string
	Details any
}

func (e *AppError) Error() string {
	return e.Message
}

func NewError(status int, code, message string, details any) *AppError {
	return &AppError{Status: status, Code: code, Message: message, Details: details}
}

func BadRequest(message string, details any) *AppError {
	return NewError(http.StatusBadRequest, CodeBadRequest, message, details)
}

func Validation(message string, details any) *AppError {
	return NewError(http.StatusBadRequest, CodeValidationError, message, details)
}

func Unauthorized(message string) *AppError {
	return NewError(http.StatusUnauthorized, CodeUnauthorized, message, nil)
}

func Forbidden(message string) *AppError {
	return NewError(http.StatusForbidden, CodeForbidden, message, nil)
}

func NotFound(message string) *AppError {
	return NewError(http.StatusNotFound, CodeNotFound, message, nil)
}

func Conflict(message string) *AppError {
	return NewError(http.StatusConflict, CodeConflict, message, nil)
}

func Internal(message string) *AppError {
	return NewError(http.StatusInternalServerError, CodeInternalError, message, nil)
}

func WriteError(c *gin.Context, err error) {
	var appErr *AppError
	if !errors.As(err, &appErr) {
		appErr = Internal("Internal server error")
	}
	c.AbortWithStatusJSON(appErr.Status, gin.H{
		"error": gin.H{
			"code":    appErr.Code,
			"message": appErr.Message,
			"details": appErr.Details,
		},
	})
}
