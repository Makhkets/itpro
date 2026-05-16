package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppEnv  string
	AppPort string

	DatabaseURL string

	RedisAddr     string
	RedisPassword string
	RedisDB       int

	JWTSecret    string
	JWTAccessTTL time.Duration

	CORSAllowedOrigins []string

	AIProvider string
	AIAPIKey   string
	AIBaseURL  string
	AIModel    string
	AIProxyURL string

	ISUProxyURL string

	AllowPublicAdminRegister bool

	RateLimitLoginPerMinute    int
	RateLimitRegisterPerMinute int
	RateLimitAPIPerMinute      int
	RateLimitAIPerMinute       int
}

func Load() Config {
	ttl, err := time.ParseDuration(getEnv("JWT_ACCESS_TTL", "24h"))
	if err != nil {
		ttl = 24 * time.Hour
	}
	return Config{
		AppEnv:      getEnv("APP_ENV", "local"),
		AppPort:     getEnv("APP_PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://smartcampus:smartcampus_password@localhost:5432/smartcampus?sslmode=disable"),

		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: os.Getenv("REDIS_PASSWORD"),
		RedisDB:       getEnvInt("REDIS_DB", 0),

		JWTSecret:    getEnv("JWT_SECRET", "change_me_for_local_only"),
		JWTAccessTTL: ttl,

		CORSAllowedOrigins: splitCSV(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")),

		AIProvider: getEnv("AI_PROVIDER", "openai_compatible"),
		AIAPIKey:   os.Getenv("AI_API_KEY"),
		AIBaseURL:  os.Getenv("AI_BASE_URL"),
		AIModel:    os.Getenv("AI_MODEL"),
		AIProxyURL: strings.TrimSpace(os.Getenv("AI_PROXY_URL")),

		ISUProxyURL: strings.TrimSpace(os.Getenv("ISU_PROXY_URL")),

		AllowPublicAdminRegister: getEnvBool("ALLOW_PUBLIC_ADMIN_REGISTER", false),

		RateLimitLoginPerMinute:    getEnvInt("RATE_LIMIT_LOGIN_PER_MINUTE", 5),
		RateLimitRegisterPerMinute: getEnvInt("RATE_LIMIT_REGISTER_PER_MINUTE", 3),
		RateLimitAPIPerMinute:      getEnvInt("RATE_LIMIT_API_PER_MINUTE", 100),
		RateLimitAIPerMinute:       getEnvInt("RATE_LIMIT_AI_PER_MINUTE", 20),
	}
}

func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func getEnvInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func getEnvBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}
