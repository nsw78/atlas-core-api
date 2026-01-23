// ATLAS - Scenario Builder Types and Data

export type ScenarioType = "cyber_attack" | "energy_failure" | "geopolitical_conflict" | "climate_disaster" | "supply_chain_collapse";

export interface ScenarioTemplate {
  type: ScenarioType;
  label: string;
  description: string;
  icon: string;
  color: string;
  parameters: ScenarioParameter[];
}

export interface ScenarioParameter {
  key: string;
  label: string;
  type: "select" | "range" | "text" | "region" | "number";
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue: string | number;
  unit?: string;
}

export interface SavedScenario {
  id: string;
  name: string;
  type: ScenarioType;
  status: "draft" | "running" | "completed" | "failed";
  parameters: Record<string, string | number>;
  createdAt: string;
  completedAt?: string;
  results?: ScenarioResults;
}

export interface ScenarioResults {
  overallImpact: number;
  economicImpact: number;
  socialImpact: number;
  infrastructureImpact: number;
  environmentalImpact: number;
  probability: number;
  confidence: number;
  timeline: { day: number; event: string; impact: number }[];
  recommendations: string[];
  affectedRegions: string[];
}

export const scenarioTemplates: ScenarioTemplate[] = [
  {
    type: "cyber_attack",
    label: "Cyber Attack",
    description: "Simulate coordinated cyber attacks on critical infrastructure, financial systems, or government networks",
    icon: "shield",
    color: "#8b5cf6",
    parameters: [
      {
        key: "target_sector",
        label: "Target Sector",
        type: "select",
        options: [
          { value: "energy", label: "Energy Infrastructure" },
          { value: "finance", label: "Financial Systems" },
          { value: "government", label: "Government Networks" },
          { value: "healthcare", label: "Healthcare Systems" },
          { value: "telecom", label: "Telecommunications" },
        ],
        defaultValue: "energy",
      },
      {
        key: "attack_vector",
        label: "Attack Vector",
        type: "select",
        options: [
          { value: "ransomware", label: "Ransomware" },
          { value: "apt", label: "Advanced Persistent Threat" },
          { value: "ddos", label: "DDoS Attack" },
          { value: "supply_chain", label: "Supply Chain Compromise" },
          { value: "zero_day", label: "Zero-Day Exploit" },
        ],
        defaultValue: "apt",
      },
      { key: "sophistication", label: "Sophistication Level", type: "range", min: 1, max: 10, step: 1, defaultValue: 7 },
      { key: "duration_days", label: "Duration", type: "number", min: 1, max: 365, defaultValue: 14, unit: "days" },
      { key: "region", label: "Target Region", type: "region", defaultValue: "EU" },
    ],
  },
  {
    type: "energy_failure",
    label: "Energy Grid Failure",
    description: "Model cascading failures in electricity grids, gas pipelines, or renewable energy systems",
    icon: "bolt",
    color: "#f59e0b",
    parameters: [
      {
        key: "failure_type",
        label: "Failure Type",
        type: "select",
        options: [
          { value: "blackout", label: "Large-Scale Blackout" },
          { value: "cascade", label: "Cascading Grid Failure" },
          { value: "pipeline", label: "Gas Pipeline Disruption" },
          { value: "renewable", label: "Renewable Intermittency Crisis" },
          { value: "nuclear", label: "Nuclear Facility Incident" },
        ],
        defaultValue: "cascade",
      },
      { key: "capacity_loss", label: "Capacity Loss", type: "range", min: 10, max: 100, step: 5, defaultValue: 40, unit: "%" },
      { key: "affected_population", label: "Affected Population", type: "number", min: 100000, max: 500000000, defaultValue: 10000000, unit: "people" },
      { key: "duration_hours", label: "Duration", type: "number", min: 1, max: 720, defaultValue: 72, unit: "hours" },
      { key: "region", label: "Affected Region", type: "region", defaultValue: "EU" },
    ],
  },
  {
    type: "geopolitical_conflict",
    label: "Geopolitical Conflict",
    description: "Analyze escalation scenarios, trade wars, sanctions, and territorial disputes",
    icon: "globe",
    color: "#ef4444",
    parameters: [
      {
        key: "conflict_type",
        label: "Conflict Type",
        type: "select",
        options: [
          { value: "trade_war", label: "Trade War / Sanctions" },
          { value: "territorial", label: "Territorial Dispute" },
          { value: "proxy", label: "Proxy Conflict" },
          { value: "economic_coercion", label: "Economic Coercion" },
          { value: "information_warfare", label: "Information Warfare" },
        ],
        defaultValue: "trade_war",
      },
      { key: "escalation_level", label: "Escalation Level", type: "range", min: 1, max: 10, step: 1, defaultValue: 5 },
      { key: "duration_months", label: "Duration", type: "number", min: 1, max: 60, defaultValue: 6, unit: "months" },
      {
        key: "primary_actors",
        label: "Primary Actors",
        type: "select",
        options: [
          { value: "us_cn", label: "US - China" },
          { value: "nato_ru", label: "NATO - Russia" },
          { value: "me_regional", label: "Middle East Regional" },
          { value: "indo_pacific", label: "Indo-Pacific" },
          { value: "custom", label: "Custom" },
        ],
        defaultValue: "us_cn",
      },
      { key: "region", label: "Primary Region", type: "region", defaultValue: "APAC" },
    ],
  },
  {
    type: "climate_disaster",
    label: "Climate Disaster",
    description: "Model extreme weather events, sea level rise, and climate-related infrastructure impacts",
    icon: "cloud",
    color: "#06b6d4",
    parameters: [
      {
        key: "disaster_type",
        label: "Disaster Type",
        type: "select",
        options: [
          { value: "hurricane", label: "Hurricane / Cyclone" },
          { value: "flood", label: "Major Flooding" },
          { value: "drought", label: "Severe Drought" },
          { value: "wildfire", label: "Wildfire Season" },
          { value: "sea_level", label: "Sea Level Rise" },
        ],
        defaultValue: "hurricane",
      },
      { key: "intensity", label: "Intensity", type: "range", min: 1, max: 5, step: 1, defaultValue: 4, unit: "category" },
      { key: "affected_area", label: "Affected Area", type: "number", min: 100, max: 1000000, defaultValue: 50000, unit: "km2" },
      { key: "duration_days", label: "Duration", type: "number", min: 1, max: 180, defaultValue: 7, unit: "days" },
      { key: "region", label: "Affected Region", type: "region", defaultValue: "NA" },
    ],
  },
  {
    type: "supply_chain_collapse",
    label: "Supply Chain Collapse",
    description: "Simulate disruptions to global logistics, critical mineral supplies, and manufacturing networks",
    icon: "truck",
    color: "#10b981",
    parameters: [
      {
        key: "disruption_type",
        label: "Disruption Type",
        type: "select",
        options: [
          { value: "chokepoint", label: "Maritime Chokepoint Blockage" },
          { value: "semiconductor", label: "Semiconductor Shortage" },
          { value: "minerals", label: "Critical Mineral Embargo" },
          { value: "logistics", label: "Global Logistics Collapse" },
          { value: "food", label: "Food Supply Disruption" },
        ],
        defaultValue: "chokepoint",
      },
      { key: "severity", label: "Severity", type: "range", min: 1, max: 10, step: 1, defaultValue: 7 },
      { key: "supply_reduction", label: "Supply Reduction", type: "range", min: 10, max: 100, step: 5, defaultValue: 50, unit: "%" },
      { key: "duration_weeks", label: "Duration", type: "number", min: 1, max: 52, defaultValue: 8, unit: "weeks" },
      { key: "region", label: "Origin Region", type: "region", defaultValue: "APAC" },
    ],
  },
];

