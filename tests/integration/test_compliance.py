"""
Integration tests for the Compliance Automation Service.

These tests hit the compliance-automation service directly
(default http://localhost:8101). They require the service and PostgreSQL.
"""

import pytest
import httpx
import uuid as uuid_mod

from tests.conftest import COMPLIANCE_SERVICE_URL


pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unique_code() -> str:
    """Generate a unique policy code to avoid conflicts between test runs."""
    return f"TEST-{uuid_mod.uuid4().hex[:8].upper()}"


def _policy_payload(**overrides) -> dict:
    """Return a valid compliance policy creation payload."""
    payload = {
        "name": "Test Data Encryption Policy",
        "code": _unique_code(),
        "description": "Integration test policy for data encryption at rest",
        "regulation": "GDPR",
        "category": "data_protection",
        "severity": "high",
        "rules": [
            {"id": "rule-1", "check": "encryption_at_rest", "expected": True},
            {"id": "rule-2", "check": "key_rotation_days", "expected": 90},
            {"id": "rule-3", "check": "algorithm", "expected": "AES-256"},
        ],
        "remediation_guidance": "Enable AES-256 encryption at rest for all data stores.",
        "is_automated": True,
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestComplianceHealth:
    """Service health checks."""

    async def test_health_check(self, compliance_client: httpx.AsyncClient):
        response = await compliance_client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] in ("healthy", "degraded")
        assert body["service"] == "compliance-automation-service"


