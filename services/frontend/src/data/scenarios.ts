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
    label: "scenarioTypes.cyberAttack",
    description: "scenarioTypes.cyberAttackDesc",
    icon: "shield",
    color: "#8b5cf6",
    parameters: [
      {
        key: "target_sector",
        label: "scenarioParams.targetSector",
        type: "select",
        options: [
          { value: "energy", label: "scenarioParams.energyInfra" },
          { value: "finance", label: "scenarioParams.financialSystems" },
          { value: "government", label: "scenarioParams.governmentNetworks" },
          { value: "healthcare", label: "scenarioParams.healthcareSystems" },
          { value: "telecom", label: "scenarioParams.telecommunications" },
        ],
        defaultValue: "energy",
      },
      {
        key: "attack_vector",
        label: "scenarioParams.attackVector",
        type: "select",
        options: [
          { value: "ransomware", label: "scenarioParams.ransomware" },
          { value: "apt", label: "scenarioParams.apt" },
          { value: "ddos", label: "scenarioParams.ddos" },
          { value: "supply_chain", label: "scenarioParams.supplyChainCompromise" },
          { value: "zero_day", label: "scenarioParams.zeroDayExploit" },
        ],
        defaultValue: "apt",
      },
      { key: "sophistication", label: "scenarioParams.sophisticationLevel", type: "range", min: 1, max: 10, step: 1, defaultValue: 7 },
      { key: "duration_days", label: "scenarioParams.duration", type: "number", min: 1, max: 365, defaultValue: 14, unit: "scenarioParams.days" },
      { key: "region", label: "scenarioParams.targetRegion", type: "region", defaultValue: "EU" },
    ],
  },
  {
    type: "energy_failure",
    label: "scenarioTypes.energyFailure",
    description: "scenarioTypes.energyFailureDesc",
    icon: "bolt",
    color: "#f59e0b",
    parameters: [
      {
        key: "failure_type",
        label: "scenarioParams.failureType",
        type: "select",
        options: [
          { value: "blackout", label: "scenarioParams.largeScaleBlackout" },
          { value: "cascade", label: "scenarioParams.cascadingGridFailure" },
          { value: "pipeline", label: "scenarioParams.gasPipelineDisruption" },
          { value: "renewable", label: "scenarioParams.renewableIntermittency" },
          { value: "nuclear", label: "scenarioParams.nuclearIncident" },
        ],
        defaultValue: "cascade",
      },
      { key: "capacity_loss", label: "scenarioParams.capacityLoss", type: "range", min: 10, max: 100, step: 5, defaultValue: 40, unit: "%" },
      { key: "affected_population", label: "scenarioParams.affectedPopulation", type: "number", min: 100000, max: 500000000, defaultValue: 10000000, unit: "scenarioParams.people" },
      { key: "duration_hours", label: "scenarioParams.duration", type: "number", min: 1, max: 720, defaultValue: 72, unit: "scenarioParams.hours" },
      { key: "region", label: "scenarioParams.affectedRegion", type: "region", defaultValue: "EU" },
    ],
  },
  {
    type: "geopolitical_conflict",
    label: "scenarioTypes.geopoliticalConflict",
    description: "scenarioTypes.geopoliticalConflictDesc",
    icon: "globe",
    color: "#ef4444",
    parameters: [
      {
        key: "conflict_type",
        label: "scenarioParams.conflictType",
        type: "select",
        options: [
          { value: "trade_war", label: "scenarioParams.tradeWarSanctions" },
          { value: "territorial", label: "scenarioParams.territorialDispute" },
          { value: "proxy", label: "scenarioParams.proxyConflict" },
          { value: "economic_coercion", label: "scenarioParams.economicCoercion" },
          { value: "information_warfare", label: "scenarioParams.informationWarfare" },
        ],
        defaultValue: "trade_war",
      },
      { key: "escalation_level", label: "scenarioParams.escalationLevel", type: "range", min: 1, max: 10, step: 1, defaultValue: 5 },
      { key: "duration_months", label: "scenarioParams.duration", type: "number", min: 1, max: 60, defaultValue: 6, unit: "scenarioParams.months" },
      {
        key: "primary_actors",
        label: "scenarioParams.primaryActors",
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
      { key: "region", label: "scenarioParams.primaryRegion", type: "region", defaultValue: "APAC" },
    ],
  },
  {
    type: "climate_disaster",
    label: "scenarioTypes.climateDisaster",
    description: "scenarioTypes.climateDisasterDesc",
    icon: "cloud",
    color: "#06b6d4",
    parameters: [
      {
        key: "disaster_type",
        label: "scenarioParams.disasterType",
        type: "select",
        options: [
          { value: "hurricane", label: "scenarioParams.hurricaneCyclone" },
          { value: "flood", label: "scenarioParams.majorFlooding" },
          { value: "drought", label: "scenarioParams.severeDrought" },
          { value: "wildfire", label: "scenarioParams.wildfireSeason" },
          { value: "sea_level", label: "scenarioParams.seaLevelRise" },
        ],
        defaultValue: "hurricane",
      },
      { key: "intensity", label: "scenarioParams.intensity", type: "range", min: 1, max: 5, step: 1, defaultValue: 4, unit: "scenarioParams.category" },
      { key: "affected_area", label: "scenarioParams.affectedArea", type: "number", min: 100, max: 1000000, defaultValue: 50000, unit: "km2" },
      { key: "duration_days", label: "scenarioParams.duration", type: "number", min: 1, max: 180, defaultValue: 7, unit: "scenarioParams.days" },
      { key: "region", label: "scenarioParams.affectedRegion", type: "region", defaultValue: "NA" },
    ],
  },
  {
    type: "supply_chain_collapse",
    label: "scenarioTypes.supplyChainCollapse",
    description: "scenarioTypes.supplyChainCollapseDesc",
    icon: "truck",
    color: "#10b981",
    parameters: [
      {
        key: "disruption_type",
        label: "scenarioParams.disruptionType",
        type: "select",
        options: [
          { value: "chokepoint", label: "scenarioParams.maritimeChokepoint" },
          { value: "semiconductor", label: "scenarioParams.semiconductorShortage" },
          { value: "minerals", label: "scenarioParams.criticalMineralEmbargo" },
          { value: "logistics", label: "scenarioParams.globalLogisticsCollapse" },
          { value: "food", label: "scenarioParams.foodSupplyDisruption" },
        ],
        defaultValue: "chokepoint",
      },
      { key: "severity", label: "scenarioParams.severity", type: "range", min: 1, max: 10, step: 1, defaultValue: 7 },
      { key: "supply_reduction", label: "scenarioParams.supplyReduction", type: "range", min: 10, max: 100, step: 5, defaultValue: 50, unit: "%" },
      { key: "duration_weeks", label: "scenarioParams.duration", type: "number", min: 1, max: 52, defaultValue: 8, unit: "scenarioParams.weeks" },
      { key: "region", label: "scenarioParams.originRegion", type: "region", defaultValue: "APAC" },
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
