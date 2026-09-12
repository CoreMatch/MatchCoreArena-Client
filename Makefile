.PHONY: dev build clean test lint

# Development
dev:
	wails dev

# Build for production
build:
	wails build

# Clean build artifacts
clean:
	rm -rf build/bin/
	rm -rf frontend/dist/
	rm -rf frontend/node_modules/

# Install dependencies
install:
	go mod tidy
	cd frontend && npm install

# Run tests
test:
	go test ./...

# Lint code
lint:
	cd frontend && npm run lint

# Type check
typecheck:
	cd frontend && npm run typecheck

# Build frontend only
build-frontend:
	cd frontend && npm run build

# Run frontend dev server
dev-frontend:
	cd frontend && npm run dev

# Format code
fmt:
	go fmt ./...

# Vet code
vet:
	go vet ./...

# All checks
check: fmt vet lint typecheck

# Help
help:
	@echo "Available commands:"
	@echo "  make dev              - Run in development mode"
	@echo "  make build            - Build for production"
	@echo "  make clean            - Clean build artifacts"
	@echo "  make install          - Install dependencies"
	@echo "  make test             - Run tests"
	@echo "  make lint             - Lint code"
	@echo "  make typecheck        - Type check frontend"
	@echo "  make build-frontend   - Build frontend only"
	@echo "  make dev-frontend     - Run frontend dev server"
	@echo "  make fmt              - Format Go code"
	@echo "  make vet              - Vet Go code"
	@echo "  make check            - Run all checks"
	@echo "  make help             - Show this help"