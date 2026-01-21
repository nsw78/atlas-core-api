.PHONY: help build test run-services deploy clean migrate-up migrate-down migrate-create db-reset tidy

# Database URLs
DB_URL ?= postgres://atlas:atlas_dev@localhost:5432/atlas?sslmode=disable
GEO_DB_URL ?= postgres://atlas:atlas_dev@localhost:5433/atlas_geo?sslmode=disable

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Go services
	@echo "Building services..."
	@cd services/api-gateway && go build -o ../../bin/api-gateway ./cmd
	@cd services/iam && go build -o ../../bin/iam ./cmd
	@cd services/ingestion && go build -o ../../bin/ingestion ./cmd
	@cd services/normalization && go build -o ../../bin/normalization ./cmd
	@cd services/risk-assessment && go build -o ../../bin/risk-assessment ./cmd
	@cd services/audit-logging && go build -o ../../bin/audit-logging ./cmd
	@cd services/graph-intelligence && go build -o ../../bin/graph-intelligence ./cmd
	@echo "Build complete!"

test: ## Run all tests
	@echo "Running tests..."
	@go test -v ./services/api-gateway/...
	@go test -v ./services/iam/...
	@go test -v ./services/ingestion/...
	@go test -v ./services/normalization/...
	@go test -v ./services/risk-assessment/...
	@go test -v ./services/audit-logging/...
	@go test -v ./services/graph-intelligence/...

tidy: ## Tidy Go modules
	@echo "Tidying Go modules..."
	@cd services/api-gateway && go mod tidy
	@cd services/iam && go mod tidy
	@cd services/ingestion && go mod tidy
	@cd services/normalization && go mod tidy
	@cd services/risk-assessment && go mod tidy
	@cd services/audit-logging && go mod tidy
	@cd services/graph-intelligence && go mod tidy
	@echo "Go modules tidied!"

migrate-up: ## Run database migrations
	@echo "Running migrations on main database..."
	@migrate -path migrations -database "$(DB_URL)" up

migrate-down: ## Rollback last migration
	@echo "Rolling back last migration..."
	@migrate -path migrations -database "$(DB_URL)" down 1

migrate-create: ## Create new migration (usage: make migrate-create NAME=migration_name)
	@if [ -z "$(NAME)" ]; then \
		echo "Error: NAME is required. Usage: make migrate-create NAME=migration_name"; \
		exit 1; \
	fi
	@echo "Creating migration: $(NAME)"
	@migrate create -ext sql -dir migrations -seq $(NAME)

migrate-geo-up: ## Run geospatial migrations
	@echo "Running geospatial migrations..."
	@migrate -path migrations -database "$(GEO_DB_URL)" up

db-reset: ## Drop and recreate database (CAUTION!)
	@echo "WARNING: This will DROP and RECREATE the database!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		migrate -path migrations -database "$(DB_URL)" drop -f; \
		migrate -path migrations -database "$(DB_URL)" up; \
		echo "Database reset complete!"; \
	else \
		echo "Cancelled."; \
	fi

run-services: ## Run all services locally
	@echo "Starting services..."
	@docker-compose --profile mvp up -d
	@go run services/api-gateway/cmd/main.go &
	@go run services/iam/cmd/main.go &
	@go run services/risk-assessment/cmd/main.go &
	@cd services/news-aggregator && python -m uvicorn main:app --reload &

deploy: ## Deploy to Kubernetes
	@echo "Deploying to Kubernetes..."
	@kubectl apply -f k8s/
	@echo "Deployment complete!"

clean: ## Clean build artifacts
	@echo "Cleaning..."
	@rm -rf bin/
	@rm -rf dist/
	@docker-compose down
	@echo "Clean complete!"

docker-build: ## Build Docker images
	@echo "Building Docker images..."
	@docker build -t atlas/api-gateway:latest services/api-gateway/
	@docker build -t atlas/iam:latest services/iam/
	@docker build -t atlas/risk-assessment:latest services/risk-assessment/
	@docker build -t atlas/news-aggregator:latest services/news-aggregator/
