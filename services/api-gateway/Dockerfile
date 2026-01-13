# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /build

# Copy go mod files first (for better caching)
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code
COPY . .

# Ensure go.sum is up to date with actual code
RUN go mod tidy

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o api-gateway ./cmd/main.go

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/api-gateway .

# Create non-root user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

USER appuser

EXPOSE 8080

CMD ["./api-gateway"]
