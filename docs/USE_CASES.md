# ATLAS Core API - Use Cases

**Version:** 1.0.0  
**Last Updated:** 2024

---

## Executive Summary

This document provides detailed use cases for the ATLAS Strategic Intelligence Platform, demonstrating how government agencies, regulators, and critical infrastructure operators can leverage the platform for legal, ethical, defensive intelligence operations.

---

## Use Case Categories

1. **Geopolitical Risk Monitoring**
2. **Critical Infrastructure Protection**
3. **Supply Chain Resilience**
4. **Economic Intelligence**
5. **Regulatory Compliance Monitoring**
6. **Crisis Response Planning**

---

## Use Case 1: Geopolitical Risk Monitoring for Energy Sector

### Scenario
A government energy regulator needs to monitor geopolitical risks that could impact energy supply chains, particularly for oil and gas imports from specific regions.

### Actors
- **Primary**: Energy Regulator Analysts
- **Secondary**: Energy Infrastructure Operators
- **Tertiary**: Policy Makers

### Objectives
- Early detection of geopolitical tensions that could disrupt energy supply
- Risk assessment for energy-exporting countries
- Supply chain disruption forecasting
- Policy recommendation support

### Workflow

#### Step 1: Risk Assessment Request
```
Analyst → API: POST /api/v1/risks/assess
{
  "entity_id": "country-IRN",
  "entity_type": "country",
  "dimensions": ["geopolitical", "economic", "infrastructure"],
  "time_horizon": "90d"
}
```

#### Step 2: System Processing
1. **Data Ingestion Layer**:
   - News Aggregator collects recent news about Iran
   - Trade Data Service retrieves energy trade flows
   - ESG Service monitors regulatory changes

2. **AI & Analytics Core**:
   - NLP Service analyzes news sentiment
   - Risk Assessment Model calculates risk scores
   - Graph Intelligence identifies key relationships

3. **Geospatial Layer**:
   - Identifies critical energy infrastructure
   - Maps supply chain routes
   - Monitors legal zones (EEZ, airspace)

#### Step 3: Risk Assessment Response
```json
{
  "assessment_id": "risk-789",
  "overall_score": 0.78,
  "dimensions": {
    "geopolitical": {
      "score": 0.85,
      "trend": "increasing",
      "key_factors": [
        "Escalating regional tensions",
        "Trade sanctions impact",
        "Diplomatic incidents"
      ]
    },
    "economic": {
      "score": 0.70,
      "trend": "stable",
      "key_factors": [
        "Currency volatility",
        "Energy export dependency"
      ]
    }
  },
  "supply_chain_impact": {
    "affected_routes": 3,
    "estimated_disruption_probability": 0.65,
    "alternative_routes_available": 2
  }
}
```

#### Step 4: Alert Configuration
```
Analyst → API: POST /api/v1/risks/alerts
{
  "entity_id": "country-IRN",
  "dimension": "geopolitical",
  "threshold": 0.80,
  "notification_channels": ["email", "dashboard"]
}
```

#### Step 5: Scenario Simulation
```
Analyst → API: POST /api/v1/scenarios
{
  "name": "Iran Energy Supply Disruption",
  "model_type": "supply_chain",
  "parameters": {
    "affected_country": "IRN",
    "disruption_severity": 0.80,
    "duration_days": 60
  }
}
```

#### Step 6: Decision Support
- Executive Dashboard displays risk summary
- Policy recommendations generated
- Alternative supply sources identified
- Economic impact estimated

### Expected Outcomes
- **Early Warning**: 2-4 weeks advance notice of potential disruptions
- **Risk Quantification**: Numerical risk scores with confidence intervals
- **Actionable Intelligence**: Specific recommendations for mitigation
- **Scenario Planning**: What-if analysis for different disruption scenarios

### Success Metrics
- Risk prediction accuracy: > 75%
- False positive rate: < 20%
- Time to detection: < 24 hours from event
- User satisfaction: > 4.0/5.0

