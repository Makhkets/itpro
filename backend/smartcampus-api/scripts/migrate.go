//go:build migrate

package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/smartcampus/smartcampus-api/internal/config"
	"github.com/smartcampus/smartcampus-api/internal/db"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "down" {
		fmt.Println("migrate-down is intentionally a no-op in the MVP; recreate the database for a clean rollback.")
		return
	}
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
	fmt.Println("migrations applied")
}
