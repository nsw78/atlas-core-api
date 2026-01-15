"""
Scenario Simulation Service
Strategic scenario simulation engine with Monte Carlo and agent-based modeling
"""

import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
from datetime import datetime, timedelta
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ATLAS Scenario Simulation Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "scenario-simulation-service"}

@app.post("/api/v1/simulations/scenarios")
async def create_scenario(scenario: ScenarioInput):
    """Create and run a scenario simulation"""
    try:
        simulation_id = str(uuid.uuid4())
        
        # TODO: Implement actual simulation logic
        # For now, generate mock results
        
        if scenario.simulation_type == "monte_carlo":
            results = run_monte_carlo_simulation(scenario)
        else:
            results = run_agent_based_simulation(scenario)
        
        return {
            "simulation_id": simulation_id,
            "scenario_name": scenario.name,
            "status": "completed",
            "results": results,
            "metrics": {
                "risk_score": np.mean(results.get("risk_scores", [0.5])),
                "confidence": 0.82,
                "iterations": scenario.iterations
            },
            "created_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def run_monte_carlo_simulation(scenario: ScenarioInput) -> Dict[str, Any]:
    """Run Monte Carlo simulation"""
    np.random.seed(42)
    
    # Simulate risk scores over iterations
    risk_scores = []
    outcomes = []
    
    for _ in range(scenario.iterations):
        # Simulate based on variables
        base_risk = scenario.variables.get("base_risk", 0.5)
        volatility = scenario.variables.get("volatility", 0.1)
        
        risk_score = np.clip(base_risk + np.random.normal(0, volatility), 0, 1)
        risk_scores.append(risk_score)
        
        # Determine outcome
        if risk_score > 0.7:
            outcomes.append("high_risk")
        elif risk_score > 0.4:
            outcomes.append("medium_risk")
        else:
            outcomes.append("low_risk")
    
    return {
        "risk_scores": risk_scores[:100],  # Limit for response size
        "outcomes": outcomes[:100],
        "statistics": {
            "mean": np.mean(risk_scores),
            "std": np.std(risk_scores),
            "min": np.min(risk_scores),
            "max": np.max(risk_scores),
            "percentiles": {
                "p10": np.percentile(risk_scores, 10),
                "p50": np.percentile(risk_scores, 50),
                "p90": np.percentile(risk_scores, 90)
            }
        },
        "outcome_distribution": {
            "high_risk": outcomes.count("high_risk"),
            "medium_risk": outcomes.count("medium_risk"),
            "low_risk": outcomes.count("low_risk")
        }
    }

def run_agent_based_simulation(scenario: ScenarioInput) -> Dict[str, Any]:
    """Run agent-based simulation"""
    np.random.seed(42)
    
    # Simulate agent interactions
    agents = scenario.variables.get("agents", [])
    if not agents:
        agents = ["defender", "attacker", "neutral"]
    
    interactions = []
    for i in range(min(scenario.iterations, 100)):
        interaction = {
            "step": i,
            "agents": agents,
            "action": np.random.choice(["cooperate", "defect", "neutral"]),
            "outcome": np.random.uniform(0, 1)
        }
        interactions.append(interaction)
    
    return {
        "interactions": interactions,
        "agent_performance": {
            agent: np.random.uniform(0.5, 0.9) for agent in agents
        },
        "equilibrium_reached": True,
        "final_state": "stable"
    }

@app.get("/api/v1/simulations/{simulation_id}")
async def get_simulation(simulation_id: str):
    """Get simulation results"""
    try:
        # TODO: Retrieve from database
        return {
            "simulation_id": simulation_id,
            "status": "completed",
            "results": {
                "risk_score": 0.65,
                "confidence": 0.82
            }
        }
    except Exception as e:
        logger.error(f"Failed to get simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/simulations")
async def list_simulations(limit: int = 10):
    """List recent simulations"""
    try:
        # TODO: Query database
        return {
            "simulations": [
                {
                    "simulation_id": str(uuid.uuid4()),
                    "scenario_name": "Geopolitical Risk Scenario",
                    "status": "completed",
                    "created_at": datetime.utcnow().isoformat()
                }
                for _ in range(min(limit, 5))
            ]
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
        
        # Compare metrics
        comparison = {
            "scenarios": [r["scenario_name"] for r in results],
            "risk_scores": [r["metrics"]["risk_score"] for r in results],
            "recommendation": "scenario_1" if results[0]["metrics"]["risk_score"] < results[1]["metrics"]["risk_score"] else "scenario_2"
        }
        
        return {
            "comparison": comparison,
            "results": results
        }
    except Exception as e:
        logger.error(f"Comparison failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8093"))
    uvicorn.run(app, host="0.0.0.0", port=port)