export const savedScenarios: SavedScenario[] = [
  {
    id: "SCN-001",
    name: "Taiwan Strait Semiconductor Disruption",
    type: "supply_chain_collapse",
    status: "completed",
    parameters: { disruption_type: "semiconductor", severity: 8, supply_reduction: 60, duration_weeks: 12, region: "APAC" },
    createdAt: "2024-01-15T10:00:00Z",
    completedAt: "2024-01-15T10:05:23Z",
    results: {
      overallImpact: 87,
      economicImpact: 92,
      socialImpact: 45,
      infrastructureImpact: 78,
      environmentalImpact: 12,
      probability: 35,
      confidence: 88,
      timeline: [
        { day: 1, event: "Initial supply disruption detected", impact: 15 },
        { day: 7, event: "Inventory buffers depleted at major manufacturers", impact: 35 },
        { day: 14, event: "Production line shutdowns begin", impact: 55 },
        { day: 30, event: "Cascading effects across automotive & electronics", impact: 75 },
        { day: 60, event: "Peak economic impact reached", impact: 92 },
        { day: 84, event: "Alternative supply routes partially operational", impact: 70 },
      ],
      recommendations: [
        "Diversify semiconductor sourcing across multiple geographies",
        "Increase strategic inventory buffers to 90-day supply",
        "Accelerate domestic fabrication capacity investments",
        "Establish bilateral supply agreements with allied nations",
      ],
      affectedRegions: ["East Asia", "North America", "Europe"],
    },
  },
  {
    id: "SCN-002",
    name: "European Grid Cascade Failure",
    type: "energy_failure",
    status: "completed",
    parameters: { failure_type: "cascade", capacity_loss: 45, affected_population: 50000000, duration_hours: 96, region: "EU" },
    createdAt: "2024-01-10T14:30:00Z",
    completedAt: "2024-01-10T14:38:12Z",
    results: {
      overallImpact: 79,
      economicImpact: 82,
      socialImpact: 88,
      infrastructureImpact: 91,
      environmentalImpact: 25,
      probability: 18,
      confidence: 91,
      timeline: [
        { day: 0, event: "Initial generator trip - loss of 2.4 GW", impact: 20 },
        { day: 0, event: "Frequency deviation triggers protection relays", impact: 45 },
        { day: 1, event: "Cascading load shedding across 5 countries", impact: 75 },
        { day: 2, event: "Full blackout in affected interconnection zone", impact: 91 },
        { day: 3, event: "Partial restoration begins from black-start units", impact: 70 },
        { day: 4, event: "80% load restored, investigation ongoing", impact: 35 },
      ],
      recommendations: [
        "Increase frequency containment reserve requirements",
        "Deploy battery storage for inertia support",
        "Upgrade protection relay coordination schemes",
        "Conduct regular black-start exercises",
      ],
      affectedRegions: ["Central Europe", "Western Europe"],
    },
  },
  {
    id: "SCN-003",
    name: "APT Campaign Against Financial Infrastructure",
    type: "cyber_attack",
    status: "running",
    parameters: { target_sector: "finance", attack_vector: "apt", sophistication: 9, duration_days: 30, region: "NA" },
    createdAt: "2024-01-20T09:15:00Z",
  },
];
