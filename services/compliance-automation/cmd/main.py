"""
Compliance Automation Service
Policy-as-Code and continuous compliance scanning with PostgreSQL persistence
"""

import os
import json
import logging
import uuid
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncpg
from aiokafka import AIOKafkaProducer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================================
# Database Configuration
# ==================================
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://atlas:atlas_dev@localhost:5437/atlas")
db_url = DATABASE_URL.replace("postgres://", "postgresql://", 1)

pool = None


async def get_pool():
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10)
    return pool


# ==================================
# Kafka Producer Configuration
# ==================================
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "localhost:9093")

kafka_producer = None


async def get_kafka_producer():
    global kafka_producer
    if kafka_producer is None:
        kafka_producer = AIOKafkaProducer(
            bootstrap_servers=KAFKA_BROKERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        await kafka_producer.start()
    return kafka_producer


async def publish_event(topic: str, event: dict):
    try:
        producer = await get_kafka_producer()
        await producer.send_and_wait(topic, event)
        logger.info(f"Published event to {topic}: {event}")
    except Exception as e:
        logger.warning(f"Failed to publish event to {topic}: {e}")
        # Non-blocking: don't fail the request if Kafka is down


# ==================================
# Lifespan
# ==================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Compliance Automation service starting up...")
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            await conn.fetchval("SELECT 1")
        logger.info("Database connection pool established.")
    except Exception as e:
        logger.error(f"Could not connect to PostgreSQL: {e}")
    # Start Kafka producer
    try:
        await get_kafka_producer()
        logger.info("Kafka producer started.")
    except Exception as e:
        logger.warning(f"Could not start Kafka producer: {e}")
    yield
    logger.info("Compliance Automation service shutting down...")
    global kafka_producer
    if kafka_producer:
        await kafka_producer.stop()
        kafka_producer = None
        logger.info("Kafka producer stopped.")
    if pool:
        await pool.close()


# ==================================
# FastAPI App
# ==================================
app = FastAPI(
    title="ATLAS Compliance Automation Service",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================
# Pydantic Models
# ==================================
class CompliancePolicyCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    regulation: str  # "GDPR", "LGPD", "ISO27001", "SOC2"
    category: Optional[str] = None
    severity: str = "medium"
    rules: List[Dict[str, Any]] = []
    remediation_guidance: Optional[str] = None
    is_automated: bool = False


class CompliancePolicyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    rules: Optional[List[Dict[str, Any]]] = None
    remediation_guidance: Optional[str] = None
    is_active: Optional[bool] = None
    is_automated: Optional[bool] = None


class ComplianceScanCreate(BaseModel):
    policy_id: str
    scope: str  # "data", "api", "infrastructure", "network", "application"
    scope_target: Optional[str] = None


class ComplianceEvidenceCreate(BaseModel):
    policy_id: str
    scan_id: Optional[str] = None
    evidence_type: str  # "document", "screenshot", "log", "api_response", etc.
    title: str
    description: Optional[str] = None
    file_uri: Optional[str] = None
    content: Optional[Dict[str, Any]] = None


# ==================================
# API Routes
# ==================================
@app.get("/health")
async def health_check():
    status = {"status": "healthy", "service": "compliance-automation-service"}
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            await conn.fetchval("SELECT 1")
        status["database"] = "connected"
    except Exception:
        status["database"] = "disconnected"
        status["status"] = "degraded"
    return status


# ----- POLICIES -----

@app.post("/api/v1/compliance/policies")
async def create_policy(policy: CompliancePolicyCreate):
    """Create a new compliance policy"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO compliance_policies
                    (name, code, description, regulation, category, severity,
                     rules, remediation_guidance, is_automated, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
                RETURNING id, created_at
                """,
                policy.name,
                policy.code,
                policy.description,
                policy.regulation,
                policy.category,
                policy.severity,
                json.dumps(policy.rules),
                policy.remediation_guidance,
                policy.is_automated,
            )
        return {
            "policy_id": str(row["id"]),
            "name": policy.name,
            "code": policy.code,
            "regulation": policy.regulation,
            "status": "active",
            "created_at": row["created_at"].isoformat(),
        }
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail=f"Policy with code '{policy.code}' already exists")
    except Exception as e:
        logger.error(f"Failed to create policy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/compliance/policies")
