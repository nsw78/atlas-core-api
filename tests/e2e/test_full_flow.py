"""
End-to-end test: full workflow across multiple Atlas Core API services.

Flow:
  1. Login via the API gateway
  2. Create a compliance policy (via compliance-automation)
  3. Run a scenario simulation (via scenario-simulation)
  4. Screen an entity against sanctions (via sanctions-screening)
  5. Check compliance status (via compliance-automation)
  6. Run a compliance scan (via compliance-automation)
  7. Verify audit trail (optional -- check gateway audit endpoint if available)

Requirements:
  - All services must be running (gateway, scenario-simulation, sanctions-screening,
    compliance-automation).
  - PostgreSQL and Redis must be available.
"""

import uuid
import pytest
import httpx

from tests.conftest import (
    GATEWAY_URL,
    SCENARIO_SERVICE_URL,
    SANCTIONS_SERVICE_URL,
    COMPLIANCE_SERVICE_URL,
    TEST_USERNAME,
    TEST_PASSWORD,
)


pytestmark = pytest.mark.e2e


class TestFullAtlasFlow:
    """
    End-to-end test that exercises the critical path through the entire
    Atlas platform in a single linear flow.
    """

    async def test_complete_risk_assessment_workflow(self):
        """
        Execute the complete workflow:
        login -> create policy -> simulate scenario -> screen entity ->
        check compliance -> run scan -> generate evidence
        """
        timeout = httpx.Timeout(30.0)

        # ------------------------------------------------------------------
        # Step 1: Login via the API Gateway
        # ------------------------------------------------------------------
        async with httpx.AsyncClient(base_url=GATEWAY_URL, timeout=timeout) as gw:
            login_resp = await gw.post(
                "/api/v1/auth/login",
                json={"username": TEST_USERNAME, "password": TEST_PASSWORD},
            )
            assert login_resp.status_code == 200, (
                f"Login failed: {login_resp.status_code} {login_resp.text}"
            )
            login_data = login_resp.json()
            assert "data" in login_data
            access_token = login_data["data"]["access_token"]
            refresh_token = login_data["data"]["refresh_token"]
            assert access_token, "access_token should not be empty"
            assert refresh_token, "refresh_token should not be empty"

            auth_headers = {"Authorization": f"Bearer {access_token}"}

        # ------------------------------------------------------------------
        # Step 2: Create a compliance policy
        # ------------------------------------------------------------------
        unique_code = f"E2E-{uuid.uuid4().hex[:8].upper()}"
        async with httpx.AsyncClient(base_url=COMPLIANCE_SERVICE_URL, timeout=timeout) as comp:
            policy_resp = await comp.post(
                "/api/v1/compliance/policies",
                json={
                    "name": "E2E Data Protection Policy",
                    "code": unique_code,
                    "description": "Created by end-to-end test",
                    "regulation": "GDPR",
                    "category": "data_protection",
                    "severity": "high",
                    "rules": [
                        {"id": "e2e-r1", "check": "encryption", "expected": True},
                        {"id": "e2e-r2", "check": "access_control", "expected": "RBAC"},
                        {"id": "e2e-r3", "check": "data_retention", "expected": 365},
                    ],
                    "remediation_guidance": "Enable encryption and RBAC.",
                    "is_automated": True,
                },
            )
            assert policy_resp.status_code == 200, (
                f"Policy creation failed: {policy_resp.status_code} {policy_resp.text}"
            )
            policy_id = policy_resp.json()["policy_id"]
            assert policy_id

        # ------------------------------------------------------------------
        # Step 3: Run a scenario simulation
        # ------------------------------------------------------------------
        async with httpx.AsyncClient(base_url=SCENARIO_SERVICE_URL, timeout=timeout) as sim:
            sim_resp = await sim.post(
                "/api/v1/simulations/scenarios",
                json={
                    "name": "E2E Risk Scenario",
                    "description": "End-to-end test scenario",
                    "variables": {"base_risk": 0.6, "volatility": 0.2},
                    "simulation_type": "monte_carlo",
                    "iterations": 500,
                    "time_horizon_days": 30,
                },
            )
            assert sim_resp.status_code == 200, (
                f"Simulation failed: {sim_resp.status_code} {sim_resp.text}"
            )
            sim_body = sim_resp.json()
            simulation_id = sim_body["simulation_id"]
            assert sim_body["status"] == "completed"
            assert "results" in sim_body
            assert "statistics" in sim_body["results"]

            risk_score = sim_body["metrics"]["risk_score"]
            assert 0 <= risk_score <= 1, "risk_score should be between 0 and 1"

        # ------------------------------------------------------------------
        # Step 4: Screen an entity against sanctions
        # ------------------------------------------------------------------
        async with httpx.AsyncClient(base_url=SANCTIONS_SERVICE_URL, timeout=timeout) as san:
            screen_resp = await san.post(
                "/api/v1/sanctions/screen",
                json={
                    "entity_name": "ROSOBORONEXPORT",
                    "entity_type": "organization",
                    "country_code": "RU",
                },
            )
            assert screen_resp.status_code == 200, (
                f"Screening failed: {screen_resp.status_code} {screen_resp.text}"
            )
            screen_body = screen_resp.json()
            assert screen_body["total_matches"] >= 1, "ROSOBORONEXPORT should match sanctions"
            assert screen_body["risk_level"] in ("critical", "high", "medium")
            screening_id = screen_body["screening_id"]

        # ------------------------------------------------------------------
        # Step 5: Check compliance status
        # ------------------------------------------------------------------
        async with httpx.AsyncClient(base_url=COMPLIANCE_SERVICE_URL, timeout=timeout) as comp:
            status_resp = await comp.get("/api/v1/compliance/status")
            assert status_resp.status_code == 200
            status_body = status_resp.json()
            assert "overall_status" in status_body
            assert "regulations" in status_body

        # ------------------------------------------------------------------
        # Step 6: Run a compliance scan against the policy we created
        # ------------------------------------------------------------------
        async with httpx.AsyncClient(base_url=COMPLIANCE_SERVICE_URL, timeout=timeout) as comp:
            scan_resp = await comp.post(
                "/api/v1/compliance/scan",
                json={
                    "policy_id": policy_id,
                    "scope": "infrastructure",
                    "scope_target": "production-cluster",
                },
            )
            assert scan_resp.status_code == 200, (
                f"Scan failed: {scan_resp.status_code} {scan_resp.text}"
            )
            scan_body = scan_resp.json()
            scan_id = scan_body["scan_id"]
            assert scan_body["status"] == "completed"
            assert "score" in scan_body
            assert 0 <= scan_body["score"] <= 100

        # ------------------------------------------------------------------
        # Step 7: Create compliance evidence linking the scan
        # ------------------------------------------------------------------
        async with httpx.AsyncClient(base_url=COMPLIANCE_SERVICE_URL, timeout=timeout) as comp:
            evidence_resp = await comp.post(
                "/api/v1/compliance/evidence",
                json={
                    "policy_id": policy_id,
                    "scan_id": scan_id,
                    "evidence_type": "api_response",
                    "title": "E2E Automated Evidence",
                    "description": (
                        f"Risk score: {risk_score:.4f}, "
                        f"Sanctions matches: {screen_body['total_matches']}, "
                        f"Compliance score: {scan_body['score']}"
                    ),
                    "content": {
                        "simulation_id": simulation_id,
                        "risk_score": risk_score,
                        "screening_id": screening_id,
                        "sanctions_risk_level": screen_body["risk_level"],
                        "compliance_scan_id": scan_id,
                        "compliance_score": scan_body["score"],
                    },
                },
            )
            assert evidence_resp.status_code == 200, (
                f"Evidence creation failed: {evidence_resp.status_code} {evidence_resp.text}"
            )
            evidence_body = evidence_resp.json()
            assert "evidence_id" in evidence_body
            assert evidence_body["status"] == "pending"

        # ------------------------------------------------------------------
        # Step 8: Verify we can fetch simulation results after the workflow
        # ------------------------------------------------------------------
        async with httpx.AsyncClient(base_url=SCENARIO_SERVICE_URL, timeout=timeout) as sim:
            verify_resp = await sim.get(f"/api/v1/simulations/{simulation_id}")
            assert verify_resp.status_code == 200
            verify_body = verify_resp.json()
            assert verify_body["simulation_id"] == simulation_id
            assert verify_body["status"] == "completed"

    async def test_gateway_auth_flow(self):
        """
        Focused E2E: login, access protected resource, refresh token, logout.
        """
        timeout = httpx.Timeout(30.0)

        async with httpx.AsyncClient(base_url=GATEWAY_URL, timeout=timeout) as gw:
            # Login
            login_resp = await gw.post(
                "/api/v1/auth/login",
                json={"username": TEST_USERNAME, "password": TEST_PASSWORD},
            )
            assert login_resp.status_code == 200
            data = login_resp.json()["data"]
            access_token = data["access_token"]
            refresh_token = data["refresh_token"]

            # Validate token
            validate_resp = await gw.get(
                "/api/v1/auth/validate",
                params={"token": access_token},
            )
            assert validate_resp.status_code == 200
            assert validate_resp.json()["message"] == "Token is valid"

            # Refresh token
            refresh_resp = await gw.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": refresh_token},
            )
            assert refresh_resp.status_code == 200
            new_token = refresh_resp.json()["data"]["access_token"]
            assert new_token
            assert new_token != access_token  # should be a fresh token

            # Logout with the new token
            logout_resp = await gw.post(
                "/api/v1/auth/logout",
                headers={"Authorization": f"Bearer {new_token}"},
            )
            assert logout_resp.status_code == 200
            assert logout_resp.json()["message"] == "Logout successful"

    async def test_sanctions_then_compliance_workflow(self):
        """
        E2E: batch-screen entities, then create compliance evidence from results.
        """
        timeout = httpx.Timeout(30.0)

        # Batch screen
        async with httpx.AsyncClient(base_url=SANCTIONS_SERVICE_URL, timeout=timeout) as san:
            batch_resp = await san.post(
                "/api/v1/sanctions/batch",
                json={
                    "entities": [
                        {"entity_name": "SBERBANK OF RUSSIA", "entity_type": "organization", "country_code": "RU"},
                        {"entity_name": "VTB BANK", "entity_type": "organization", "country_code": "RU"},
                        {"entity_name": "Clean Company LLC", "entity_type": "organization", "country_code": "US"},
                    ]
                },
            )
            assert batch_resp.status_code == 200
            batch_body = batch_resp.json()
            assert batch_body["total_entities"] == 3

            flagged = [r for r in batch_body["results"] if r["total_matches"] > 0]
            clear = [r for r in batch_body["results"] if r["total_matches"] == 0]
            assert len(flagged) >= 2, "SBERBANK and VTB should be flagged"
            assert len(clear) >= 1, "Clean Company should be clear"

        # Create compliance policy + evidence based on screening
        async with httpx.AsyncClient(base_url=COMPLIANCE_SERVICE_URL, timeout=timeout) as comp:
            unique_code = f"E2E-SAN-{uuid.uuid4().hex[:8].upper()}"
            policy_resp = await comp.post(
                "/api/v1/compliance/policies",
                json={
                    "name": "Sanctions Screening Compliance",
                    "code": unique_code,
                    "regulation": "GDPR",
                    "severity": "critical",
                    "rules": [{"id": "san-1", "check": "sanctions_clear", "expected": True}],
                },
            )
            assert policy_resp.status_code == 200
            policy_id = policy_resp.json()["policy_id"]

            evidence_resp = await comp.post(
                "/api/v1/compliance/evidence",
                json={
                    "policy_id": policy_id,
                    "evidence_type": "api_response",
                    "title": "Batch Sanctions Screening Results",
                    "description": f"Screened {batch_body['total_entities']} entities, "
                                   f"found {batch_body['total_matches']} total matches.",
                    "content": {
                        "batch_id": batch_body["batch_id"],
                        "total_entities": batch_body["total_entities"],
                        "total_matches": batch_body["total_matches"],
                        "flagged_entities": [r["entity_name"] for r in flagged],
                        "clear_entities": [r["entity_name"] for r in clear],
                    },
                },
            )
            assert evidence_resp.status_code == 200
            assert "evidence_id" in evidence_resp.json()
