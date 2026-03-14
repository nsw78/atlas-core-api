"""
Integration tests for the Sanctions Screening & Trade Intelligence Service.

These tests hit the sanctions-screening service directly (default http://localhost:8000).
The service uses in-memory mock data so no external database is required.
"""

import pytest
import httpx

from tests.conftest import SANCTIONS_SERVICE_URL


pytestmark = pytest.mark.integration


class TestSanctionsHealth:
    """Verify the service is running and reachable."""

    async def test_health_check(self, sanctions_client: httpx.AsyncClient):
        response = await sanctions_client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "healthy"
        assert body["service"] == "sanctions-screening"
        assert "version" in body
        assert "timestamp" in body


class TestSanctionedCountries:
    """Verify the sanctioned-countries endpoint."""

    async def test_get_sanctioned_countries(self, sanctions_client: httpx.AsyncClient):
        response = await sanctions_client.get("/api/v1/sanctions/countries")
        assert response.status_code == 200
        countries = response.json()
        assert isinstance(countries, list)
        assert len(countries) > 0

        # Verify structure of first country
        country = countries[0]
        assert "country_code" in country
        assert "country_name" in country
        assert "programs" in country
        assert isinstance(country["programs"], list)
        assert "severity" in country
        assert country["severity"] in ("comprehensive", "sectoral", "targeted")
        assert "since" in country

    async def test_sanctioned_countries_include_known_entries(self, sanctions_client: httpx.AsyncClient):
        response = await sanctions_client.get("/api/v1/sanctions/countries")
        assert response.status_code == 200
        countries = response.json()
        codes = {c["country_code"] for c in countries}
        # These countries should always be present in the sanctions list
        for expected_code in ("IR", "KP", "CU", "SY", "RU"):
            assert expected_code in codes, f"{expected_code} should be in sanctioned countries"


class TestSanctionsLists:
    """Verify the sanctions-lists metadata endpoint."""

    async def test_get_sanctions_lists(self, sanctions_client: httpx.AsyncClient):
        response = await sanctions_client.get("/api/v1/sanctions/lists")
        assert response.status_code == 200
        lists = response.json()
        assert isinstance(lists, list)
        assert len(lists) >= 6  # OFAC_SDN, OFAC_CONSOLIDATED, EU, UN, BIS, UK

        list_item = lists[0]
        assert "list_key" in list_item
        assert "name" in list_item
        assert "authority" in list_item
        assert "source_url" in list_item
        assert "total_entries" in list_item
        assert list_item["status"] == "active"


class TestScreenEntity:
    """Screen individual entities against sanctions lists."""

    async def test_screen_known_entity_returns_matches(self, sanctions_client: httpx.AsyncClient):
        payload = {
            "entity_name": "ISLAMIC REVOLUTIONARY GUARD CORPS",
            "entity_type": "organization",
            "country_code": "IR",
        }
        response = await sanctions_client.post("/api/v1/sanctions/screen", json=payload)
        assert response.status_code == 200
        body = response.json()

        assert "screening_id" in body
        assert body["entity_name"] == "ISLAMIC REVOLUTIONARY GUARD CORPS"
        assert body["total_matches"] >= 1
        assert body["highest_confidence"] >= 85.0
        assert body["risk_level"] == "critical"

        # Check match structure
        match = body["matches"][0]
        assert "match_id" in match
        assert "matched_name" in match
        assert "list_source" in match
        assert "confidence_score" in match
        assert "programs" in match
        assert isinstance(match["programs"], list)

    async def test_screen_clean_entity_returns_clear(self, sanctions_client: httpx.AsyncClient):
        payload = {
            "entity_name": "John Smith Bakery LLC",
            "entity_type": "organization",
            "country_code": "US",
        }
        response = await sanctions_client.post("/api/v1/sanctions/screen", json=payload)
        assert response.status_code == 200
        body = response.json()

        assert body["total_matches"] == 0
        assert body["risk_level"] == "clear"
        assert body["matches"] == []

    async def test_screen_entity_by_alias(self, sanctions_client: httpx.AsyncClient):
        """Screen using an alias rather than the official name."""
        payload = {
            "entity_name": "IRGC",
            "entity_type": "organization",
        }
        response = await sanctions_client.post("/api/v1/sanctions/screen", json=payload)
        assert response.status_code == 200
        body = response.json()

        # IRGC is an alias for Islamic Revolutionary Guard Corps
        assert body["total_matches"] >= 1
        # Alias match might have a lower confidence than exact name match
        assert body["highest_confidence"] > 0

    async def test_screen_entity_country_boost(self, sanctions_client: httpx.AsyncClient):
        """Providing matching country code should boost confidence."""
        payload_no_country = {
            "entity_name": "SBERBANK",
            "entity_type": "organization",
        }
        payload_with_country = {
            "entity_name": "SBERBANK",
            "entity_type": "organization",
            "country_code": "RU",
        }
        resp_no = await sanctions_client.post("/api/v1/sanctions/screen", json=payload_no_country)
        resp_with = await sanctions_client.post("/api/v1/sanctions/screen", json=payload_with_country)

        assert resp_no.status_code == 200
        assert resp_with.status_code == 200

        score_no = resp_no.json()["highest_confidence"]
        score_with = resp_with.json()["highest_confidence"]
        # Country match adds a boost
        assert score_with >= score_no


