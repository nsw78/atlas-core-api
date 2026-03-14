"""
Shared pytest fixtures and configuration for Atlas Core API integration tests.

Environment variables:
    GATEWAY_URL          - API gateway base URL  (default: http://localhost:8080)
    SCENARIO_SERVICE_URL - Scenario simulation    (default: http://localhost:8093)
    SANCTIONS_SERVICE_URL - Sanctions screening   (default: http://localhost:8000)
    NEWS_SERVICE_URL     - News aggregator        (default: http://localhost:8083)
    COMPLIANCE_SERVICE_URL - Compliance automation (default: http://localhost:8101)
    TEST_USERNAME        - Username for auth tests (default: admin)
    TEST_PASSWORD        - Password for auth tests (default: SecureP@ss1)
"""

import os
import asyncio
from typing import AsyncGenerator, Generator

import pytest
import httpx


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------

def _env(key: str, default: str) -> str:
    return os.getenv(key, default)


GATEWAY_URL = _env("GATEWAY_URL", "http://localhost:8080")
SCENARIO_SERVICE_URL = _env("SCENARIO_SERVICE_URL", "http://localhost:8093")
SANCTIONS_SERVICE_URL = _env("SANCTIONS_SERVICE_URL", "http://localhost:8000")
NEWS_SERVICE_URL = _env("NEWS_SERVICE_URL", "http://localhost:8083")
COMPLIANCE_SERVICE_URL = _env("COMPLIANCE_SERVICE_URL", "http://localhost:8101")

TEST_USERNAME = _env("TEST_USERNAME", "admin")
TEST_PASSWORD = _env("TEST_PASSWORD", "SecureP@ss1")


# ---------------------------------------------------------------------------
# Event loop (required for pytest-asyncio)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ---------------------------------------------------------------------------
# HTTP clients
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
async def gateway_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Async HTTP client pointed at the API gateway."""
    async with httpx.AsyncClient(
        base_url=GATEWAY_URL,
        timeout=30.0,
        follow_redirects=True,
    ) as client:
        yield client


@pytest.fixture(scope="session")
async def scenario_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Async HTTP client pointed at the scenario-simulation service."""
    async with httpx.AsyncClient(
        base_url=SCENARIO_SERVICE_URL,
        timeout=30.0,
        follow_redirects=True,
    ) as client:
        yield client


@pytest.fixture(scope="session")
async def sanctions_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Async HTTP client pointed at the sanctions-screening service."""
    async with httpx.AsyncClient(
        base_url=SANCTIONS_SERVICE_URL,
        timeout=30.0,
        follow_redirects=True,
    ) as client:
        yield client


@pytest.fixture(scope="session")
async def news_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Async HTTP client pointed at the news-aggregator service."""
    async with httpx.AsyncClient(
        base_url=NEWS_SERVICE_URL,
        timeout=30.0,
        follow_redirects=True,
    ) as client:
        yield client


@pytest.fixture(scope="session")
async def compliance_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Async HTTP client pointed at the compliance-automation service."""
    async with httpx.AsyncClient(
        base_url=COMPLIANCE_SERVICE_URL,
        timeout=30.0,
        follow_redirects=True,
    ) as client:
        yield client


# ---------------------------------------------------------------------------
# Authentication fixture (login once, reuse token across session)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
async def auth_token(gateway_client: httpx.AsyncClient) -> str:
    """Authenticate via the gateway and return a valid JWT access token.

    If the gateway is unreachable (e.g. running Python tests in isolation),
    the fixture returns a placeholder so that tests that *only* need a token
    shape can still be collected (they will be skipped at runtime if needed).
    """
    try:
        response = await gateway_client.post(
            "/api/v1/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD},
        )
        if response.status_code == 200:
            data = response.json()
            return data["data"]["access_token"]
    except (httpx.ConnectError, httpx.ReadTimeout):
        pass

    pytest.skip("API gateway not reachable -- skipping auth-dependent test")
    return ""


@pytest.fixture(scope="session")
async def auth_headers(auth_token: str) -> dict:
    """Return Authorization headers dict for convenience."""
    return {"Authorization": f"Bearer {auth_token}"}
