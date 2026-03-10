# Contributing to ATLAS Core API

Thank you for your interest in contributing to ATLAS Core API! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Architecture Overview](#architecture-overview)
- [Contribution Workflow](#contribution-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Security](#security)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- **Go** 1.21+ (API Gateway, IAM, Risk Assessment)
- **Python** 3.11+ (Sanctions Screening, News Aggregator, Data Platform)
- **Node.js** 20+ (Frontend, GraphQL Gateway)
- **Docker** & **Docker Compose** for local development
- **kubectl** for Kubernetes operations
- **Helm** 3.x for chart management

### Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/<your-username>/atlas-core-api.git
   cd atlas-core-api
   ```

2. **Start infrastructure dependencies**

   ```bash
   docker compose up -d postgres redis kafka
   ```

3. **Run a specific service** (example: API Gateway)

   ```bash
   cd services/api-gateway
   go mod download
   go run cmd/server/main.go
   ```

4. **Run the frontend**

   ```bash
   cd services/frontend
   npm ci
   npm run dev
   ```

5. **Run the data platform**

   ```bash
   cd data-platform/airflow
   docker compose -f docker-compose.airflow.yml up -d
   ```

## Architecture Overview

ATLAS Core API is a microservices platform organized into domains:

| Domain | Namespace | Services |
|--------|-----------|----------|
| **Gateway** | `atlas-gateway` | API Gateway, GraphQL Gateway, Frontend |
| **Core** | `atlas-core` | IAM, Audit Logging, Sanctions Screening |
| **Intelligence** | `atlas-intel` | Risk Assessment, Graph Intelligence, News Aggregator, NLP |
| **ML** | `atlas-ml` | Model Serving, Model Monitoring, XAI |
| **Data** | `atlas-data` | Airflow, Spark, Feature Store |
| **Infrastructure** | `atlas-infra` | Vault, Consul |

See [Architecture Decision Records](docs/adr/) for key design decisions.

## Contribution Workflow

### 1. Find or Create an Issue

- Browse [existing issues](https://github.com/atlas-core/atlas-core-api/issues)
- For new features, create an issue first to discuss the approach
- For bugs, include reproduction steps and expected behavior

### 2. Create a Branch

```bash
git checkout -b <type>/<short-description>
```

Branch naming convention:
- `feat/add-batch-screening` - New features
- `fix/risk-score-calculation` - Bug fixes
- `docs/update-api-docs` - Documentation
- `refactor/iam-middleware` - Refactoring
- `test/sanctions-integration` - Test improvements
- `chore/bump-go-version` - Maintenance

### 3. Make Your Changes

- Follow the [coding standards](#coding-standards) for the relevant language
- Write tests for new functionality
- Update documentation if needed
- Keep commits atomic and descriptive

### 4. Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Examples:
```
feat(sanctions): add EU 6AMLD screening support
fix(risk): correct composite score weight calculation
docs(api): update GraphQL schema documentation
test(iam): add RBAC permission boundary tests
```

### 5. Submit a Pull Request

- Fill out the PR template completely
- Link to the related issue
- Ensure all CI checks pass
- Request review from the relevant code owners

### 6. Code Review

- Address all review comments
- Keep the conversation constructive
- Squash fixup commits before merge

## Coding Standards

### Go Services

- Follow [Effective Go](https://go.dev/doc/effective_go) guidelines
- Use `golangci-lint` with the project config
- Error handling: always wrap errors with context
- Logging: use structured logging (zerolog)
- Testing: table-driven tests preferred

```go
// Good
if err := svc.ProcessEntity(ctx, entityID); err != nil {
    return fmt.Errorf("processing entity %s: %w", entityID, err)
}

// Bad
if err := svc.ProcessEntity(ctx, entityID); err != nil {
    return err
}
```

### Python Services

- Follow PEP 8 with `ruff` as the linter
- Type hints required for all function signatures
- Use `pytest` for testing with fixtures
- Async code should use `asyncio` patterns

```python
# Good
async def screen_entity(entity_id: str, lists: list[str]) -> ScreeningResult:
    ...

# Bad
def screen_entity(entity_id, lists):
    ...
```

### TypeScript/React

- Use TypeScript strict mode
- Functional components with hooks
- Follow the existing ESLint configuration
- Use CSS modules or Tailwind for styling

### SQL / Database

- Migrations must be idempotent
- Always include rollback scripts
- Use parameterized queries (no string interpolation)
- Index frequently queried columns

## Testing Requirements

### Minimum Coverage

| Service Type | Unit | Integration | E2E |
|-------------|------|-------------|-----|
| Go services | 80% | Required | Optional |
| Python services | 75% | Required | Optional |
| Frontend | 70% | Optional | Required |
| OPA policies | 100% | N/A | N/A |

### Running Tests

```bash
# Go services
cd services/api-gateway && go test ./... -race -coverprofile=coverage.out

# Python services
cd services/sanctions-screening && python -m pytest tests/ -v --cov

# Frontend
cd services/frontend && npm test

# OPA policies
opa test k8s/policies/opa/ -v

# Helm chart
helm lint helm/atlas-core/
helm template atlas helm/atlas-core/ --values helm/atlas-core/values-dev.yaml
```

## Security

### Reporting Vulnerabilities

**Do not open public issues for security vulnerabilities.**

Email security@atlas-core.io with:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for resolution.

### Security Requirements for Contributions

- No hardcoded credentials or secrets
- All user input must be validated and sanitized
- SQL queries must use parameterized statements
- API endpoints must enforce authentication and authorization
- Dependencies must not have known critical CVEs

## License

By contributing to ATLAS Core API, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).

---

Questions? Reach out to the maintainers at platform@atlas-core.io or open a discussion.
