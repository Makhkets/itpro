package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/smartcampus/smartcampus-api/internal/response"
)

func RateLimit(rdb *redis.Client, prefix string, limit int, ttl time.Duration, userAware bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if rdb == nil || limit <= 0 {
			c.Next()
			return
		}
		identity := c.ClientIP()
		if userAware && c.GetString(ContextUserID) != "" {
			identity = c.GetString(ContextUserID)
		}
		key := prefix + ":" + identity
		count, err := rdb.Incr(c.Request.Context(), key).Result()
		if err != nil {
			c.Next()
			return
		}
		if count == 1 {
			_ = rdb.Expire(c.Request.Context(), key, ttl).Err()
		}
		if count > int64(limit) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": gin.H{
					"code":    response.CodeRateLimited,
					"message": "Rate limit exceeded",
					"details": gin.H{"limit": limit, "window": ttl.String()},
				},
			})
			return
		}
		c.Next()
	}
}