---

## Use Case 2: Critical Infrastructure Digital Twin

### Scenario
A critical infrastructure operator (e.g., power grid) needs to monitor and simulate resilience of their infrastructure network using a digital twin.

### Actors
- **Primary**: Infrastructure Operators
- **Secondary**: Regulators
- **Tertiary**: Emergency Response Teams

### Objectives
- Real-time monitoring of infrastructure status (public data only)
- Failure scenario simulation
- Resilience testing
- Impact assessment for natural disasters

### Workflow

#### Step 1: Digital Twin Creation
```
Operator → API: POST /api/v1/twins/create
{
  "name": "National Power Grid - Region A",
  "infrastructure_type": "power_grid",
  "components": [
    {
      "id": "substation-1",
      "type": "substation",
      "location": {"lat": -23.5505, "lon": -46.6333},
      "capacity_mw": 500,
      "age_years": 25
    },
    {
      "id": "transmission-line-1",
      "type": "transmission_line",
      "from": "substation-1",
      "to": "substation-2",
      "length_km": 150
    }
  ]
}
```

#### Step 2: Real-Time Status Monitoring
```
System → Continuous Monitoring:
- Weather data integration (extreme weather events)
- Public infrastructure status feeds
- Historical failure patterns
```

#### Step 3: Failure Simulation
```
Operator → API: POST /api/v1/twins/{twin_id}/simulate
{
  "scenario": "hurricane",
  "parameters": {
    "wind_speed_mph": 120,
    "affected_region": "coastal",
    "duration_hours": 48
  }
}
```

#### Step 4: Simulation Results
```json
{
  "scenario_id": "sim-456",
  "results": {
    "affected_facilities": 12,
    "estimated_outage_customers": 250000,
    "critical_paths_disrupted": 3,
    "estimated_restoration_hours": 72,
    "cascading_failure_risk": 0.45,
    "mitigation_recommendations": [
      "Pre-position repair crews in region",
      "Activate backup transmission routes",
      "Coordinate with neighboring grids"
    ]
  }
}
```

#### Step 5: Resilience Testing
```
Operator → API: GET /api/v1/twins/{twin_id}/resilience
{
  "test_scenarios": [
    "earthquake",
    "cyber_attack",
    "equipment_failure"
  ]
}
```

### Expected Outcomes
- **Proactive Planning**: Identify vulnerabilities before failures
- **Resilience Metrics**: Quantified resilience scores
- **Emergency Preparedness**: Improved response planning
- **Cost Optimization**: Prioritize investments in high-impact areas

### Success Metrics
- Simulation accuracy: > 80% (validated against historical events)
- Time to identify vulnerabilities: < 1 hour
- User adoption: > 70% of infrastructure operators
- Reduction in unplanned outages: 15-20%

---

## Use Case 3: Supply Chain Disruption Early Warning

### Scenario
A government trade department needs to monitor global supply chains for critical goods (e.g., semiconductors, pharmaceuticals) and receive early warnings of potential disruptions.

### Actors
- **Primary**: Trade Analysts
- **Secondary**: Industry Representatives
- **Tertiary**: Policy Makers

### Objectives
- Monitor global supply chain networks
- Detect early warning signals of disruptions
- Identify alternative supply sources
- Assess economic impact of disruptions

### Workflow

#### Step 1: Supply Chain Mapping
```
Analyst → API: POST /api/v1/supplychain/map
{
  "product_category": "semiconductors",
  "key_regions": ["asia-pacific", "north-america"],
  "critical_components": ["chips", "wafers", "packaging"]
}
```

#### Step 2: Graph Construction
```
System → Automatic:
- Entity extraction from trade data
- Relationship identification
- Network graph construction
- Dependency analysis
```

#### Step 3: Disruption Forecasting
```
System → Continuous Monitoring:
- Trade flow analysis
- Port/airport status monitoring
- Geopolitical event correlation
- Weather impact assessment
```

