from fastapi import FastAPI, HTTPException
from typing import Any, Dict
import requests

app = FastAPI(
    title="ATLAS API Gateway",
    version="1.0.0",
    description="Central API Gateway for the ATLAS platform",
)

WAR_GAMING_SERVICE_URL = "http://atlas-war-gaming:8094"

@app.get("/health", tags=["Monitoring"])
def health_check():
    """
    Health check endpoint to verify that the API Gateway is running.
    """
    return {"status": "ok", "service": "api-gateway"}

@app.post("/api/v1/wargaming/scenarios", tags=["War Gaming"])
def create_war_game_scenario(scenario_data: Dict[str, Any]):
    """
    Endpoint to create a war-gaming scenario.
    This endpoint acts as a proxy to the war-gaming service.
    """
    try:
        response = requests.post(
            f"{WAR_GAMING_SERVICE_URL}/api/v1/wargaming/scenarios",
            json=scenario_data,
            timeout=5.0  # 5-second timeout
        )
        response.raise_for_status()  # Raise an exception for bad status codes
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {e}")

@app.get("/api/v1/wargaming/health", tags=["War Gaming"])
def check_war_gaming_health():
    """
    Checks the health of the downstream war-gaming service.
    """
    try:
        response = requests.get(f"{WAR_GAMING_SERVICE_URL}/health", timeout=2.0)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {e}")
