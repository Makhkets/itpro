package logger

import (
	"context"
	"log/slog"
	"os"
)

type Logger struct {
	*slog.Logger
}

func New(env string) *Logger {
	level := slog.LevelInfo
	if env == "local" || env == "test" {
		level = slog.LevelDebug
	}
	return &Logger{Logger: slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level}))}
}

func (l *Logger) WithRequestID(ctx context.Context) *slog.Logger {
	requestID, _ := ctx.Value("request_id").(string)
	if requestID == "" {
		return l.Logger
	}
	return l.Logger.With("request_id", requestID)
}