#### Step 4: Early Warning Alert
```
System → Alert: POST /api/v1/supplychain/{id}/alerts
{
  "alert_type": "disruption_warning",
  "severity": "high",
  "affected_route": "asia-pacific → north-america",
  "disruption_probability": 0.72,
  "estimated_impact_days": 30,
  "key_indicators": [
    "Port congestion increasing",
    "Geopolitical tensions rising",
    "Trade flow decreasing"
  ]
}
```

#### Step 5: Alternative Route Analysis
```
Analyst → API: GET /api/v1/supplychain/{id}/alternatives
{
  "disrupted_route": "route-123",
  "criteria": {
    "max_delay_days": 7,
    "cost_increase_percent": 20
  }
}
```

#### Step 6: Economic Impact Assessment
```
Analyst → API: POST /api/v1/scenarios
{
  "name": "Semiconductor Supply Disruption",
  "model_type": "economic",
  "parameters": {
    "disruption_severity": 0.75,
    "duration_days": 60,
    "affected_industries": ["electronics", "automotive"]
  }
}
```

### Expected Outcomes
- **Early Detection**: 2-6 weeks advance warning
- **Alternative Identification**: 3-5 alternative routes/sources
- **Impact Quantification**: Economic impact estimates
- **Policy Support**: Data-driven policy recommendations

### Success Metrics
- Early warning accuracy: > 70%
- Time to detection: < 48 hours from initial signals
- Alternative route identification: 100% of disruptions
- Economic impact prediction accuracy: ±15%

---

## Use Case 4: Regulatory Compliance Monitoring

### Scenario
A financial regulator needs to monitor global regulatory changes and assess their impact on financial institutions and markets.

### Actors
- **Primary**: Regulatory Analysts
- **Secondary**: Financial Institutions
- **Tertiary**: Policy Makers

### Objectives
- Monitor regulatory announcements globally
- Assess compliance impact
- Identify regulatory trends
- Support policy development

### Workflow

#### Step 1: Regulatory Source Registration
```
Analyst → API: POST /api/v1/government/sources
{
  "name": "SEC Regulatory Announcements",
  "type": "government_portal",
  "url": "https://www.sec.gov/news/pressreleases",
  "jurisdiction": "USA",
  "update_frequency": "daily"
}
```

#### Step 2: Automatic Monitoring
```
System → Continuous:
- Government portal monitoring
- Regulatory filing parsing
- Change detection
- Classification (financial, environmental, etc.)
```

#### Step 3: Regulatory Change Alert
```
System → Alert:
{
  "change_id": "reg-789",
  "source": "SEC",
  "title": "New Cybersecurity Disclosure Requirements",
  "date": "2024-01-15",
  "impact_level": "high",
  "affected_sectors": ["financial_services"],
  "compliance_deadline": "2024-07-01",
  "summary": "New requirements for cybersecurity incident disclosure..."
}
```

#### Step 4: Compliance Impact Analysis
```
Analyst → API: POST /api/v1/policies/analyze
{
  "policy_id": "reg-789",
  "scope": {
    "jurisdiction": "USA",
    "sectors": ["financial_services"],
    "institution_types": ["banks", "investment_firms"]
  }
}
```

#### Step 5: Impact Assessment Results
```json
{
  "analysis_id": "analysis-123",
  "affected_institutions": 1250,
  "compliance_gaps": [
    {
      "gap_type": "cybersecurity_disclosure",
      "affected_institutions": 850,
      "severity": "high",
      "estimated_compliance_cost": 50000000
    }
  ],
  "stakeholder_impacts": [
    {
      "stakeholder": "large_banks",
      "impact_score": 0.85,
      "key_requirements": ["incident_reporting", "risk_assessment"]
    }
  ]
}
```

#### Step 6: Trend Analysis
```
Analyst → API: GET /api/v1/regulatory/trends?jurisdiction=USA&period=1y
{
  "trends": [
    {
      "topic": "cybersecurity",
      "frequency": 45,
      "trend": "increasing",
      "key_regulations": ["reg-789", "reg-790"]
    }
  ]
}
```