async def list_policies(
    regulation: Optional[str] = None,
    severity: Optional[str] = None,
    active_only: bool = True,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List compliance policies with filtering"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            conditions = []
            params = []
            idx = 1

            if active_only:
                conditions.append(f"is_active = ${idx}")
                params.append(True)
                idx += 1
            if regulation:
                conditions.append(f"regulation = ${idx}")
                params.append(regulation)
                idx += 1
            if severity:
                conditions.append(f"severity = ${idx}")
                params.append(severity)
                idx += 1

            where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

            query = f"""
                SELECT id, name, code, description, regulation, category, severity,
                       rules, is_active, is_automated, version, created_at, updated_at
                FROM compliance_policies
                {where_clause}
                ORDER BY regulation, name
                LIMIT ${idx} OFFSET ${idx + 1}
            """
            params.extend([limit, offset])
            rows = await conn.fetch(query, *params)

            count_query = f"SELECT COUNT(*) FROM compliance_policies {where_clause}"
            total = await conn.fetchval(count_query, *params[:-2]) if params[:-2] else await conn.fetchval(count_query)

        return {
            "policies": [
                {
                    "policy_id": str(r["id"]),
                    "name": r["name"],
                    "code": r["code"],
                    "description": r["description"],
                    "regulation": r["regulation"],
                    "category": r["category"],
                    "severity": r["severity"],
                    "rules_count": len(json.loads(r["rules"])) if isinstance(r["rules"], str) else (len(r["rules"]) if r["rules"] else 0),
                    "is_active": r["is_active"],
                    "is_automated": r["is_automated"],
                    "version": r["version"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                }
                for r in rows
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Failed to list policies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/compliance/policies/{policy_id}")
async def get_policy(policy_id: str):
    """Get a specific compliance policy"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM compliance_policies WHERE id = $1",
                uuid.UUID(policy_id),
            )
            if not row:
                raise HTTPException(status_code=404, detail="Policy not found")

        rules = json.loads(row["rules"]) if isinstance(row["rules"], str) else (row["rules"] or [])
        return {
            "policy_id": str(row["id"]),
            "name": row["name"],
            "code": row["code"],
            "description": row["description"],
            "regulation": row["regulation"],
            "category": row["category"],
            "severity": row["severity"],
            "rules": rules,
            "remediation_guidance": row["remediation_guidance"],
            "is_active": row["is_active"],
            "is_automated": row["is_automated"],
            "version": row["version"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get policy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/v1/compliance/policies/{policy_id}")
async def update_policy(policy_id: str, update: CompliancePolicyUpdate):
    """Update a compliance policy"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            # Check exists
            existing = await conn.fetchrow(
                "SELECT id FROM compliance_policies WHERE id = $1",
                uuid.UUID(policy_id),
            )
            if not existing:
                raise HTTPException(status_code=404, detail="Policy not found")

            # Build dynamic update
            updates = []
            params = []
            idx = 1

            if update.name is not None:
                updates.append(f"name = ${idx}")
                params.append(update.name)
                idx += 1
            if update.description is not None:
                updates.append(f"description = ${idx}")
                params.append(update.description)
                idx += 1
            if update.severity is not None:
                updates.append(f"severity = ${idx}")
                params.append(update.severity)
                idx += 1
            if update.rules is not None:
                updates.append(f"rules = ${idx}")
                params.append(json.dumps(update.rules))
                idx += 1
            if update.remediation_guidance is not None:
                updates.append(f"remediation_guidance = ${idx}")
                params.append(update.remediation_guidance)
                idx += 1
            if update.is_active is not None:
                updates.append(f"is_active = ${idx}")
                params.append(update.is_active)
                idx += 1
            if update.is_automated is not None:
                updates.append(f"is_automated = ${idx}")
                params.append(update.is_automated)
                idx += 1

            if not updates:
                raise HTTPException(status_code=400, detail="No fields to update")

            updates.append("updated_at = CURRENT_TIMESTAMP")
            updates.append(f"version = version + 1")

            set_clause = ", ".join(updates)
            params.append(uuid.UUID(policy_id))

            await conn.execute(
                f"UPDATE compliance_policies SET {set_clause} WHERE id = ${idx}",
                *params,
            )

        return {"message": "Policy updated", "policy_id": policy_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update policy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v1/compliance/policies/{policy_id}")
async def delete_policy(policy_id: str):
    """Soft-delete a compliance policy (deactivate)"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            result = await conn.execute(
                "UPDATE compliance_policies SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                uuid.UUID(policy_id),
            )
            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Policy not found")
        return {"message": "Policy deactivated", "policy_id": policy_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete policy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ----- SCANS -----

@app.post("/api/v1/compliance/scan")
async def run_compliance_scan(scan: ComplianceScanCreate):
    """Run a compliance scan against a policy"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            # Verify policy exists
            policy = await conn.fetchrow(
                "SELECT id, name, rules, severity FROM compliance_policies WHERE id = $1 AND is_active = true",
                uuid.UUID(scan.policy_id),
            )
            if not policy:
                raise HTTPException(status_code=404, detail="Active policy not found")

            start_time = datetime.utcnow()

            # Simulate running compliance checks based on rules
            rules = json.loads(policy["rules"]) if isinstance(policy["rules"], str) else (policy["rules"] or [])
            total_checks = len(rules) if rules else 10
            passed = int(total_checks * 0.9)
            failed = total_checks - passed
            warnings = max(0, failed - 1)
            failed = max(0, failed - warnings)

            findings = []
            for i in range(failed):
                findings.append({
                    "rule_id": f"rule-{i + 1}",
                    "severity": "high" if i == 0 else "medium",
                    "message": f"Check failed for rule {i + 1}",
                    "resource": scan.scope_target or scan.scope,
                })
            for i in range(warnings):
                findings.append({
                    "rule_id": f"rule-warn-{i + 1}",
                    "severity": "low",
                    "message": f"Warning for rule {i + 1}",
                    "resource": scan.scope_target or scan.scope,
                })

            end_time = datetime.utcnow()
            duration_ms = int((end_time - start_time).total_seconds() * 1000)
            scan_result = "pass" if failed == 0 else "fail"
            score = round((passed / total_checks) * 100, 2) if total_checks > 0 else 100.0

            row = await conn.fetchrow(
                """
                INSERT INTO compliance_scans
                    (policy_id, scope, scope_target, status, result, findings_count,
                     findings, score, started_at, completed_at, duration_ms)
                VALUES ($1, $2, $3, 'completed', $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, created_at
                """,
                uuid.UUID(scan.policy_id),
                scan.scope,
                scan.scope_target,
                scan_result,
                len(findings),
                json.dumps(findings),
                score,
                start_time,
                end_time,
                duration_ms,
            )

        # Publish scan completed event to Kafka
        await publish_event("atlas.compliance.scan_completed", {
            "scan_id": str(row["id"]),
            "policy_id": scan.policy_id,
            "status": "completed",
            "score": score,
            "findings_count": len(findings),
            "timestamp": datetime.utcnow().isoformat(),
        })

        return {
            "scan_id": str(row["id"]),
            "policy_id": scan.policy_id,
            "scope": scan.scope,
            "status": "completed",
            "result": scan_result,
            "score": score,
            "results": {
                "total_checks": total_checks,
                "passed": passed,
                "failed": failed,
                "warnings": warnings,
            },
            "findings": findings,
            "started_at": start_time.isoformat(),
            "completed_at": end_time.isoformat(),
            "duration_ms": duration_ms,
            "created_at": row["created_at"].isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/compliance/scan/{scan_id}")
async def get_scan_results(scan_id: str):
    """Get compliance scan results"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT cs.*, cp.name AS policy_name, cp.regulation
                FROM compliance_scans cs
                JOIN compliance_policies cp ON cs.policy_id = cp.id
                WHERE cs.id = $1
                """,
                uuid.UUID(scan_id),
            )
            if not row:
                raise HTTPException(status_code=404, detail="Scan not found")

        findings = json.loads(row["findings"]) if isinstance(row["findings"], str) else (row["findings"] or [])
        return {
            "scan_id": str(row["id"]),
            "policy_id": str(row["policy_id"]),
            "policy_name": row["policy_name"],
            "regulation": row["regulation"],
            "scope": row["scope"],
            "scope_target": row["scope_target"],
            "status": row["status"],
            "result": row["result"],
            "score": float(row["score"]) if row["score"] is not None else None,
            "findings_count": row["findings_count"],
            "findings": findings,
            "started_at": row["started_at"].isoformat() if row["started_at"] else None,
            "completed_at": row["completed_at"].isoformat() if row["completed_at"] else None,
            "duration_ms": row["duration_ms"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get scan results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/compliance/scans")
async def list_scans(
    policy_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List compliance scans"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            conditions = []
            params = []
            idx = 1

            if policy_id:
                conditions.append(f"cs.policy_id = ${idx}")
                params.append(uuid.UUID(policy_id))
                idx += 1
            if status:
                conditions.append(f"cs.status = ${idx}")
                params.append(status)
                idx += 1

            where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

            query = f"""
                SELECT cs.id, cs.policy_id, cp.name AS policy_name, cp.regulation,
                       cs.scope, cs.status, cs.result, cs.score, cs.findings_count,
                       cs.started_at, cs.completed_at, cs.created_at
                FROM compliance_scans cs
                JOIN compliance_policies cp ON cs.policy_id = cp.id
                {where_clause}
                ORDER BY cs.created_at DESC
                LIMIT ${idx} OFFSET ${idx + 1}
            """
            params.extend([limit, offset])
            rows = await conn.fetch(query, *params)

            count_query = f"SELECT COUNT(*) FROM compliance_scans cs {where_clause}"
            total = await conn.fetchval(count_query, *params[:-2]) if params[:-2] else await conn.fetchval(count_query)

        return {
            "scans": [
                {
                    "scan_id": str(r["id"]),
                    "policy_id": str(r["policy_id"]),
                    "policy_name": r["policy_name"],
                    "regulation": r["regulation"],
                    "scope": r["scope"],
                    "status": r["status"],
                    "result": r["result"],
                    "score": float(r["score"]) if r["score"] is not None else None,
                    "findings_count": r["findings_count"],
                    "started_at": r["started_at"].isoformat() if r["started_at"] else None,
                    "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                }
                for r in rows
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Failed to list scans: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ----- EVIDENCE -----

@app.post("/api/v1/compliance/evidence")
async def create_evidence(evidence: ComplianceEvidenceCreate):
    """Create a compliance evidence record"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            # Verify policy exists
            policy = await conn.fetchrow(
                "SELECT id FROM compliance_policies WHERE id = $1",
                uuid.UUID(evidence.policy_id),
            )
            if not policy:
                raise HTTPException(status_code=404, detail="Policy not found")

            scan_uuid = uuid.UUID(evidence.scan_id) if evidence.scan_id else None

            row = await conn.fetchrow(
                """
                INSERT INTO compliance_evidence
                    (scan_id, policy_id, evidence_type, title, description, file_uri, content, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
                RETURNING id, created_at
                """,
                scan_uuid,
                uuid.UUID(evidence.policy_id),
                evidence.evidence_type,
                evidence.title,
                evidence.description,
                evidence.file_uri,
                json.dumps(evidence.content) if evidence.content else None,
            )

        return {
            "evidence_id": str(row["id"]),
            "policy_id": evidence.policy_id,
            "title": evidence.title,
            "evidence_type": evidence.evidence_type,
            "status": "pending",
            "created_at": row["created_at"].isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create evidence: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/compliance/evidence")
async def list_evidence(
    policy_id: Optional[str] = None,
    scan_id: Optional[str] = None,
    evidence_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List compliance evidence records"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            conditions = []
            params = []
            idx = 1

            if policy_id:
                conditions.append(f"ce.policy_id = ${idx}")
                params.append(uuid.UUID(policy_id))
                idx += 1
            if scan_id:
                conditions.append(f"ce.scan_id = ${idx}")
                params.append(uuid.UUID(scan_id))
                idx += 1
            if evidence_type:
                conditions.append(f"ce.evidence_type = ${idx}")
                params.append(evidence_type)
                idx += 1

            where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

            query = f"""
                SELECT ce.id, ce.scan_id, ce.policy_id, cp.name AS policy_name,
                       ce.evidence_type, ce.title, ce.description, ce.status,
                       ce.collected_at, ce.expires_at, ce.created_at
                FROM compliance_evidence ce
                JOIN compliance_policies cp ON ce.policy_id = cp.id
                {where_clause}
                ORDER BY ce.created_at DESC
                LIMIT ${idx} OFFSET ${idx + 1}
            """
            params.extend([limit, offset])
            rows = await conn.fetch(query, *params)

            count_query = f"SELECT COUNT(*) FROM compliance_evidence ce {where_clause}"
            total = await conn.fetchval(count_query, *params[:-2]) if params[:-2] else await conn.fetchval(count_query)

        return {
            "evidence": [
                {
                    "evidence_id": str(r["id"]),
                    "scan_id": str(r["scan_id"]) if r["scan_id"] else None,
                    "policy_id": str(r["policy_id"]),
                    "policy_name": r["policy_name"],
                    "evidence_type": r["evidence_type"],
                    "title": r["title"],
                    "description": r["description"],
                    "status": r["status"],
                    "collected_at": r["collected_at"].isoformat() if r["collected_at"] else None,
                    "expires_at": r["expires_at"].isoformat() if r["expires_at"] else None,
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                }
                for r in rows
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Failed to list evidence: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/compliance/evidence/generate")
async def generate_evidence(regulation: str, period_start: str, period_end: str):
    """Generate compliance evidence summary for a regulation and time period"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            # Get all scans for this regulation in the period
            scans = await conn.fetch(
                """
                SELECT cs.id, cs.result, cs.score, cs.findings_count, cs.completed_at,
                       cp.name AS policy_name
                FROM compliance_scans cs
                JOIN compliance_policies cp ON cs.policy_id = cp.id
                WHERE cp.regulation = $1
                  AND cs.completed_at >= $2::timestamp
                  AND cs.completed_at <= $3::timestamp
                  AND cs.status = 'completed'
                ORDER BY cs.completed_at DESC
                """,
                regulation,
                period_start,
                period_end,
            )

            # Get evidence for this regulation
            evidence_rows = await conn.fetch(
                """
                SELECT ce.id, ce.evidence_type, ce.title, ce.status
                FROM compliance_evidence ce
                JOIN compliance_policies cp ON ce.policy_id = cp.id
                WHERE cp.regulation = $1
                  AND ce.collected_at >= $2::timestamp
                  AND ce.collected_at <= $3::timestamp
                ORDER BY ce.collected_at DESC
                """,
                regulation,
                period_start,
                period_end,
            )

        total_scans = len(scans)
        passed_scans = sum(1 for s in scans if s["result"] == "pass")
        avg_score = (
            sum(float(s["score"]) for s in scans if s["score"] is not None) / total_scans
            if total_scans > 0
            else 0
        )

        evidence_id = str(uuid.uuid4())
        return {
            "evidence_id": evidence_id,
            "regulation": regulation,
            "period": {"start": period_start, "end": period_end},
            "summary": {
                "total_scans": total_scans,
                "passed_scans": passed_scans,
                "failed_scans": total_scans - passed_scans,
                "average_score": round(avg_score, 2),
                "evidence_items": len(evidence_rows),
            },
            "scans": [
                {
                    "scan_id": str(s["id"]),
                    "policy_name": s["policy_name"],
                    "result": s["result"],
                    "score": float(s["score"]) if s["score"] is not None else None,
                    "completed_at": s["completed_at"].isoformat() if s["completed_at"] else None,
                }
                for s in scans
            ],
            "evidence_types": list(set(e["evidence_type"] for e in evidence_rows)),
            "generated_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Evidence generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ----- COMPLIANCE STATUS -----

@app.get("/api/v1/compliance/status")
async def get_compliance_status():
    """Get overall compliance status across all regulations"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            # Get regulations with their latest scan results
            regulations = await conn.fetch(
                """
                SELECT DISTINCT cp.regulation,
                    (SELECT cs.result FROM compliance_scans cs
                     WHERE cs.policy_id = cp.id AND cs.status = 'completed'
                     ORDER BY cs.completed_at DESC LIMIT 1) AS last_result,
                    (SELECT cs.score FROM compliance_scans cs
                     WHERE cs.policy_id = cp.id AND cs.status = 'completed'
                     ORDER BY cs.completed_at DESC LIMIT 1) AS last_score,
                    (SELECT cs.completed_at FROM compliance_scans cs
                     WHERE cs.policy_id = cp.id AND cs.status = 'completed'
                     ORDER BY cs.completed_at DESC LIMIT 1) AS last_scan,
                    (SELECT cs.findings_count FROM compliance_scans cs
                     WHERE cs.policy_id = cp.id AND cs.status = 'completed'
                     ORDER BY cs.completed_at DESC LIMIT 1) AS violations
                FROM compliance_policies cp
                WHERE cp.is_active = true
                GROUP BY cp.regulation, cp.id
                """
            )

            # Aggregate by regulation
            reg_map = {}
            for r in regulations:
                reg = r["regulation"]
                if reg not in reg_map:
                    reg_map[reg] = {
                        "regulation": reg,
                        "status": "compliant",
                        "last_scan": None,
                        "violations": 0,
                        "avg_score": 0,
                        "scan_count": 0,
                    }
                if r["last_result"] == "fail":
                    reg_map[reg]["status"] = "non_compliant"
                if r["last_scan"]:
                    if reg_map[reg]["last_scan"] is None or r["last_scan"] > reg_map[reg]["last_scan"]:
                        reg_map[reg]["last_scan"] = r["last_scan"]
                reg_map[reg]["violations"] += r["violations"] or 0
                if r["last_score"] is not None:
                    reg_map[reg]["avg_score"] += float(r["last_score"])
                    reg_map[reg]["scan_count"] += 1

            regulation_statuses = []
            all_compliant = True
            for reg_data in reg_map.values():
                if reg_data["scan_count"] > 0:
                    reg_data["avg_score"] = round(reg_data["avg_score"] / reg_data["scan_count"], 2)
                if reg_data["status"] != "compliant":
                    all_compliant = False
                regulation_statuses.append({
                    "regulation": reg_data["regulation"],
                    "status": reg_data["status"],
                    "last_scan": reg_data["last_scan"].isoformat() if reg_data["last_scan"] else None,
                    "violations": reg_data["violations"],
                    "avg_score": reg_data["avg_score"],
                })

        return {
            "overall_status": "compliant" if all_compliant else "non_compliant",
            "regulations": regulation_statuses,
            "last_updated": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Failed to get compliance status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8101"))
    uvicorn.run(app, host="0.0.0.0", port=port)
