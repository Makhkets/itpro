FROM golang:1.26-bookworm AS builder

WORKDIR /src
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl openssl \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://secure.globalsign.com/cacert/gsgccr6alphasslca2025.crt -o /tmp/gsgccr6alphasslca2025.crt \
    && echo "a883559231f8388daf35ce41c8101040ae8fd9b656434247b9475af592cc08ca  /tmp/gsgccr6alphasslca2025.crt" | sha256sum -c - \
    && openssl x509 -inform DER -in /tmp/gsgccr6alphasslca2025.crt -out /usr/local/share/ca-certificates/gsgccr6alphasslca2025.crt \
    && update-ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/smartcampus-api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=builder /out/smartcampus-api /app/smartcampus-api
COPY internal/db/migrations /app/internal/db/migrations
COPY docs /app/docs
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/smartcampus-api"]