### Expected Outcomes
- **Proactive Compliance**: Early identification of new requirements
- **Impact Assessment**: Quantified compliance impacts
- **Trend Identification**: Regulatory trend analysis
- **Policy Support**: Data-driven policy recommendations

### Success Metrics
- Regulatory change detection: < 24 hours from publication
- Compliance gap identification: > 90% accuracy
- Cost estimation accuracy: ±20%
- User satisfaction: > 4.0/5.0

---

## Use Case 5: Crisis Response Planning

### Scenario
An emergency management agency needs to simulate and plan responses to various crisis scenarios (natural disasters, pandemics, infrastructure failures).

### Actors
- **Primary**: Emergency Management Planners
- **Secondary**: First Responders
- **Tertiary**: Government Officials

### Objectives
- Scenario-based crisis planning
- Resource allocation optimization
- Response time estimation
- Coordination planning

### Workflow

#### Step 1: Crisis Scenario Definition
```
Planner → API: POST /api/v1/wargames/create
{
  "name": "Major Earthquake - Coastal Region",
  "scenario_type": "natural_disaster",
  "parameters": {
    "magnitude": 7.5,
    "epicenter": {"lat": -23.5505, "lon": -46.6333},
    "affected_population": 5000000,
    "infrastructure_impact": {
      "power_grid": 0.60,
      "transportation": 0.70,
      "communications": 0.50
    }
  }
}
```

#### Step 2: Scenario Execution
```
Planner → API: POST /api/v1/wargames/{id}/execute
{
  "simulation_duration_hours": 72,
  "response_teams": [
    {"type": "medical", "count": 50, "response_time_hours": 2},
    {"type": "search_rescue", "count": 30, "response_time_hours": 4}
  ]
}
```

#### Step 3: Simulation Results
```json
{
  "wargame_id": "wg-456",
  "status": "completed",
  "results": {
    "casualties_estimated": {
      "immediate": 500,
      "within_24h": 2000,
      "within_72h": 5000
    },
    "infrastructure_damage": {
      "critical_facilities": 25,
      "estimated_restoration_days": 14
    },
    "resource_requirements": {
      "medical_personnel": 200,
      "shelter_capacity": 100000,
      "water_supply_liters": 50000000
    },
    "response_timeline": [
      {
        "hour": 0,
        "events": ["Earthquake occurs", "Initial damage assessment"],
        "actions_required": ["Activate emergency response", "Deploy assessment teams"]
      },
      {
        "hour": 24,
        "events": ["Search and rescue operations", "Medical triage"],
        "actions_required": ["Deploy medical teams", "Establish shelters"]
      }
    ],
    "bottlenecks": [
      "Transportation infrastructure damage limits access",
      "Medical facilities overwhelmed",
      "Communication systems partially down"
    ],
    "recommendations": [
      "Pre-position resources in high-risk areas",
      "Establish alternative communication channels",
      "Coordinate with neighboring regions"
    ]
  }
}
```

#### Step 4: Response Plan Generation
```
System → Automatic:
- Resource allocation optimization
- Timeline generation
- Coordination plan
- Communication plan
```

#### Step 5: Plan Comparison
```
Planner → API: GET /api/v1/wargames/compare?ids=wg-456,wg-457
{
  "comparison": {
    "scenarios": ["Major Earthquake", "Hurricane"],
    "key_differences": {
      "response_time": "Earthquake requires faster initial response",
      "resource_needs": "Hurricane requires more shelter capacity",
      "duration": "Earthquake recovery longer term"
    },
    "common_requirements": [
      "Medical personnel",
      "Communication systems",
      "Transportation coordination"
    ]
  }
}
```

### Expected Outcomes
- **Improved Preparedness**: Better understanding of crisis scenarios
- **Optimized Resources**: Efficient resource allocation
- **Faster Response**: Reduced response times
- **Better Coordination**: Improved inter-agency coordination

