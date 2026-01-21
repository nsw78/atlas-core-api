# Contributing to ATLAS Core API

## Development Setup

1. **Prerequisites**
   ```bash
   # Install Go 1.21+
   # Install Python 3.11+
   # Install Docker & Docker Compose
   # Install kubectl
   ```

2. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd atlas-core-api
   
   # Start infrastructure
   docker-compose up -d
   
   # Run services locally
   make run-services
   ```

3. **Run Tests**
   ```bash
   make test
   ```

## Code Standards

### Go Services
- Follow Go best practices
- Use `gofmt` for formatting
- Write unit tests for all business logic
- Use structured logging (zap)
- Handle errors explicitly

### Python Services
- Follow PEP 8
- Use type hints
- Write unit tests with pytest
- Use structured logging

### API Design
- Follow RESTful conventions
- Use OpenAPI 3.0 for documentation
- Version all APIs (`/v1`, `/v2`)
- Return consistent error formats

## Security

- Never commit secrets or credentials
- Use environment variables for configuration
- Follow security best practices
- Run security scans before committing

## Pull Request Process

1. Create feature branch from `develop`
2. Make changes following code standards
3. Write/update tests
4. Update documentation
5. Create pull request
6. Ensure CI passes
7. Get code review approval
8. Merge to `develop`

## Architecture Decisions

- Document significant decisions in ADRs (Architecture Decision Records)
- Follow the architecture defined in `docs/ARCHITECTURE.md`
- Maintain compliance with boundaries in `docs/BOUNDARIES.md`
