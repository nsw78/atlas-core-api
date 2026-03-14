"""
Defensive War-Gaming Service
Non-kinetic defensive simulations for infrastructure resilience with PostgreSQL persistence
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
import numpy as np
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
    logger.info("War-Gaming service starting up...")
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
    logger.info("War-Gaming service shutting down...")
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
    title="ATLAS Defensive War-Gaming Service",
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
class WarGameCreate(BaseModel):
    title: str
    description: Optional[str] = None
    game_type: str = "red_team_blue_team"  # tabletop, seminar, matrix, red_team_blue_team, crisis_simulation, campaign, custom
    objectives: Optional[List[Dict[str, Any]]] = None
    rules: Optional[Dict[str, Any]] = None
    participants: Optional[List[Dict[str, Any]]] = None


class WarGameScenarioCreate(BaseModel):
    game_id: str
    name: str
    description: Optional[str] = None
    scenario_phase: Optional[str] = None
    initial_conditions: Dict[str, Any] = {}
    injects: Optional[List[Dict[str, Any]]] = None
    expected_outcomes: Optional[List[Dict[str, Any]]] = None
    sort_order: int = 0


class WarGameMoveCreate(BaseModel):
    game_id: str
    scenario_id: Optional[str] = None
    turn_number: int
    team: str
    move_type: str
    action_description: str
    decision_rationale: Optional[str] = None
    resources_used: Optional[Dict[str, Any]] = None


# Legacy model kept for backward-compatible simulation endpoint
class WarGameScenario(BaseModel):
    name: str
    scenario_type: str  # "cyber_attack", "supply_chain_disruption", "economic_sanctions"
    infrastructure_targets: List[str]
    defensive_capabilities: Dict[str, Any]
    threat_level: float  # 0-1
    duration_days: int = 30


class GameResult(BaseModel):
    game_id: str
    scenario_name: str
    outcome: str  # "defended", "compromised", "partial"
    resilience_score: float
    timeline: List[Dict[str, Any]]


# ==================================
# Simulation Logic (unchanged)
# ==================================
def simulate_defensive_scenario(scenario: WarGameScenario) -> Dict[str, Any]:
    """Simulate defensive scenario"""
    np.random.seed(42)

    defensive_strength = (
        sum(scenario.defensive_capabilities.values()) / len(scenario.defensive_capabilities)
        if scenario.defensive_capabilities
        else 0.5
    )
    threat_strength = scenario.threat_level

    if defensive_strength > threat_strength * 1.2:
        outcome = "defended"
        resilience_score = 0.85
    elif defensive_strength > threat_strength * 0.8:
        outcome = "partial"
        resilience_score = 0.60
    else:
        outcome = "compromised"
        resilience_score = 0.35

    timeline = []
    for day in range(min(scenario.duration_days, 10)):
        event = {
            "day": day + 1,
            "event_type": str(np.random.choice(["attack", "defense", "recovery"])),
            "target": (
                str(np.random.choice(scenario.infrastructure_targets))
                if scenario.infrastructure_targets
                else "unknown"
            ),
            "severity": float(np.random.uniform(0, 1)),
            "status": "mitigated" if defensive_strength > 0.6 else "ongoing",
        }
        timeline.append(event)

    recommendations = []
    if resilience_score < 0.5:
        recommendations.append("Increase defensive capabilities in critical infrastructure")
        recommendations.append("Implement redundancy for key systems")
    if outcome == "compromised":
        recommendations.append("Review incident response procedures")
        recommendations.append("Conduct security audit")

    return {
        "outcome": outcome,
        "resilience_score": resilience_score,
        "timeline": timeline,
        "recommendations": recommendations,
        "metrics": {
            "defensive_strength": defensive_strength,
            "threat_strength": threat_strength,
            "damage_estimate": 1.0 - resilience_score,
        },
    }


# ==================================
# API Routes
# ==================================
@app.get("/health")
async def health_check():
    status = {"status": "healthy", "service": "war-gaming-service"}
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            await conn.fetchval("SELECT 1")
        status["database"] = "connected"
    except Exception:
        status["database"] = "disconnected"
        status["status"] = "degraded"
    return status


# ----- GAMES (CRUD) -----

@app.post("/api/v1/wargaming/games")
async def create_game(game: WarGameCreate):
    """Create a new war game"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO wargaming_games
                    (title, description, game_type, status, objectives, rules, participants)
                VALUES ($1, $2, $3, 'planning', $4, $5, $6)
                RETURNING id, created_at
                """,
                game.title,
                game.description,
                game.game_type,
                json.dumps(game.objectives or []),
                json.dumps(game.rules or {}),
                json.dumps(game.participants or []),
            )
        return {
            "game_id": str(row["id"]),
            "title": game.title,
            "game_type": game.game_type,
            "status": "planning",
            "created_at": row["created_at"].isoformat(),
        }
    except Exception as e:
        logger.error(f"Failed to create game: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/wargaming/games")
async def list_war_games(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = None,
    game_type: Optional[str] = None,
):
    """List war games with optional filters"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            conditions = []
            params = []
            idx = 1

            if status:
                conditions.append(f"status = ${idx}")
                params.append(status)
                idx += 1
            if game_type:
                conditions.append(f"game_type = ${idx}")
                params.append(game_type)
                idx += 1

            where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""

            query = f"""
                SELECT id, title, description, game_type, status, turn_number,
                       current_phase, start_date, end_date, created_at, updated_at
                FROM wargaming_games
                {where_clause}
                ORDER BY created_at DESC
                LIMIT ${idx} OFFSET ${idx + 1}
            """
            params.extend([limit, offset])
            rows = await conn.fetch(query, *params)

            count_query = f"SELECT COUNT(*) FROM wargaming_games {where_clause}"
            total = (
                await conn.fetchval(count_query, *params[:-2])
                if params[:-2]
                else await conn.fetchval(count_query)
            )

        return {
            "games": [
                {
                    "game_id": str(r["id"]),
                    "title": r["title"],
                    "description": r["description"],
                    "game_type": r["game_type"],
                    "status": r["status"],
                    "turn_number": r["turn_number"],
                    "current_phase": r["current_phase"],
                    "start_date": r["start_date"].isoformat() if r["start_date"] else None,
                    "end_date": r["end_date"].isoformat() if r["end_date"] else None,
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                }
                for r in rows
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Failed to list war-games: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/wargaming/games/{game_id}")
async def get_war_game(game_id: str):
    """Get war-game details including scenarios and moves"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM wargaming_games WHERE id = $1",
                uuid.UUID(game_id),
            )
            if not row:
                raise HTTPException(status_code=404, detail="Game not found")

            scenarios = await conn.fetch(
                """
                SELECT id, name, description, scenario_phase, is_active, sort_order,
                       activated_at, created_at
                FROM wargaming_scenarios
                WHERE game_id = $1
                ORDER BY sort_order
                """,
                uuid.UUID(game_id),
            )

            moves = await conn.fetch(
                """
                SELECT id, scenario_id, turn_number, team, move_type,
                       action_description, submitted_at
                FROM wargaming_moves
                WHERE game_id = $1
                ORDER BY turn_number, submitted_at
                """,
                uuid.UUID(game_id),
            )

        return {
            "game_id": str(row["id"]),
            "title": row["title"],
            "description": row["description"],
            "game_type": row["game_type"],
            "status": row["status"],
            "objectives": json.loads(row["objectives"]) if isinstance(row["objectives"], str) else (row["objectives"] or []),
            "rules": json.loads(row["rules"]) if isinstance(row["rules"], str) else (row["rules"] or {}),
            "participants": json.loads(row["participants"]) if isinstance(row["participants"], str) else (row["participants"] or []),
            "turn_number": row["turn_number"],
            "current_phase": row["current_phase"],
            "start_date": row["start_date"].isoformat() if row["start_date"] else None,
            "end_date": row["end_date"].isoformat() if row["end_date"] else None,
            "findings": json.loads(row["findings"]) if isinstance(row["findings"], str) else (row["findings"] or []),
            "lessons_learned": row["lessons_learned"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            "scenarios": [
                {
                    "scenario_id": str(s["id"]),
                    "name": s["name"],
                    "description": s["description"],
                    "scenario_phase": s["scenario_phase"],
                    "is_active": s["is_active"],
                    "sort_order": s["sort_order"],
                    "activated_at": s["activated_at"].isoformat() if s["activated_at"] else None,
                    "created_at": s["created_at"].isoformat() if s["created_at"] else None,
                }
                for s in scenarios
            ],
            "moves": [
                {
                    "move_id": str(m["id"]),
                    "scenario_id": str(m["scenario_id"]) if m["scenario_id"] else None,
                    "turn_number": m["turn_number"],
                    "team": m["team"],
                    "move_type": m["move_type"],
                    "action_description": m["action_description"],
                    "submitted_at": m["submitted_at"].isoformat() if m["submitted_at"] else None,
                }
                for m in moves
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get war-game: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/v1/wargaming/games/{game_id}/status")
async def update_game_status(game_id: str, new_status: str):
    """Update the status of a war game (planning, setup, in_progress, paused, completed, cancelled)"""
    valid_statuses = ["planning", "setup", "in_progress", "paused", "completed", "cancelled", "archived"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    try:
        p = await get_pool()
        async with p.acquire() as conn:
            update_fields = "status = $1, updated_at = CURRENT_TIMESTAMP"
            params = [new_status, uuid.UUID(game_id)]

            if new_status == "in_progress":
                update_fields = "status = $1, start_date = COALESCE(start_date, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP"
            elif new_status in ("completed", "cancelled"):
                update_fields = "status = $1, end_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP"

            result = await conn.execute(
                f"UPDATE wargaming_games SET {update_fields} WHERE id = $2",
                *params,
            )
            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Game not found")

        return {"game_id": game_id, "status": new_status, "message": "Game status updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update game status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ----- SCENARIOS (within a game) -----

@app.post("/api/v1/wargaming/scenarios")
async def create_scenario(scenario: WarGameScenarioCreate):
    """Create a scenario within a war game"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            # Verify game exists
            game = await conn.fetchrow(
                "SELECT id FROM wargaming_games WHERE id = $1",
                uuid.UUID(scenario.game_id),
            )
            if not game:
                raise HTTPException(status_code=404, detail="Game not found")

            row = await conn.fetchrow(
                """
                INSERT INTO wargaming_scenarios
                    (game_id, name, description, scenario_phase, initial_conditions,
                     injects, expected_outcomes, sort_order)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, created_at
                """,
                uuid.UUID(scenario.game_id),
                scenario.name,
                scenario.description,
                scenario.scenario_phase,
                json.dumps(scenario.initial_conditions),
                json.dumps(scenario.injects or []),
                json.dumps(scenario.expected_outcomes or []),
                scenario.sort_order,
            )

        return {
            "scenario_id": str(row["id"]),
            "game_id": scenario.game_id,
            "name": scenario.name,
            "created_at": row["created_at"].isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create scenario: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/wargaming/scenarios/{scenario_id}")
async def get_scenario(scenario_id: str):
    """Get a specific war-game scenario"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM wargaming_scenarios WHERE id = $1",
                uuid.UUID(scenario_id),
            )
            if not row:
                raise HTTPException(status_code=404, detail="Scenario not found")

        return {
            "scenario_id": str(row["id"]),
            "game_id": str(row["game_id"]),
            "name": row["name"],
            "description": row["description"],
            "scenario_phase": row["scenario_phase"],
            "initial_conditions": json.loads(row["initial_conditions"]) if isinstance(row["initial_conditions"], str) else (row["initial_conditions"] or {}),
            "injects": json.loads(row["injects"]) if isinstance(row["injects"], str) else (row["injects"] or []),
            "expected_outcomes": json.loads(row["expected_outcomes"]) if isinstance(row["expected_outcomes"], str) else (row["expected_outcomes"] or []),
            "actual_outcomes": json.loads(row["actual_outcomes"]) if isinstance(row["actual_outcomes"], str) else (row["actual_outcomes"] or []),
            "sort_order": row["sort_order"],
            "is_active": row["is_active"],
            "activated_at": row["activated_at"].isoformat() if row["activated_at"] else None,
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get scenario: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/v1/wargaming/scenarios/{scenario_id}/activate")
async def activate_scenario(scenario_id: str):
    """Activate a scenario within a game"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE wargaming_scenarios
                SET is_active = true, activated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                """,
                uuid.UUID(scenario_id),
            )
            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Scenario not found")

        return {"scenario_id": scenario_id, "is_active": True, "message": "Scenario activated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to activate scenario: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ----- MOVES -----

@app.post("/api/v1/wargaming/moves")
async def submit_move(move: WarGameMoveCreate):
    """Submit a move/decision in a war game"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            # Verify game exists and is in progress
            game = await conn.fetchrow(
                "SELECT id, status, turn_number FROM wargaming_games WHERE id = $1",
                uuid.UUID(move.game_id),
            )
            if not game:
                raise HTTPException(status_code=404, detail="Game not found")
            if game["status"] not in ("in_progress", "setup"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Game is in '{game['status']}' status. Moves can only be submitted when game is 'in_progress' or 'setup'.",
                )

            scenario_uuid = uuid.UUID(move.scenario_id) if move.scenario_id else None

            row = await conn.fetchrow(
                """
                INSERT INTO wargaming_moves
                    (game_id, scenario_id, turn_number, team, move_type,
                     action_description, decision_rationale, resources_used)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, submitted_at
                """,
                uuid.UUID(move.game_id),
                scenario_uuid,
                move.turn_number,
                move.team,
                move.move_type,
                move.action_description,
                move.decision_rationale,
                json.dumps(move.resources_used or {}),
            )

            # Update game turn number if this move advances it
            if move.turn_number > game["turn_number"]:
                await conn.execute(
                    "UPDATE wargaming_games SET turn_number = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                    move.turn_number,
                    uuid.UUID(move.game_id),
                )

        # Publish move submitted event to Kafka
        await publish_event("atlas.wargaming.move_submitted", {
            "game_id": move.game_id,
            "move_id": str(row["id"]),
            "team": move.team,
            "turn_number": move.turn_number,
            "timestamp": row["submitted_at"].isoformat(),
        })

        return {
            "move_id": str(row["id"]),
            "game_id": move.game_id,
            "turn_number": move.turn_number,
            "team": move.team,
            "move_type": move.move_type,
            "submitted_at": row["submitted_at"].isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit move: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/wargaming/games/{game_id}/moves")
async def list_game_moves(
    game_id: str,
    turn_number: Optional[int] = None,
    team: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List moves for a specific game"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            conditions = ["game_id = $1"]
            params = [uuid.UUID(game_id)]
            idx = 2

            if turn_number is not None:
                conditions.append(f"turn_number = ${idx}")
                params.append(turn_number)
                idx += 1
            if team:
                conditions.append(f"team = ${idx}")
                params.append(team)
                idx += 1

            where_clause = "WHERE " + " AND ".join(conditions)

            query = f"""
                SELECT id, scenario_id, turn_number, team, move_type,
                       action_description, decision_rationale, resources_used,
                       outcomes, adjudicator_notes, submitted_at, adjudicated_at
                FROM wargaming_moves
                {where_clause}
                ORDER BY turn_number, submitted_at
                LIMIT ${idx} OFFSET ${idx + 1}
            """
            params.extend([limit, offset])
            rows = await conn.fetch(query, *params)

            count_query = f"SELECT COUNT(*) FROM wargaming_moves {where_clause}"
            total = await conn.fetchval(count_query, *params[:-2])

        return {
            "moves": [
                {
                    "move_id": str(r["id"]),
                    "scenario_id": str(r["scenario_id"]) if r["scenario_id"] else None,
                    "turn_number": r["turn_number"],
                    "team": r["team"],
                    "move_type": r["move_type"],
                    "action_description": r["action_description"],
                    "decision_rationale": r["decision_rationale"],
                    "resources_used": json.loads(r["resources_used"]) if isinstance(r["resources_used"], str) else (r["resources_used"] or {}),
                    "outcomes": json.loads(r["outcomes"]) if isinstance(r["outcomes"], str) else (r["outcomes"] or {}),
                    "adjudicator_notes": r["adjudicator_notes"],
                    "submitted_at": r["submitted_at"].isoformat() if r["submitted_at"] else None,
                    "adjudicated_at": r["adjudicated_at"].isoformat() if r["adjudicated_at"] else None,
                }
                for r in rows
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"Failed to list moves: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/v1/wargaming/moves/{move_id}/adjudicate")
async def adjudicate_move(move_id: str, outcomes: Dict[str, Any], adjudicator_notes: Optional[str] = None):
    """Adjudicate a move - record the outcomes decided by the game master"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE wargaming_moves
                SET outcomes = $1, adjudicator_notes = $2, adjudicated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                """,
                json.dumps(outcomes),
                adjudicator_notes,
                uuid.UUID(move_id),
            )
            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Move not found")

        return {"move_id": move_id, "message": "Move adjudicated", "outcomes": outcomes}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to adjudicate move: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ----- SIMULATION ENDPOINTS (backward-compatible + persisted) -----

@app.post("/api/v1/wargaming/scenarios/simulate")
async def create_war_game_simulation(scenario: WarGameScenario):
    """Create and run a defensive war-game simulation (persists to DB)"""
    try:
        result = simulate_defensive_scenario(scenario)

        # Persist the game and its results
        p = await get_pool()
        async with p.acquire() as conn:
            async with conn.transaction():
                # Create the game
                game_row = await conn.fetchrow(
                    """
                    INSERT INTO wargaming_games
                        (title, description, game_type, status, objectives, start_date, end_date,
                         findings, lessons_learned)
                    VALUES ($1, $2, $3, 'completed', $4, $5, $6, $7, $8)
                    RETURNING id, created_at
                    """,
                    scenario.name,
                    f"Automated {scenario.scenario_type} simulation",
                    "crisis_simulation",
                    json.dumps([{"type": scenario.scenario_type, "threat_level": scenario.threat_level}]),
                    datetime.utcnow(),
                    datetime.utcnow(),
                    json.dumps(result["recommendations"]),
                    f"Outcome: {result['outcome']}, Resilience: {result['resilience_score']}",
                )
                game_id = game_row["id"]

                # Create a scenario
                scenario_row = await conn.fetchrow(
                    """
                    INSERT INTO wargaming_scenarios
                        (game_id, name, description, initial_conditions, actual_outcomes, is_active, activated_at)
                    VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
                    RETURNING id
                    """,
                    game_id,
                    scenario.name,
                    f"{scenario.scenario_type} against {', '.join(scenario.infrastructure_targets)}",
                    json.dumps({
                        "infrastructure_targets": scenario.infrastructure_targets,
                        "defensive_capabilities": scenario.defensive_capabilities,
                        "threat_level": scenario.threat_level,
                    }),
                    json.dumps({
                        "outcome": result["outcome"],
                        "resilience_score": result["resilience_score"],
                        "metrics": result["metrics"],
                    }),
                )

                # Record timeline events as moves
                for event in result["timeline"]:
                    await conn.execute(
                        """
                        INSERT INTO wargaming_moves
                            (game_id, scenario_id, turn_number, team, move_type,
                             action_description, outcomes)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        """,
                        game_id,
                        scenario_row["id"],
                        event["day"],
                        "red" if event["event_type"] == "attack" else "blue",
                        event["event_type"],
                        f"{event['event_type']} on {event['target']} (severity: {event['severity']:.2f})",
                        json.dumps({"severity": event["severity"], "status": event["status"]}),
                    )

        return {
            "game_id": str(game_id),
            "scenario_name": scenario.name,
            "scenario_type": scenario.scenario_type,
            "outcome": result["outcome"],
            "resilience_score": result["resilience_score"],
            "timeline": result["timeline"],
            "recommendations": result["recommendations"],
            "metrics": result["metrics"],
            "created_at": game_row["created_at"].isoformat(),
        }
    except Exception as e:
        logger.error(f"War-game simulation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/wargaming/risk-escalation")
async def simulate_risk_escalation(scenario: WarGameScenario):
    """Simulate risk escalation scenarios"""
    try:
        escalation_stages = []
        current_threat = scenario.threat_level

        for stage in range(5):
            current_threat = min(1.0, current_threat * 1.2)
            defensive_response = (
                sum(scenario.defensive_capabilities.values()) / len(scenario.defensive_capabilities)
                if scenario.defensive_capabilities
                else 0.5
            )

            escalation_stages.append({
                "stage": stage + 1,
                "threat_level": current_threat,
                "defensive_response": defensive_response,
                "risk_score": current_threat * (1 - defensive_response),
                "status": "contained" if defensive_response > current_threat else "escalating",
            })

        return {
            "escalation_stages": escalation_stages,
            "max_risk": max(s["risk_score"] for s in escalation_stages),
            "recommendation": (
                "Increase defensive posture"
                if escalation_stages[-1]["status"] == "escalating"
                else "Maintain current defenses"
            ),
        }
    except Exception as e:
        logger.error(f"Risk escalation simulation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v1/wargaming/games/{game_id}")
async def delete_game(game_id: str):
    """Delete a war game and all associated data (cascading)"""
    try:
        p = await get_pool()
        async with p.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM wargaming_games WHERE id = $1",
                uuid.UUID(game_id),
            )
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Game not found")
        return {"message": "Game deleted", "game_id": game_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete game: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8094"))
    uvicorn.run(app, host="0.0.0.0", port=port)
