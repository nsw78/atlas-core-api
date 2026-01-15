"""
Defensive War-Gaming Service
Non-kinetic defensive simulations for infrastructure resilience
"""

import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
from datetime import datetime
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ATLAS Defensive War-Gaming Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "war-gaming-service"}

@app.post("/api/v1/wargaming/scenarios")
async def create_war_game(scenario: WarGameScenario):
    """Create and run a defensive war-game simulation"""
    try:
        game_id = str(uuid.uuid4())
        
        # Run defensive simulation
        result = simulate_defensive_scenario(scenario)
        
        return {
            "game_id": game_id,
            "scenario_name": scenario.name,
            "scenario_type": scenario.scenario_type,
            "outcome": result["outcome"],
            "resilience_score": result["resilience_score"],
            "timeline": result["timeline"],
            "recommendations": result["recommendations"],
            "created_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"War-game simulation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def simulate_defensive_scenario(scenario: WarGameScenario) -> Dict[str, Any]:
    """Simulate defensive scenario"""
    np.random.seed(42)
    
    # Calculate defensive strength
    defensive_strength = sum(scenario.defensive_capabilities.values()) / len(scenario.defensive_capabilities) if scenario.defensive_capabilities else 0.5
    threat_strength = scenario.threat_level
    
    # Determine outcome
    if defensive_strength > threat_strength * 1.2:
        outcome = "defended"
        resilience_score = 0.85
    elif defensive_strength > threat_strength * 0.8:
        outcome = "partial"
        resilience_score = 0.60
    else:
        outcome = "compromised"
        resilience_score = 0.35
    
    # Generate timeline
    timeline = []
    for day in range(min(scenario.duration_days, 10)):
        event = {
            "day": day + 1,
            "event_type": np.random.choice(["attack", "defense", "recovery"]),
            "target": np.random.choice(scenario.infrastructure_targets) if scenario.infrastructure_targets else "unknown",
            "severity": np.random.uniform(0, 1),
            "status": "mitigated" if defensive_strength > 0.6 else "ongoing"
        }
        timeline.append(event)
    
    # Generate recommendations
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
            "damage_estimate": 1.0 - resilience_score
        }
    }

@app.get("/api/v1/wargaming/games/{game_id}")
async def get_war_game(game_id: str):
    """Get war-game results"""
    try:
        # TODO: Retrieve from database
        return {
            "game_id": game_id,
            "status": "completed",
            "outcome": "defended",
            "resilience_score": 0.85
        }
    except Exception as e:
        logger.error(f"Failed to get war-game: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/wargaming/games")
async def list_war_games(limit: int = 10):
    """List recent war-games"""
    try:
        # TODO: Query database
        return {
            "games": [
                {
                    "game_id": str(uuid.uuid4()),
                    "scenario_name": "Cyber Attack Simulation",
                    "outcome": "defended",
                    "created_at": datetime.utcnow().isoformat()
                }
                for _ in range(min(limit, 5))
            ]
        }
    except Exception as e:
        logger.error(f"Failed to list war-games: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/wargaming/risk-escalation")
async def simulate_risk_escalation(scenario: WarGameScenario):
    """Simulate risk escalation scenarios"""
    try:
        # Simulate escalating threat
        escalation_stages = []
        current_threat = scenario.threat_level
        
        for stage in range(5):
            current_threat = min(1.0, current_threat * 1.2)
            defensive_response = sum(scenario.defensive_capabilities.values()) / len(scenario.defensive_capabilities) if scenario.defensive_capabilities else 0.5
            
            escalation_stages.append({
                "stage": stage + 1,
                "threat_level": current_threat,
                "defensive_response": defensive_response,
                "risk_score": current_threat * (1 - defensive_response),
                "status": "contained" if defensive_response > current_threat else "escalating"
            })
        
        return {
            "escalation_stages": escalation_stages,
            "max_risk": max(s["risk_score"] for s in escalation_stages),
            "recommendation": "Increase defensive posture" if escalation_stages[-1]["status"] == "escalating" else "Maintain current defenses"
        }
    except Exception as e:
        logger.error(f"Risk escalation simulation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8094"))
    uvicorn.run(app, host="0.0.0.0", port=port)
