FROM golang:1.26-bookworm AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/smartcampus-api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app
COPY --from=builder /out/smartcampus-api /app/smartcampus-api
COPY internal/db/migrations /app/internal/db/migrations
COPY docs /app/docs
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/smartcampus-api"]
