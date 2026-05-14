package app

import (
	"context"
	"fmt"
	"net/http"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/smartcampus/smartcampus-api/internal/config"
	"github.com/smartcampus/smartcampus-api/internal/db"
	"github.com/smartcampus/smartcampus-api/internal/handler"
	"github.com/smartcampus/smartcampus-api/internal/repository"
	"github.com/smartcampus/smartcampus-api/internal/service"
	"github.com/smartcampus/smartcampus-api/pkg/logger"
)

type App struct {
	cfg    config.Config
	server *http.Server
	pool   interface{ Close() }
	redis  *redis.Client
}

func New(ctx context.Context, cfg config.Config) (*App, error) {
	log := logger.New(cfg.AppEnv)
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	pool, err := db.NewPostgresPool(ctx, cfg)
	if err != nil {
		return nil, err
	}
	migrationsDir := filepath.Join("internal", "db", "migrations")
	if err := db.RunMigrations(ctx, pool, migrationsDir); err != nil {
		pool.Close()
		return nil, err
	}
	redisClient, err := db.NewRedisClient(ctx, cfg)
	if err != nil {
		pool.Close()
		return nil, err
	}
	repo := repository.New(pool)
	svc := service.New(repo, redisClient, cfg, log)
	h := handler.New(svc, repo, cfg)
	router := NewRouter(cfg, redisClient, log, h)

	return &App{
		cfg: cfg,
		server: &http.Server{
			Addr:              ":" + cfg.AppPort,
			Handler:           router,
			ReadHeaderTimeout: 10 * time.Second,
		},
		pool:  pool,
		redis: redisClient,
	}, nil
}

func (a *App) Run() error {
	if err := a.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}

func (a *App) Shutdown(ctx context.Context) error {
	if a.redis != nil {
		_ = a.redis.Close()
	}
	if a.pool != nil {
		a.pool.Close()
	}
	if err := a.server.Shutdown(ctx); err != nil {
		return fmt.Errorf("shutdown server: %w", err)
	}
	return nil
}
