APP_NAME=smartcampus-api

.PHONY: run fmt test test-cover lint security docker-up docker-down migrate-up migrate-down swagger seed

run:
	go run ./cmd/api

fmt:
	gofmt -w cmd internal pkg scripts tests

test:
	go test ./...

test-cover:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

lint:
	go vet ./...

security:
	go run github.com/securego/gosec/v2/cmd/gosec@latest ./...

docker-up:
	docker compose up --build

docker-down:
	docker compose down

migrate-up:
	go run -tags migrate ./scripts/migrate.go up

migrate-down:
	go run -tags migrate ./scripts/migrate.go down

swagger:
	@echo "Swagger is maintained at docs/swagger.yaml"

seed:
	go run -tags seed ./scripts/seed.go