class TestBatchScreening:
    """Screen multiple entities in one request."""

    async def test_batch_screening(self, sanctions_client: httpx.AsyncClient):
        payload = {
            "entities": [
                {"entity_name": "WAGNER GROUP", "entity_type": "organization"},
                {"entity_name": "Innocent Corp", "entity_type": "organization", "country_code": "CH"},
                {"entity_name": "HUAWEI", "entity_type": "organization", "country_code": "CN"},
            ]
        }
        response = await sanctions_client.post("/api/v1/sanctions/batch", json=payload)
        assert response.status_code == 200
        body = response.json()

        assert "batch_id" in body
        assert body["total_entities"] == 3
        assert isinstance(body["results"], list)
        assert len(body["results"]) == 3

        # Wagner should have matches, Innocent Corp should be clear
        wagner_result = body["results"][0]
        innocent_result = body["results"][1]
        assert wagner_result["total_matches"] >= 1
        assert innocent_result["total_matches"] == 0

    async def test_batch_screening_empty_list_returns_422(self, sanctions_client: httpx.AsyncClient):
        payload = {"entities": []}
        response = await sanctions_client.post("/api/v1/sanctions/batch", json=payload)
        assert response.status_code == 422  # Pydantic validation: min_length=1


class TestSanctionsStats:
    """Verify screening statistics endpoint."""

    async def test_get_stats(self, sanctions_client: httpx.AsyncClient):
        response = await sanctions_client.get("/api/v1/sanctions/stats")
        assert response.status_code == 200
        body = response.json()

        assert "total_screenings" in body
        assert "matches_found" in body
        assert "lists_tracked" in body
        assert body["lists_tracked"] >= 6
        assert "last_sync" in body
        assert "match_rate_pct" in body
        assert isinstance(body["match_rate_pct"], float)


class TestTradeIntelligence:
    """Verify trade intelligence endpoints."""

    async def test_trade_intelligence_known_pair(self, sanctions_client: httpx.AsyncClient):
        payload = {
            "origin_country": "US",
            "destination_country": "CN",
        }
        response = await sanctions_client.post("/api/v1/trade/intelligence", json=payload)
        assert response.status_code == 200
        body = response.json()

        assert body["origin_country"] == "US"
        assert body["destination_country"] == "CN"
        assert body["exports_usd"] > 0
        assert body["imports_usd"] > 0
        assert "trade_balance_usd" in body
        assert isinstance(body["restrictions"], list)
        assert isinstance(body["data_sources"], list)

    async def test_trade_partners(self, sanctions_client: httpx.AsyncClient):
        response = await sanctions_client.get("/api/v1/trade/partners/US")
        assert response.status_code == 200
        body = response.json()

        assert body["country_code"] == "US"
        assert len(body["partners"]) > 0
        partner = body["partners"][0]
        assert "partner" in partner
        assert "exports_usd" in partner
        assert "imports_usd" in partner

    async def test_trade_partners_unknown_country_returns_404(self, sanctions_client: httpx.AsyncClient):
        response = await sanctions_client.get("/api/v1/trade/partners/ZZ")
        assert response.status_code == 404

    async def test_trade_restrictions(self, sanctions_client: httpx.AsyncClient):
        response = await sanctions_client.get(
            "/api/v1/trade/restrictions", params={"status": "active"}
        )
        assert response.status_code == 200
        body = response.json()
        assert body["total"] > 0
        assert all(r["status"] == "active" for r in body["restrictions"])

    async def test_trade_restrictions_filter_by_country(self, sanctions_client: httpx.AsyncClient):
        response = await sanctions_client.get(
            "/api/v1/trade/restrictions", params={"target_country": "RU"}
        )
        assert response.status_code == 200
        body = response.json()
        assert all(r["target_country"] == "RU" for r in body["restrictions"])

    async def test_commodity_trade_flows(self, sanctions_client: httpx.AsyncClient):
        response = await sanctions_client.get("/api/v1/trade/commodities/2709")
        assert response.status_code == 200
        body = response.json()
        assert body["hs_code"] == "2709"
        assert "top_exporters" in body
        assert "top_importers" in body
        assert "restrictions" in body

    async def test_commodity_unknown_hs_code_returns_404(self, sanctions_client: httpx.AsyncClient):
        response = await sanctions_client.get("/api/v1/trade/commodities/9999")
        assert response.status_code == 404
