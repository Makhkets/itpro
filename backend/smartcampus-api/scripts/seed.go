//go:build seed

package main

import (
	"context"
	"fmt"
	"log"

	"github.com/smartcampus/smartcampus-api/internal/config"
	"github.com/smartcampus/smartcampus-api/internal/db"
)

func main() {
	ctx := context.Background()
	cfg := config.Load()
	pool, err := db.NewPostgresPool(ctx, cfg)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()
	if err := db.RunMigrations(ctx, pool, "internal/db/migrations"); err != nil {
		log.Fatal(err)
	}
	fmt.Println("demo seed data is applied by migrations 017_seed_demo_data.sql, 018_seed_library_books.sql and 019_seed_attendance_analytics_demo.sql")
}
