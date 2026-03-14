"""
Scenario Simulation Service
Strategic scenario simulation engine with Monte Carlo and agent-based modeling
"""

import os
import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
from datetime import datetime
import uuid
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
    logger.info("Scenario Simulation service starting up...")
    p = await get_pool()
    logger.info("Database connection pool established.")
    # Start Kafka producer
    try:
        await get_kafka_producer()
        logger.info("Kafka producer started.")
    except Exception as e:
        logger.warning(f"Could not start Kafka producer: {e}")
    yield
    logger.info("Scenario Simulation service shutting down...")
    # Stop Kafka producer
    global kafka_producer
    if kafka_producer:
        await kafka_producer.stop()
        kafka_producer = None
        logger.info("Kafka producer stopped.")
    if p:
        await p.close()
        logger.info("Database connection pool closed.")


# ==================================
# FastAPI App
# ==================================
app = FastAPI(
    title="ATLAS Scenario Simulation Service",
    version="1.0.0",
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
# Models
# ==================================
class ScenarioInput(BaseModel):
    name: str
    description: Optional[str] = None
    variables: Dict[str, Any]
    constraints: Optional[Dict[str, Any]] = None
    simulation_type: str = "monte_carlo"  # "monte_carlo" or "agent_based"
    iterations: int = 1000
    time_horizon_days: int = 90


class SimulationResult(BaseModel):
    simulation_id: str
    scenario_name: str
    status: str
    results: Dict[str, Any]
    metrics: Dict[str, float]
    created_at: str


class AgentConfig(BaseModel):
    agent_type: str  # "defender", "attacker", "neutral"
    behavior_model: str
    parameters: Dict[str, Any]


# ==================================
# Simulation Logic (unchanged)
# ==================================
def run_monte_carlo_simulation(scenario: ScenarioInput) -> Dict[str, Any]:
    """Run Monte Carlo simulation"""
    np.random.seed(42)

    risk_scores = []
    outcomes = []

    for _ in range(scenario.iterations):
        base_risk = scenario.variables.get("base_risk", 0.5)
        volatility = scenario.variables.get("volatility", 0.1)

        risk_score = np.clip(base_risk + np.random.normal(0, volatility), 0, 1)
        risk_scores.append(float(risk_score))

        if risk_score > 0.7:
            outcomes.append("high_risk")
        elif risk_score > 0.4:
            outcomes.append("medium_risk")
        else:
            outcomes.append("low_risk")

    return {
        "risk_scores": risk_scores[:100],
        "outcomes": outcomes[:100],
        "statistics": {
            "mean": float(np.mean(risk_scores)),
            "std": float(np.std(risk_scores)),
            "min": float(np.min(risk_scores)),
            "max": float(np.max(risk_scores)),
            "percentiles": {
                "p10": float(np.percentile(risk_scores, 10)),
                "p50": float(np.percentile(risk_scores, 50)),
                "p90": float(np.percentile(risk_scores, 90)),
            },
        },
        "outcome_distribution": {
            "high_risk": outcomes.count("high_risk"),
            "medium_risk": outcomes.count("medium_risk"),
            "low_risk": outcomes.count("low_risk"),
        },
    }


def run_agent_based_simulation(scenario: ScenarioInput) -> Dict[str, Any]:
    """Run agent-based simulation"""
    np.random.seed(42)

    agents = scenario.variables.get("agents", [])
    if not agents:
        agents = ["defender", "attacker", "neutral"]

    interactions = []
    for i in range(min(scenario.iterations, 100)):
        interaction = {
            "step": i,
            "agents": agents,
            "action": str(np.random.choice(["cooperate", "defect", "neutral"])),
            "outcome": float(np.random.uniform(0, 1)),
        }
        interactions.append(interaction)

    return {
        "interactions": interactions,
        "agent_performance": {
            agent: float(np.random.uniform(0.5, 0.9)) for agent in agents
        },
        "equilibrium_reached": True,
        "final_state": "stable",
    }


# ==================================
# Helper: convert asyncpg Record to dict
# ==================================
def record_to_dict(record: asyncpg.Record) -> dict:
    d = dict(record)
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
        elif isinstance(v, uuid.UUID):
            d[k] = str(v)
    return d


# ==================================
# API Routes
# ==================================
@app.get("/health")
async def health_check():
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {"status": "healthy", "service": "scenario-simulation-service", "database": "connected"}
    except Exception:
        return {"status": "degraded", "service": "scenario-simulation-service", "database": "disconnected"}


@app.post("/api/v1/simulations/scenarios")
async def create_scenario(scenario: ScenarioInput):
    """Create and run a scenario simulation"""
    try:
        p = await get_pool()
        start_time = datetime.utcnow()

        # 1. Run the simulation
        if scenario.simulation_type == "monte_carlo":
            results = run_monte_carlo_simulation(scenario)
        else:
            results = run_agent_based_simulation(scenario)

        risk_score = float(np.mean(results.get("risk_scores", [0.5])))
        confidence = 0.82
        end_time = datetime.utcnow()
        duration_ms = int((end_time - start_time).total_seconds() * 1000)

        async with p.acquire() as conn:
            async with conn.transaction():
                # 2. Save the scenario
                scenario_row = await conn.fetchrow(
                    """
                    INSERT INTO scenarios (name, description, scenario_type, status, parameters)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, created_at
                    """,
                    scenario.name,
                    scenario.description,
                    scenario.simulation_type,
                    "active",
                    json.dumps({
                        "variables": scenario.variables,
                        "constraints": scenario.constraints,
                        "iterations": scenario.iterations,
                        "time_horizon_days": scenario.time_horizon_days,
                    }),
                )
                scenario_id = scenario_row["id"]

                # 3. Save the simulation run
                run_row = await conn.fetchrow(
                    """
                    INSERT INTO simulation_runs
                        (scenario_id, run_number, status, parameters, started_at, completed_at, duration_ms)
                    VALUES ($1, 1, 'completed', $2, $3, $4, $5)
                    RETURNING id
                    """,
                    scenario_id,
                    json.dumps({"iterations": scenario.iterations}),
                    start_time,
                    end_time,
                    duration_ms,
                )
                run_id = run_row["id"]

                # 4. Save the simulation results
                await conn.execute(
                    """
                    INSERT INTO simulation_results (run_id, result_type, label, value, confidence, data)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    run_id,
                    scenario.simulation_type,
                    "risk_score",
                    round(risk_score, 6),
                    round(confidence, 4),
                    json.dumps(results),
                )

        # Publish simulation completed event to Kafka
        await publish_event("atlas.simulations.completed", {
            "simulation_id": str(run_id),
            "scenario_name": scenario.name,
            "status": "completed",
            "risk_score": round(risk_score, 6),
            "timestamp": datetime.utcnow().isoformat(),
        })

        return {
            "simulation_id": str(run_id),
            "scenario_id": str(scenario_id),
            "scenario_name": scenario.name,
            "status": "completed",
            "results": results,
            "metrics": {
                "risk_score": risk_score,
                "confidence": confidence,
                "iterations": scenario.iterations,
            },
            "created_at": scenario_row["created_at"].isoformat(),
        }
    except Exception as e:
        logger.error(f"Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/simulations/{simulation_id}")
async def get_simulation(simulation_id: str):
    """Get simulation results by run id"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT
                    sr.id AS run_id,
                    sr.status,
                    sr.started_at,
                    sr.completed_at,
                    sr.duration_ms,
                    sr.parameters AS run_parameters,
                    s.id AS scenario_id,
                    s.name AS scenario_name,
                    s.scenario_type,
                    s.description
                FROM simulation_runs sr
                JOIN scenarios s ON sr.scenario_id = s.id
                WHERE sr.id = $1
                """,
                uuid.UUID(simulation_id),
            )
            if row is None:
                raise HTTPException(status_code=404, detail="Simulation not found")

            results = await conn.fetch(
                """
                SELECT result_type, label, value, confidence, data, created_at
                FROM simulation_results
                WHERE run_id = $1
                ORDER BY created_at
                """,
                uuid.UUID(simulation_id),
            )

        return {
            "simulation_id": str(row["run_id"]),
            "scenario_id": str(row["scenario_id"]),
            "scenario_name": row["scenario_name"],
            "scenario_type": row["scenario_type"],
            "description": row["description"],
            "status": row["status"],
            "started_at": row["started_at"].isoformat() if row["started_at"] else None,
            "completed_at": row["completed_at"].isoformat() if row["completed_at"] else None,
            "duration_ms": row["duration_ms"],
            "results": [
                {
                    "result_type": r["result_type"],
                    "label": r["label"],
                    "value": float(r["value"]) if r["value"] is not None else None,
                    "confidence": float(r["confidence"]) if r["confidence"] is not None else None,
                    "data": json.loads(r["data"]) if isinstance(r["data"], str) else r["data"],
                }
                for r in results
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/simulations")
async def list_simulations(limit: int = 10, offset: int = 0):
    """List recent simulations"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    sr.id AS run_id,
                    sr.status,
                    sr.started_at,
                    sr.completed_at,
                    sr.duration_ms,
                    s.name AS scenario_name,
                    s.scenario_type,
                    sr.created_at
                FROM simulation_runs sr
                JOIN scenarios s ON sr.scenario_id = s.id
                ORDER BY sr.created_at DESC
                LIMIT $1 OFFSET $2
                """,
                limit,
                offset,
            )

            total = await conn.fetchval("SELECT COUNT(*) FROM simulation_runs")

        return {
            "simulations": [
                {
                    "simulation_id": str(r["run_id"]),
                    "scenario_name": r["scenario_name"],
                    "scenario_type": r["scenario_type"],
                    "status": r["status"],
                    "duration_ms": r["duration_ms"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                }
                for r in rows
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Failed to list simulations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/simulations/compare")
async def compare_scenarios(scenarios: List[ScenarioInput]):
    """Compare multiple scenarios"""
    try:
        results = []
        for scenario in scenarios:
            result = await create_scenario(scenario)
            results.append(result)

        comparison = {
            "scenarios": [r["scenario_name"] for r in results],
            "risk_scores": [r["metrics"]["risk_score"] for r in results],
            "recommendation": (
                "scenario_1"
                if results[0]["metrics"]["risk_score"] < results[1]["metrics"]["risk_score"]
                else "scenario_2"
            ),
        }

        return {"comparison": comparison, "results": results}
    except Exception as e:
        logger.error(f"Comparison failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v1/simulations/{simulation_id}")
async def delete_simulation(simulation_id: str):
    """Delete a simulation run and its results"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            deleted = await conn.execute(
                "DELETE FROM simulation_runs WHERE id = $1",
                uuid.UUID(simulation_id),
            )
            if deleted == "DELETE 0":
                raise HTTPException(status_code=404, detail="Simulation not found")
        return {"message": "Simulation deleted", "simulation_id": simulation_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8093"))
    uvicorn.run(app, host="0.0.0.0", port=port)
