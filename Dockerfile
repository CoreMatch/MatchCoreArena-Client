# Build stage
FROM golang:1.25-alpine AS builder

# Install dependencies
RUN apk add --no-cache git npm

# Set working directory
WORKDIR /app

# Copy Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Install Wails CLI
RUN go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Install frontend dependencies
RUN cd frontend && npm install

# Build the application
RUN wails build

# Runtime stage
FROM alpine:latest

# Install dependencies
RUN apk add --no-cache ca-certificates

# Create non-root user
RUN adduser -D -g '' appuser

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/build/bin/MatchCoreArenaClient .

# Switch to non-root user
USER appuser

# Expose port (if needed)
# EXPOSE 8080

# Run the application
CMD ["./MatchCoreArenaClient"]