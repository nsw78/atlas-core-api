package atlas.authz

import future.keywords.in
import future.keywords.if

default allow := false

# ============================================================
# ROLE DEFINITIONS
# ============================================================

role_permissions := {
    "super_admin": {
        "paths": ["*"],
        "methods": ["*"],
        "description": "Full system access"
    },
    "admin": {
        "paths": [
            "/api/v1/auth/*",
            "/api/v1/entities/*",
            "/api/v1/risks/*",
            "/api/v1/sanctions/*",
            "/api/v1/trade/*",
            "/api/v1/compliance/*",
            "/api/v1/audit/*",
            "/api/v1/scenarios/*",
            "/api/v1/ml/*",
            "/api/v1/graph/*",
            "/api/v1/overview/*",
            "/api/v1/ingestion/*"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"]
    },
    "analyst": {
        "paths": [
            "/api/v1/entities/*",
            "/api/v1/risks/*",
            "/api/v1/sanctions/screen",
            "/api/v1/sanctions/countries",
            "/api/v1/sanctions/lists",
            "/api/v1/sanctions/stats",
            "/api/v1/trade/*",
            "/api/v1/scenarios/*",
            "/api/v1/graph/*",
            "/api/v1/nlp/*",
            "/api/v1/overview/*",
            "/api/v1/osint/*",
            "/api/v1/news/*",
            "/api/v1/briefings/*",
            "/api/v1/wargaming/*",
            "/api/v1/twins/*",
            "/api/v1/policy/*"
        ],
        "methods": ["GET", "POST"]
    },
    "compliance_officer": {
        "paths": [
            "/api/v1/sanctions/*",
            "/api/v1/trade/*",
            "/api/v1/compliance/*",
            "/api/v1/audit/*",
            "/api/v1/risks/*",
            "/api/v1/entities/*"
        ],
        "methods": ["GET", "POST"]
    },
    "viewer": {
        "paths": [
            "/api/v1/overview/*",
            "/api/v1/risks/*",
            "/api/v1/sanctions/countries",
            "/api/v1/sanctions/lists",
            "/api/v1/sanctions/stats"
        ],
        "methods": ["GET"]
    },
    "api_consumer": {
        "paths": [
            "/api/v1/risks/assess",
            "/api/v1/sanctions/screen",
            "/api/v1/sanctions/batch",
            "/api/v1/nlp/process",
            "/api/v1/graph/relationships"
        ],
        "methods": ["GET", "POST"]
    }
}

# ============================================================
# PUBLIC ENDPOINTS (no auth required)
# ============================================================

public_paths := {
    "/health",
    "/healthz",
    "/readyz",
    "/metrics",
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/api/v1/auth/validate"
}

allow if {
    input.path in public_paths
}

# ============================================================
# ROLE-BASED ACCESS CONTROL
# ============================================================

allow if {
    some role in input.user.roles
    role == "super_admin"
}

allow if {
    some role in input.user.roles
    perms := role_permissions[role]
    path_match(input.path, perms.paths)
    method_match(input.method, perms.methods)
}

# ============================================================
# SANCTIONS-SPECIFIC POLICIES
# ============================================================

# Batch screening requires explicit permission or admin role
allow if {
    input.path == "/api/v1/sanctions/batch"
    input.method == "POST"
    "sanctions:batch_screen" in input.user.permissions
}

# Sanctions list management requires admin + MFA
allow if {
    startswith(input.path, "/api/v1/sanctions/")
    input.method in ["PUT", "DELETE"]
    "admin" in input.user.roles
    input.user.mfa_verified == true
}

# ============================================================
# ML MODEL MANAGEMENT POLICIES
# ============================================================

# Model deployment requires specific permission
allow if {
    input.path == "/api/v1/ml/models/deploy"
    input.method == "POST"
    "ml:deploy" in input.user.permissions
    input.user.mfa_verified == true
}

# Model retraining requires specific permission
allow if {
    input.path == "/api/v1/ml/models/retrain"
    input.method == "POST"
    "ml:retrain" in input.user.permissions
}

# ============================================================
# DATA RESIDENCY POLICIES
# ============================================================

# EU data can only be accessed from EU region
deny_reason["eu_data_residency_violation"] if {
    startswith(input.path, "/api/v1/residency/")
    input.data_region == "eu"
    input.request_region != "eu-west-1"
}

allow if {
    startswith(input.path, "/api/v1/residency/")
    not deny_reason["eu_data_residency_violation"]
    some role in input.user.roles
    role in ["admin", "compliance_officer"]
}

# ============================================================
# AUDIT POLICIES
# ============================================================

# All access decisions are logged
audit_log := {
    "timestamp": input.timestamp,
    "user_id": input.user.id,
    "path": input.path,
    "method": input.method,
    "allowed": allow,
    "roles": input.user.roles,
    "source_ip": input.source_ip
}

# ============================================================
# RATE LIMITING POLICIES (advisory)
# ============================================================

rate_limit_tier := tier if {
    "super_admin" in input.user.roles
    tier := "unlimited"
} else := tier if {
    "admin" in input.user.roles
    tier := "high"
} else := tier if {
    "analyst" in input.user.roles
    tier := "medium"
} else := tier if {
    tier := "low"
}

# ============================================================
# HELPER FUNCTIONS
# ============================================================

path_match(request_path, allowed_paths) if {
    some pattern in allowed_paths
    pattern == "*"
}

path_match(request_path, allowed_paths) if {
    some pattern in allowed_paths
    glob.match(pattern, ["/"], request_path)
}

method_match(request_method, allowed_methods) if {
    some m in allowed_methods
    m == "*"
}

method_match(request_method, allowed_methods) if {
    request_method in allowed_methods
}

# Deny reasons for debugging
deny_reason["no_matching_role"] if {
    not allow
    input.user.roles
    count(input.user.roles) > 0
}

deny_reason["no_authentication"] if {
    not input.user
}

deny_reason["insufficient_permissions"] if {
    input.user.roles
    not allow
}
