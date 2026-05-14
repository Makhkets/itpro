#!/usr/bin/env sh
set -eu

gofmt -w cmd internal pkg scripts tests
go test ./...

if command -v golangci-lint >/dev/null 2>&1; then
  golangci-lint run
else
  go vet ./...
fi

if command -v gosec >/dev/null 2>&1; then
  gosec ./...
else
  go run github.com/securego/gosec/v2/cmd/gosec@latest ./...
fi
