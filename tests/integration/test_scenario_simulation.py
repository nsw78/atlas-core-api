"""
Integration tests for the Scenario Simulation Service.

These tests hit the scenario-simulation service directly (default http://localhost:8093).
They require the service and its PostgreSQL database to be running.
"""

import pytest
import httpx

from tests.conftest import SCENARIO_SERVICE_URL


pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _base_scenario(name: str = "Integration Test Scenario", **overrides) -> dict:
    """Return a minimal valid scenario payload."""
    payload = {
        "name": name,
        "description": "Created by automated integration tests",
        "variables": {"base_risk": 0.5, "volatility": 0.15},
        "simulation_type": "monte_carlo",
        "iterations": 500,
        "time_horizon_days": 30,
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestScenarioSimulationHealth:
    """Basic health / reachability checks."""

    async def test_health_check(self, scenario_client: httpx.AsyncClient):
        response = await scenario_client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] in ("healthy", "degraded")
        assert body["service"] == "scenario-simulation-service"


class TestScenarioCreation:
    """Create, list, and fetch scenarios."""

    async def test_create_scenario_returns_results(self, scenario_client: httpx.AsyncClient):
        payload = _base_scenario("Monte Carlo Test")
        response = await scenario_client.post("/api/v1/simulations/scenarios", json=payload)

        assert response.status_code == 200
        body = response.json()

        assert body["scenario_name"] == "Monte Carlo Test"
        assert body["status"] == "completed"
        assert "simulation_id" in body
        assert "scenario_id" in body
        assert "results" in body
        assert "metrics" in body

        metrics = body["metrics"]
        assert "risk_score" in metrics
        assert "confidence" in metrics
        assert metrics["iterations"] == 500

    async def test_create_and_fetch_by_id(self, scenario_client: httpx.AsyncClient):
        # Create
        payload = _base_scenario("Fetch-By-ID Test")
        create_resp = await scenario_client.post("/api/v1/simulations/scenarios", json=payload)
        assert create_resp.status_code == 200
        simulation_id = create_resp.json()["simulation_id"]

        # Fetch
        get_resp = await scenario_client.get(f"/api/v1/simulations/{simulation_id}")
        assert get_resp.status_code == 200
        body = get_resp.json()
        assert body["simulation_id"] == simulation_id
        assert body["scenario_name"] == "Fetch-By-ID Test"
        assert body["status"] == "completed"
        assert isinstance(body["results"], list)
        assert len(body["results"]) > 0

    async def test_create_and_list_scenarios(self, scenario_client: httpx.AsyncClient):
        # Create at least one scenario so the list is non-empty
        payload = _base_scenario("List Test")
        create_resp = await scenario_client.post("/api/v1/simulations/scenarios", json=payload)
        assert create_resp.status_code == 200

        list_resp = await scenario_client.get("/api/v1/simulations", params={"limit": 5})
        assert list_resp.status_code == 200
        body = list_resp.json()

        assert "simulations" in body
        assert isinstance(body["simulations"], list)
        assert body["total"] >= 1

        sim = body["simulations"][0]
        assert "simulation_id" in sim
        assert "scenario_name" in sim
        assert "status" in sim

    async def test_get_nonexistent_simulation_returns_404(self, scenario_client: httpx.AsyncClient):
        resp = await scenario_client.get("/api/v1/simulations/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404


class TestMonteCarloSimulation:
    """Verify Monte Carlo results contain expected statistics."""

    async def test_monte_carlo_statistics(self, scenario_client: httpx.AsyncClient):
        payload = _base_scenario(
            "Statistics Validation",
            simulation_type="monte_carlo",
            iterations=1000,
            variables={"base_risk": 0.6, "volatility": 0.2},
        )
        resp = await scenario_client.post("/api/v1/simulations/scenarios", json=payload)
        assert resp.status_code == 200
        body = resp.json()

        results = body["results"]
        assert "statistics" in results
        stats = results["statistics"]
        assert "mean" in stats
        assert "std" in stats
        assert "min" in stats
        assert "max" in stats
        assert "percentiles" in stats

        percentiles = stats["percentiles"]
        assert "p10" in percentiles
        assert "p50" in percentiles
        assert "p90" in percentiles

        # Basic sanity: min <= p10 <= p50 <= p90 <= max
        assert stats["min"] <= percentiles["p10"]
        assert percentiles["p10"] <= percentiles["p50"]
        assert percentiles["p50"] <= percentiles["p90"]
        assert percentiles["p90"] <= stats["max"]

    async def test_monte_carlo_outcome_distribution(self, scenario_client: httpx.AsyncClient):
        payload = _base_scenario(
            "Outcome Distribution Test",
            iterations=1000,
            variables={"base_risk": 0.5, "volatility": 0.1},
        )
        resp = await scenario_client.post("/api/v1/simulations/scenarios", json=payload)
        assert resp.status_code == 200

        dist = resp.json()["results"]["outcome_distribution"]
        assert "high_risk" in dist
        assert "medium_risk" in dist
        assert "low_risk" in dist
        total = dist["high_risk"] + dist["medium_risk"] + dist["low_risk"]
        assert total == 1000


class TestAgentBasedSimulation:
    """Verify agent-based simulation results."""

    async def test_agent_based_returns_interactions(self, scenario_client: httpx.AsyncClient):
        payload = _base_scenario(
            "Agent-Based Test",
            simulation_type="agent_based",
            iterations=50,
            variables={"agents": ["defender", "attacker", "neutral"]},
        )
        resp = await scenario_client.post("/api/v1/simulations/scenarios", json=payload)
        assert resp.status_code == 200
        body = resp.json()

        results = body["results"]
        assert "interactions" in results
        assert len(results["interactions"]) == 50
        assert "agent_performance" in results
        assert results["equilibrium_reached"] is True


class TestCompareScenarios:
    """Compare two scenarios side by side."""

    async def test_compare_two_scenarios(self, scenario_client: httpx.AsyncClient):
        scenarios = [
            _base_scenario("Compare A", variables={"base_risk": 0.3, "volatility": 0.1}),
            _base_scenario("Compare B", variables={"base_risk": 0.7, "volatility": 0.2}),
        ]
        resp = await scenario_client.post("/api/v1/simulations/compare", json=scenarios)
        assert resp.status_code == 200
        body = resp.json()

        assert "comparison" in body
        comparison = body["comparison"]
        assert len(comparison["scenarios"]) == 2
        assert len(comparison["risk_scores"]) == 2
        assert comparison["recommendation"] in ("scenario_1", "scenario_2")

        assert "results" in body
        assert len(body["results"]) == 2


class TestDeleteSimulation:
    """Delete a simulation run."""

    async def test_delete_simulation(self, scenario_client: httpx.AsyncClient):
        # Create
        payload = _base_scenario("Delete Test")
        create_resp = await scenario_client.post("/api/v1/simulations/scenarios", json=payload)
        assert create_resp.status_code == 200
        sim_id = create_resp.json()["simulation_id"]

        # Delete
        del_resp = await scenario_client.delete(f"/api/v1/simulations/{sim_id}")
        assert del_resp.status_code == 200

        # Verify gone
        get_resp = await scenario_client.get(f"/api/v1/simulations/{sim_id}")
        assert get_resp.status_code == 404

    async def test_delete_nonexistent_returns_404(self, scenario_client: httpx.AsyncClient):
        resp = await scenario_client.delete(
            "/api/v1/simulations/00000000-0000-0000-0000-000000000000"
        )
        assert resp.status_code == 404
