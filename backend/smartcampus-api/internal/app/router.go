package app

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/smartcampus/smartcampus-api/internal/config"
	"github.com/smartcampus/smartcampus-api/internal/edms"
	"github.com/smartcampus/smartcampus-api/internal/handler"
	"github.com/smartcampus/smartcampus-api/internal/middleware"
	"github.com/smartcampus/smartcampus-api/pkg/logger"
)

func NewRouter(cfg config.Config, redisClient *redis.Client, log *logger.Logger, h *handler.Handler) *gin.Engine {
	router := gin.New()
	router.Use(middleware.RequestID())
	router.Use(middleware.Recovery())
	router.Use(middleware.Logger(log))
	router.Use(middleware.CORS(cfg.CORSAllowedOrigins))
	router.Use(middleware.PrivacyHeaders())

	router.GET("/swagger/index.html", h.SwaggerIndex)
	router.StaticFile("/docs/swagger.yaml", "docs/swagger.yaml")

	api := router.Group("/api/v1")
	api.Use(middleware.RateLimit(redisClient, "rate_limit:api", cfg.RateLimitAPIPerMinute, time.Minute, true))
	h.RegisterRoutes(api, redisClient)

	// Модуль ЭДО: in-memory заглушка с реалистичными демо-данными.
	// Регистрируем под общим protected-префиксом /api/v1, защита — Auth middleware.
	edmsStore := edms.NewStore()
	edmsHandler := edms.NewHTTPHandler(edmsStore)
	edmsGroup := api.Group("")
	edmsGroup.Use(middleware.Auth(cfg.JWTSecret))
	edmsHandler.Register(edmsGroup)

	return router
}
