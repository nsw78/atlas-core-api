"""
Integration tests for the News Aggregator Service.

These tests hit the news-aggregator service directly (default http://localhost:8083).
They require the service, PostgreSQL, and Redis to be running.
"""

import pytest
import httpx

from tests.conftest import NEWS_SERVICE_URL


pytestmark = pytest.mark.integration


class TestNewsAggregatorHealth:
    """Verify the service is running and dependencies are connected."""

    async def test_health_check(self, news_client: httpx.AsyncClient):
        response = await news_client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] in ("healthy", "degraded")
        assert body["service"] == "news-aggregator"


class TestGetArticles:
    """Verify article listing and retrieval."""

    async def test_list_articles(self, news_client: httpx.AsyncClient):
        response = await news_client.get("/api/v1/news/articles", params={"limit": 10})
        assert response.status_code == 200
        body = response.json()

        assert "articles" in body
        assert isinstance(body["articles"], list)
        assert "total" in body
        assert "limit" in body
        assert body["limit"] == 10
        assert "offset" in body

    async def test_list_articles_with_pagination(self, news_client: httpx.AsyncClient):
        # First page
        resp1 = await news_client.get("/api/v1/news/articles", params={"limit": 5, "offset": 0})
        assert resp1.status_code == 200
        body1 = resp1.json()

        # Second page
        resp2 = await news_client.get("/api/v1/news/articles", params={"limit": 5, "offset": 5})
        assert resp2.status_code == 200
        body2 = resp2.json()

        # Both should return valid structures
        assert isinstance(body1["articles"], list)
        assert isinstance(body2["articles"], list)

        # If there are enough articles, pages should differ
        if body1["total"] > 5:
            ids1 = {a["id"] for a in body1["articles"]}
            ids2 = {a["id"] for a in body2["articles"]}
            assert ids1 != ids2 or len(ids2) == 0

    async def test_list_articles_filter_by_source(self, news_client: httpx.AsyncClient):
        response = await news_client.get(
            "/api/v1/news/articles", params={"source": "BBC World", "limit": 5}
        )
        assert response.status_code == 200
        body = response.json()
        # If any articles came back, they should all be from BBC World
        for article in body["articles"]:
            assert article["source"] == "BBC World"


class TestNewsSources:
    """Verify news source listing."""

    async def test_list_sources(self, news_client: httpx.AsyncClient):
        response = await news_client.get("/api/v1/news/sources")
        assert response.status_code == 200
        body = response.json()
        assert "sources" in body
        assert isinstance(body["sources"], list)

        if body["sources"]:
            source = body["sources"][0]
            assert "id" in source
            assert "name" in source
            assert "source_type" in source
            assert "is_active" in source


class TestOsintSignals:
    """Create and list OSINT signals."""

    async def test_create_osint_signal(self, news_client: httpx.AsyncClient):
        payload = {
            "signal_type": "geopolitical",
            "source": "integration-test",
            "title": "Test OSINT Signal",
            "content": "This is a test signal created by integration tests.",
            "url": "https://example.com/test-signal",
            "severity": "informational",
            "confidence": 0.75,
            "regions": ["EU", "NA"],
            "entities": ["TestOrg"],
        }
        response = await news_client.post("/api/v1/news/osint-signals", json=payload)
        assert response.status_code == 200
        body = response.json()

        assert "id" in body
        assert body["signal_type"] == "geopolitical"
        assert body["source"] == "integration-test"
        assert body["title"] == "Test OSINT Signal"
        assert body["severity"] == "informational"
        assert "created_at" in body

    async def test_list_osint_signals(self, news_client: httpx.AsyncClient):
        # Ensure at least one signal exists
        await news_client.post(
            "/api/v1/news/osint-signals",
            json={
                "signal_type": "cyber",
                "source": "integration-test",
                "title": "Listing Test Signal",
                "severity": "low",
            },
        )

        response = await news_client.get(
            "/api/v1/news/osint-signals", params={"limit": 10}
        )
        assert response.status_code == 200
        body = response.json()

        assert "signals" in body
        assert isinstance(body["signals"], list)
        assert "total" in body
        assert body["total"] >= 1

    async def test_list_osint_signals_filter_by_severity(self, news_client: httpx.AsyncClient):
        # Create one with known severity
        await news_client.post(
            "/api/v1/news/osint-signals",
            json={
                "signal_type": "economic",
                "source": "integration-test",
                "title": "High Severity Test",
                "severity": "high",
            },
        )

        response = await news_client.get(
            "/api/v1/news/osint-signals",
            params={"severity": "high", "limit": 50},
        )
        assert response.status_code == 200
        body = response.json()
        for signal in body["signals"]:
            assert signal["severity"] == "high"

    async def test_create_and_fetch_osint_signal_by_id(self, news_client: httpx.AsyncClient):
        # Create
        create_resp = await news_client.post(
            "/api/v1/news/osint-signals",
            json={
                "signal_type": "military",
                "source": "integration-test",
                "title": "Fetch Test Signal",
                "severity": "medium",
                "confidence": 0.9,
                "regions": ["MENA"],
                "entities": ["EntityA"],
            },
        )
        assert create_resp.status_code == 200
        signal_id = create_resp.json()["id"]

        # Fetch
        get_resp = await news_client.get(f"/api/v1/news/osint-signals/{signal_id}")
        assert get_resp.status_code == 200
        body = get_resp.json()
        assert body["id"] == signal_id
        assert body["signal_type"] == "military"
        assert body["title"] == "Fetch Test Signal"
        assert body["confidence"] == 0.9

    async def test_get_nonexistent_signal_returns_404(self, news_client: httpx.AsyncClient):
        response = await news_client.get(
            "/api/v1/news/osint-signals/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404


class TestIngestion:
    """Verify manual ingestion trigger."""

    async def test_trigger_ingestion(self, news_client: httpx.AsyncClient):
        response = await news_client.post("/api/v1/news/ingest")
        assert response.status_code == 200
        body = response.json()
        assert "message" in body
