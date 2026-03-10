package atlas.authz

test_public_health_allowed {
    allow with input as {"path": "/health", "method": "GET"}
}

test_public_login_allowed {
    allow with input as {"path": "/api/v1/auth/login", "method": "POST"}
}

test_super_admin_full_access {
    allow with input as {
        "path": "/api/v1/sanctions/batch",
        "method": "DELETE",
        "user": {
            "id": "admin-1",
            "roles": ["super_admin"],
            "permissions": [],
            "mfa_verified": true
        }
    }
}

test_analyst_can_read_risks {
    allow with input as {
        "path": "/api/v1/risks/assess",
        "method": "POST",
        "user": {
            "id": "analyst-1",
            "roles": ["analyst"],
            "permissions": []
        }
    }
}

test_analyst_cannot_delete_sanctions {
    not allow with input as {
        "path": "/api/v1/sanctions/lists",
        "method": "DELETE",
        "user": {
            "id": "analyst-1",
            "roles": ["analyst"],
            "permissions": [],
            "mfa_verified": false
        }
    }
}

test_viewer_read_only {
    allow with input as {
        "path": "/api/v1/overview/status",
        "method": "GET",
        "user": {
            "id": "viewer-1",
            "roles": ["viewer"],
            "permissions": []
        }
    }
}

test_viewer_cannot_post {
    not allow with input as {
        "path": "/api/v1/risks/assess",
        "method": "POST",
        "user": {
            "id": "viewer-1",
            "roles": ["viewer"],
            "permissions": []
        }
    }
}

test_compliance_officer_sanctions_access {
    allow with input as {
        "path": "/api/v1/sanctions/screen",
        "method": "POST",
        "user": {
            "id": "compliance-1",
            "roles": ["compliance_officer"],
            "permissions": []
        }
    }
}

test_unauthenticated_denied {
    not allow with input as {
        "path": "/api/v1/risks/assess",
        "method": "POST"
    }
}

test_rate_limit_tier_admin {
    rate_limit_tier == "high" with input as {
        "user": {"roles": ["admin"]}
    }
}

test_rate_limit_tier_viewer {
    rate_limit_tier == "low" with input as {
        "user": {"roles": ["viewer"]}
    }
}