### Success Metrics
- Scenario simulation accuracy: > 75% (validated against historical events)
- Response time improvement: 20-30% reduction
- Resource utilization efficiency: 15-25% improvement
- User satisfaction: > 4.0/5.0

---

## Use Case 6: Economic Intelligence for Policy Making

### Scenario
A central bank or finance ministry needs economic intelligence to support monetary and fiscal policy decisions.

### Actors
- **Primary**: Economic Analysts
- **Secondary**: Policy Makers
- **Tertiary**: Research Institutions

### Objectives
- Monitor global economic indicators
- Forecast economic trends
- Assess policy impacts
- Identify economic risks

### Workflow

#### Step 1: Economic Indicator Monitoring
```
Analyst → API: GET /api/v1/economics/indicators?country=USA&period=1y
{
  "indicators": [
    {
      "name": "GDP Growth",
      "value": 2.5,
      "unit": "percent",
      "trend": "decreasing",
      "forecast_3m": 2.2,
      "forecast_6m": 2.0
    },
    {
      "name": "Inflation Rate",
      "value": 3.2,
      "unit": "percent",
      "trend": "stable",
      "forecast_3m": 3.1,
      "forecast_6m": 3.0
    }
  ]
}
```

#### Step 2: Economic Risk Assessment
```
Analyst → API: POST /api/v1/risks/assess
{
  "entity_id": "country-USA",
  "entity_type": "country",
  "dimensions": ["economic"],
  "time_horizon": "6m"
}
```

#### Step 3: Policy Impact Simulation
```
Analyst → API: POST /api/v1/scenarios
{
  "name": "Interest Rate Increase Impact",
  "model_type": "economic",
  "parameters": {
    "policy_change": "interest_rate_increase",
    "magnitude": 0.5,
    "affected_sectors": ["housing", "consumer_spending"]
  }
}
```

#### Step 4: Forecast Analysis
```
Analyst → API: POST /api/v1/forecast/predict
{
  "model_id": "economic-forecast-v2",
  "target": "GDP_growth",
  "horizon_months": 6,
  "scenarios": [
    "baseline",
    "optimistic",
    "pessimistic"
  ]
}
```

### Expected Outcomes
- **Data-Driven Decisions**: Evidence-based policy making
- **Risk Identification**: Early identification of economic risks
- **Impact Assessment**: Quantified policy impacts
- **Forecast Accuracy**: Improved economic forecasting

### Success Metrics
- Forecast accuracy: RMSE < 2% for GDP forecasts
- Risk prediction accuracy: > 70%
- Policy impact prediction accuracy: ±15%
- User satisfaction: > 4.0/5.0

---

## Cross-Cutting Use Cases

### Use Case 7: Multi-Domain Intelligence Fusion

**Scenario**: Combine intelligence from multiple domains (geopolitical, economic, infrastructure) for comprehensive risk assessment.

**Workflow**:
1. Multi-domain risk assessment
2. Cross-domain correlation analysis
3. Integrated scenario simulation
4. Comprehensive decision support

### Use Case 8: Real-Time Threat Monitoring

**Scenario**: Continuous monitoring of multiple threat vectors with real-time alerts.

**Workflow**:
1. Continuous data ingestion
2. Real-time anomaly detection
3. Automated alert generation
4. Dashboard visualization

---

## Use Case Success Criteria

### Common Success Metrics
- **Accuracy**: Model predictions match reality (> 70% for most use cases)
- **Timeliness**: Early detection/warning (hours to weeks advance notice)
- **Actionability**: Clear, specific recommendations
- **User Satisfaction**: > 4.0/5.0 average rating
- **Adoption**: > 70% of target users actively using platform

### Use Case-Specific Metrics
See individual use cases above for specific metrics.

---

## Conclusion

These use cases demonstrate the breadth and depth of the ATLAS Strategic Intelligence Platform, showing how it supports various government and critical infrastructure needs while maintaining strict legal and ethical boundaries.
