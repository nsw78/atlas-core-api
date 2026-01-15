"""
Data Residency Service
Enforces data residency controls and compliance
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

app = FastAPI(title="ATLAS Data Residency Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DataResidencyRule(BaseModel):
    rule_id: str
    data_type: str  # "pii", "financial", "intelligence"
    allowed_regions: List[str]
    required_region: Optional[str] = None
    encryption_required: bool = True

class DataLocationRequest(BaseModel):
    data_id: str
    data_type: str
    source_region: str
    target_region: Optional[str] = None

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "data-residency-service"}

@app.get("/api/v1/residency/rules")
async def list_residency_rules():
    """List all data residency rules"""
    try:
        # TODO: Query from database
        return {
            "rules": [
                {
                    "rule_id": "rule-1",
                    "data_type": "pii",
                    "allowed_regions": ["eu-west-1"],
                    "required_region": "eu-west-1",
                    "encryption_required": True,
                    "compliance": ["GDPR"]
                },
                {
                    "rule_id": "rule-2",
                    "data_type": "financial",
                    "allowed_regions": ["us-east-1", "eu-west-1"],
                    "required_region": None,
                    "encryption_required": True,
                    "compliance": ["PCI-DSS"]
                },
                {
                    "rule_id": "rule-3",
                    "data_type": "intelligence",
                    "allowed_regions": ["us-east-1"],
                    "required_region": "us-east-1",
                    "encryption_required": True,
                    "compliance": ["ITAR"]
                }
            ]
        }
    except Exception as e:
        logger.error(f"Failed to list rules: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/residency/validate")
async def validate_data_location(request: DataLocationRequest):
    """Validate if data can be stored in a region"""
    try:
        # TODO: Check residency rules
        rules = await list_residency_rules()
        applicable_rule = next(
            (r for r in rules["rules"] if r["data_type"] == request.data_type),
            None
        )
        
        if not applicable_rule:
            return {
                "valid": False,
                "reason": "No residency rule found for data type"
            }
        
        if request.target_region:
            if request.target_region not in applicable_rule["allowed_regions"]:
                return {
                    "valid": False,
                    "reason": f"Region {request.target_region} not allowed for {request.data_type}"
                }
        
        if applicable_rule["required_region"]:
            if request.target_region != applicable_rule["required_region"]:
                return {
                    "valid": False,
                    "reason": f"Data type {request.data_type} must be stored in {applicable_rule['required_region']}"
                }
        
        return {
            "valid": True,
            "allowed_regions": applicable_rule["allowed_regions"],
            "encryption_required": applicable_rule["encryption_required"]
        }
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/residency/rules")
async def create_residency_rule(rule: DataResidencyRule):
    """Create a new data residency rule"""
    try:
        # TODO: Store in database
        return {
            "rule_id": rule.rule_id or str(uuid.uuid4()),
            "status": "created",
            "created_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to create rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/residency/data/{data_id}/location")
async def get_data_location(data_id: str):
    """Get current location of data"""
    try:
        # TODO: Query data location
        return {
            "data_id": data_id,
            "current_region": "eu-west-1",
            "replicated_regions": ["us-east-1"],
            "compliance_status": "compliant",
            "last_updated": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get data location: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/residency/compliance")
async def get_compliance_status():
    """Get overall compliance status"""
    try:
        # TODO: Calculate compliance status
        return {
            "overall_status": "compliant",
            "regulations": [
                {
                    "regulation": "GDPR",
                    "status": "compliant",
                    "data_types": ["pii"],
                    "regions": ["eu-west-1"]
                },
                {
                    "regulation": "LGPD",
                    "status": "compliant",
                    "data_types": ["pii"],
                    "regions": ["us-east-1"]
                },
                {
                    "regulation": "ITAR",
                    "status": "compliant",
                    "data_types": ["intelligence"],
                    "regions": ["us-east-1"]
                }
            ],
            "last_audit": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get compliance status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8098"))
    uvicorn.run(app, host="0.0.0.0", port=port)
