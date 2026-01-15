"""
Digital Twins Service
Digital twins for infrastructure, supply chain, and economic systems
"""

import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ATLAS Digital Twins Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DigitalTwin(BaseModel):
    name: str
    twin_type: str  # "infrastructure", "supply_chain", "economic"
    model_config: Dict[str, Any]
    data_sources: List[str]

class TwinUpdate(BaseModel):
    twin_id: str
    updates: Dict[str, Any]
    timestamp: Optional[str] = None

class TwinState(BaseModel):
    twin_id: str
    state: Dict[str, Any]
    last_updated: str
    health_status: str

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "digital-twins-service"}

@app.post("/api/v1/twins")
async def create_digital_twin(twin: DigitalTwin):
    """Create a new digital twin"""
    try:
        twin_id = str(uuid.uuid4())
        
        # Initialize twin based on type
        initial_state = initialize_twin(twin)
        
        return {
            "twin_id": twin_id,
            "name": twin.name,
            "twin_type": twin.twin_type,
            "state": initial_state,
            "status": "active",
            "created_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to create digital twin: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def initialize_twin(twin: DigitalTwin) -> Dict[str, Any]:
    """Initialize twin state based on type"""
    if twin.twin_type == "infrastructure":
        return {
            "components": twin.model_config.get("components", []),
            "operational_status": "operational",
            "capacity_utilization": 0.65,
            "maintenance_schedule": [],
            "risk_factors": []
        }
    elif twin.twin_type == "supply_chain":
        return {
            "nodes": twin.model_config.get("nodes", []),
            "edges": twin.model_config.get("edges", []),
            "flow_rates": {},
            "bottlenecks": [],
            "resilience_score": 0.75
        }
    elif twin.twin_type == "economic":
        return {
            "indicators": twin.model_config.get("indicators", {}),
            "growth_rate": 0.03,
            "inflation": 0.02,
            "unemployment": 0.05,
            "forecast": {}
        }
    else:
        return {"status": "initialized"}

@app.get("/api/v1/twins/{twin_id}")
async def get_digital_twin(twin_id: str):
    """Get digital twin state"""
    try:
        # TODO: Retrieve from database
        return {
            "twin_id": twin_id,
            "state": {
                "operational_status": "operational",
                "last_updated": datetime.utcnow().isoformat()
            },
            "health_status": "healthy"
        }
    except Exception as e:
        logger.error(f"Failed to get digital twin: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/twins/{twin_id}")
async def update_digital_twin(twin_id: str, update: TwinUpdate):
    """Update digital twin state"""
    try:
        # TODO: Update twin state
        return {
            "twin_id": twin_id,
            "status": "updated",
            "updated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to update digital twin: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/twins")
async def list_digital_twins(twin_type: Optional[str] = None):
    """List digital twins"""
    try:
        # TODO: Query database
        twins = [
            {
                "twin_id": str(uuid.uuid4()),
                "name": "Critical Infrastructure Twin",
                "twin_type": "infrastructure",
                "status": "active"
            },
            {
                "twin_id": str(uuid.uuid4()),
                "name": "Global Supply Chain Twin",
                "twin_type": "supply_chain",
                "status": "active"
            }
        ]
        
        if twin_type:
            twins = [t for t in twins if t["twin_type"] == twin_type]
        
        return {"twins": twins}
    except Exception as e:
        logger.error(f"Failed to list digital twins: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/twins/{twin_id}/simulate")
async def simulate_twin(twin_id: str, scenario: Dict[str, Any]):
    """Run simulation on digital twin"""
    try:
        # TODO: Run simulation
        return {
            "twin_id": twin_id,
            "simulation_id": str(uuid.uuid4()),
            "results": {
                "impact": "moderate",
                "affected_components": [],
                "recovery_time": 24
            }
        }
    except Exception as e:
        logger.error(f"Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/twins/{twin_id}/sync")
async def sync_twin(twin_id: str):
    """Synchronize digital twin with real-world data"""
    try:
        # TODO: Sync with data sources
        return {
            "twin_id": twin_id,
            "status": "synchronized",
            "last_sync": datetime.utcnow().isoformat(),
            "updates_applied": 5
        }
    except Exception as e:
        logger.error(f"Sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8095"))
    uvicorn.run(app, host="0.0.0.0", port=port)
