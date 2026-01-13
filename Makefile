.PHONY: help build test run-services deploy clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all services
	@echo "Building services..."
	@cd services/api-gateway && go build -o ../../bin/api-gateway ./cmd/main.go
	@cd services/iam && go build -o ../../bin/iam ./cmd/main.go
	@cd services/risk-assessment && go build -o ../../bin/risk-assessment ./cmd/main.go
	@echo "Build complete!"

test: ## Run all tests
	@echo "Running tests..."
	@go test ./... -v
	@cd services/news-aggregator && python -m pytest tests/ -v

run-services: ## Run all services locally
	@echo "Starting services..."
	@docker-compose up -d
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