class TestCompliancePolicies:
    """CRUD operations on compliance policies."""

    async def test_create_policy(self, compliance_client: httpx.AsyncClient):
        payload = _policy_payload()
        response = await compliance_client.post("/api/v1/compliance/policies", json=payload)
        assert response.status_code == 200
        body = response.json()

        assert "policy_id" in body
        assert body["name"] == payload["name"]
        assert body["code"] == payload["code"]
        assert body["regulation"] == "GDPR"
        assert body["status"] == "active"
        assert "created_at" in body

    async def test_create_duplicate_code_returns_409(self, compliance_client: httpx.AsyncClient):
        payload = _policy_payload()
        # First creation should succeed
        resp1 = await compliance_client.post("/api/v1/compliance/policies", json=payload)
        assert resp1.status_code == 200

        # Duplicate code should conflict
        resp2 = await compliance_client.post("/api/v1/compliance/policies", json=payload)
        assert resp2.status_code == 409

    async def test_create_and_list_policies(self, compliance_client: httpx.AsyncClient):
        # Create a policy with a known regulation
        payload = _policy_payload(regulation="SOC2")
        create_resp = await compliance_client.post("/api/v1/compliance/policies", json=payload)
        assert create_resp.status_code == 200

        # List all policies
        list_resp = await compliance_client.get(
            "/api/v1/compliance/policies", params={"limit": 50}
        )
        assert list_resp.status_code == 200
        body = list_resp.json()

        assert "policies" in body
        assert isinstance(body["policies"], list)
        assert body["total"] >= 1

        # Verify structure
        policy = body["policies"][0]
        assert "policy_id" in policy
        assert "name" in policy
        assert "code" in policy
        assert "regulation" in policy
        assert "severity" in policy

    async def test_list_policies_filter_by_regulation(self, compliance_client: httpx.AsyncClient):
        # Create with ISO27001
        payload = _policy_payload(regulation="ISO27001")
        await compliance_client.post("/api/v1/compliance/policies", json=payload)

        response = await compliance_client.get(
            "/api/v1/compliance/policies", params={"regulation": "ISO27001"}
        )
        assert response.status_code == 200
        body = response.json()
        for policy in body["policies"]:
            assert policy["regulation"] == "ISO27001"

    async def test_get_policy_by_id(self, compliance_client: httpx.AsyncClient):
        # Create
        payload = _policy_payload()
        create_resp = await compliance_client.post("/api/v1/compliance/policies", json=payload)
        assert create_resp.status_code == 200
        policy_id = create_resp.json()["policy_id"]

        # Fetch
        get_resp = await compliance_client.get(f"/api/v1/compliance/policies/{policy_id}")
        assert get_resp.status_code == 200
        body = get_resp.json()
        assert body["policy_id"] == policy_id
        assert body["name"] == payload["name"]
        assert body["code"] == payload["code"]
        assert isinstance(body["rules"], list)
        assert len(body["rules"]) == 3

    async def test_get_nonexistent_policy_returns_404(self, compliance_client: httpx.AsyncClient):
        response = await compliance_client.get(
            "/api/v1/compliance/policies/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404

    async def test_update_policy(self, compliance_client: httpx.AsyncClient):
        # Create
        payload = _policy_payload()
        create_resp = await compliance_client.post("/api/v1/compliance/policies", json=payload)
        policy_id = create_resp.json()["policy_id"]

        # Update
        update_resp = await compliance_client.put(
            f"/api/v1/compliance/policies/{policy_id}",
            json={"severity": "critical", "description": "Updated by test"},
        )
        assert update_resp.status_code == 200

        # Verify
        get_resp = await compliance_client.get(f"/api/v1/compliance/policies/{policy_id}")
        body = get_resp.json()
        assert body["severity"] == "critical"
        assert body["description"] == "Updated by test"
        assert body["version"] >= 2  # version incremented

    async def test_delete_policy_deactivates(self, compliance_client: httpx.AsyncClient):
        # Create
        payload = _policy_payload()
        create_resp = await compliance_client.post("/api/v1/compliance/policies", json=payload)
        policy_id = create_resp.json()["policy_id"]

        # Delete (soft-delete)
        del_resp = await compliance_client.delete(f"/api/v1/compliance/policies/{policy_id}")
        assert del_resp.status_code == 200

        # Verify deactivated
        get_resp = await compliance_client.get(f"/api/v1/compliance/policies/{policy_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["is_active"] is False


class TestComplianceScans:
    """Run compliance scans and verify results."""

    async def test_run_scan(self, compliance_client: httpx.AsyncClient):
        # Create a policy first
        payload = _policy_payload(
            rules=[
                {"id": "r1", "check": "encryption", "expected": True},
                {"id": "r2", "check": "audit_log", "expected": True},
                {"id": "r3", "check": "access_control", "expected": "RBAC"},
                {"id": "r4", "check": "data_retention", "expected": 365},
                {"id": "r5", "check": "backup_frequency", "expected": "daily"},
            ]
        )
        create_resp = await compliance_client.post("/api/v1/compliance/policies", json=payload)
        assert create_resp.status_code == 200
        policy_id = create_resp.json()["policy_id"]

        # Run scan
        scan_payload = {
            "policy_id": policy_id,
            "scope": "infrastructure",
            "scope_target": "production-db",
        }
        scan_resp = await compliance_client.post("/api/v1/compliance/scan", json=scan_payload)
        assert scan_resp.status_code == 200
        body = scan_resp.json()

        assert "scan_id" in body
        assert body["policy_id"] == policy_id
        assert body["scope"] == "infrastructure"
        assert body["status"] == "completed"
        assert body["result"] in ("pass", "fail")
        assert "score" in body
        assert 0 <= body["score"] <= 100

        results = body["results"]
        assert "total_checks" in results
        assert "passed" in results
        assert "failed" in results
        assert "warnings" in results
        assert results["total_checks"] == results["passed"] + results["failed"] + results["warnings"]

    async def test_scan_nonexistent_policy_returns_404(self, compliance_client: httpx.AsyncClient):
        scan_payload = {
            "policy_id": "00000000-0000-0000-0000-000000000000",
            "scope": "data",
        }
        response = await compliance_client.post("/api/v1/compliance/scan", json=scan_payload)
        assert response.status_code == 404

    async def test_get_scan_results(self, compliance_client: httpx.AsyncClient):
        # Create policy + run scan
        policy_payload = _policy_payload()
        create_resp = await compliance_client.post("/api/v1/compliance/policies", json=policy_payload)
        policy_id = create_resp.json()["policy_id"]

        scan_resp = await compliance_client.post(
            "/api/v1/compliance/scan",
            json={"policy_id": policy_id, "scope": "api"},
        )
        scan_id = scan_resp.json()["scan_id"]

        # Fetch scan results
        get_resp = await compliance_client.get(f"/api/v1/compliance/scan/{scan_id}")
        assert get_resp.status_code == 200
        body = get_resp.json()

        assert body["scan_id"] == scan_id
        assert body["policy_id"] == policy_id
        assert "policy_name" in body
        assert "regulation" in body
        assert "findings" in body
        assert isinstance(body["findings"], list)

    async def test_list_scans(self, compliance_client: httpx.AsyncClient):
        response = await compliance_client.get("/api/v1/compliance/scans", params={"limit": 10})
        assert response.status_code == 200
        body = response.json()

        assert "scans" in body
        assert isinstance(body["scans"], list)
        assert "total" in body


class TestComplianceEvidence:
    """Create and list evidence records."""

    async def test_generate_evidence(self, compliance_client: httpx.AsyncClient):
        # Create policy and run scan
        policy_payload = _policy_payload(regulation="LGPD")
        create_resp = await compliance_client.post("/api/v1/compliance/policies", json=policy_payload)
        policy_id = create_resp.json()["policy_id"]

        scan_resp = await compliance_client.post(
            "/api/v1/compliance/scan",
            json={"policy_id": policy_id, "scope": "data"},
        )
        scan_id = scan_resp.json()["scan_id"]

        # Create evidence
        evidence_payload = {
            "policy_id": policy_id,
            "scan_id": scan_id,
            "evidence_type": "api_response",
            "title": "Encryption Verification Evidence",
            "description": "Verified AES-256 encryption on production database.",
            "content": {"verified": True, "algorithm": "AES-256", "key_size": 256},
        }
        evidence_resp = await compliance_client.post("/api/v1/compliance/evidence", json=evidence_payload)
        assert evidence_resp.status_code == 200
        body = evidence_resp.json()

        assert "evidence_id" in body
        assert body["policy_id"] == policy_id
        assert body["title"] == "Encryption Verification Evidence"
        assert body["evidence_type"] == "api_response"
        assert body["status"] == "pending"

    async def test_list_evidence(self, compliance_client: httpx.AsyncClient):
        response = await compliance_client.get("/api/v1/compliance/evidence", params={"limit": 10})
        assert response.status_code == 200
        body = response.json()

        assert "evidence" in body
        assert isinstance(body["evidence"], list)
        assert "total" in body

    async def test_create_evidence_for_nonexistent_policy_returns_404(
        self, compliance_client: httpx.AsyncClient
    ):
        payload = {
            "policy_id": "00000000-0000-0000-0000-000000000000",
            "evidence_type": "document",
            "title": "Test",
        }
        response = await compliance_client.post("/api/v1/compliance/evidence", json=payload)
        assert response.status_code == 404


class TestComplianceStatus:
    """Verify the overall compliance status endpoint."""

    async def test_compliance_status(self, compliance_client: httpx.AsyncClient):
        response = await compliance_client.get("/api/v1/compliance/status")
        assert response.status_code == 200
        body = response.json()

        assert "overall_status" in body
        assert body["overall_status"] in ("compliant", "non_compliant")
        assert "regulations" in body
        assert isinstance(body["regulations"], list)
        assert "last_updated" in body

        if body["regulations"]:
            reg = body["regulations"][0]
            assert "regulation" in reg
            assert "status" in reg
            assert reg["status"] in ("compliant", "non_compliant")


class TestGenerateEvidenceSummary:
    """Test evidence generation/summary endpoint."""

    async def test_generate_evidence_summary(self, compliance_client: httpx.AsyncClient):
        # Create a policy and run a scan so the query returns data
        policy_payload = _policy_payload(regulation="GDPR")
        create_resp = await compliance_client.post("/api/v1/compliance/policies", json=policy_payload)
        policy_id = create_resp.json()["policy_id"]

        await compliance_client.post(
            "/api/v1/compliance/scan",
            json={"policy_id": policy_id, "scope": "data"},
        )

        response = await compliance_client.post(
            "/api/v1/compliance/evidence/generate",
            params={
                "regulation": "GDPR",
                "period_start": "2020-01-01T00:00:00",
                "period_end": "2030-12-31T23:59:59",
            },
        )
        assert response.status_code == 200
        body = response.json()

        assert "evidence_id" in body
        assert body["regulation"] == "GDPR"
        assert "summary" in body
        summary = body["summary"]
        assert "total_scans" in summary
        assert "passed_scans" in summary
        assert "failed_scans" in summary
        assert "average_score" in summary
        assert "generated_at" in body
