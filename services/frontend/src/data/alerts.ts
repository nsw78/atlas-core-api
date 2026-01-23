// ATLAS - Enterprise Alert Data (mirrors GDELT, CISA, ENTSO-E, NOAA sources)

export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertCategory = "cyber" | "infrastructure" | "energy" | "geopolitical" | "climate" | "supply_chain";
export type AlertStatus = "unread" | "read" | "acknowledged" | "investigating" | "dismissed";

export interface AlertDetail {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  category: AlertCategory;
  status: AlertStatus;
  source: string;
  sourceUrl?: string;
  region: string;
  country?: string;
  coordinates?: [number, number];
  impact: string;
  estimatedImpactScore: number;
  timestamp: string;
  updatedAt: string;
  relatedEntities: string[];
  recommendations: string[];
  externalLinks: { label: string; url: string }[];
}

const now = Date.now();
const h = (hours: number) => new Date(now - hours * 3600000).toISOString();
const m = (minutes: number) => new Date(now - minutes * 60000).toISOString();

export const mockAlerts: AlertDetail[] = [
  {
    id: "ALT-2024-001",
    title: "Critical Infrastructure: Elevated DDoS activity targeting European energy SCADA systems",
    description: "Multiple coordinated DDoS attacks detected against Supervisory Control and Data Acquisition (SCADA) systems across Northern European energy infrastructure. Attack vectors include amplification attacks leveraging NTP and DNS protocols. Initial indicators suggest state-sponsored APT group involvement. ENTSO-E has issued an advisory to all TSOs in the affected region.",
    severity: "critical",
    category: "cyber",
    status: "unread",
    source: "CISA / US-CERT",
    sourceUrl: "https://www.cisa.gov/news-events/alerts",
    region: "Northern Europe",
    country: "Multiple (DE, SE, NO, FI)",
    coordinates: [13.4, 52.5],
    impact: "Potential disruption to energy grid operations affecting 12M+ consumers. Risk of cascading failures across interconnected grids.",
    estimatedImpactScore: 92,
    timestamp: m(12),
    updatedAt: m(5),
    relatedEntities: ["ENTSO-E", "E.ON", "Vattenfall", "Fingrid"],
    recommendations: [
      "Activate incident response protocols for SCADA systems",
      "Enable enhanced monitoring on all ICS/OT networks",
      "Coordinate with national CERTs for threat intelligence sharing",
      "Prepare manual override procedures for critical substations",
    ],
    externalLinks: [
      { label: "CISA Alert AA24-015", url: "https://www.cisa.gov/news-events/alerts" },
      { label: "ENTSO-E Advisory", url: "https://www.entsoe.eu" },
    ],
  },
  {
    id: "ALT-2024-002",
    title: "Supply Chain: Semiconductor logistics disruption in Taiwan Strait",
    description: "Increased naval activity and temporary shipping restrictions in the Taiwan Strait are causing delays in semiconductor component shipments. TSMC and ASE Group facilities report logistics complications. Estimated 15-20% reduction in outbound shipment capacity for the next 72 hours. Major tech manufacturers are activating contingency supply routes via alternative ports.",
    severity: "high",
    category: "supply_chain",
    status: "unread",
    source: "GDELT Project / Maritime Intelligence",
    region: "East Asia",
    country: "Taiwan",
    coordinates: [120.5, 24.0],
    impact: "Global semiconductor supply chain disruption. Potential $2.1B daily economic impact across downstream industries.",
    estimatedImpactScore: 85,
    timestamp: m(45),
    updatedAt: m(30),
    relatedEntities: ["TSMC", "ASE Group", "MediaTek", "Foxconn"],
    recommendations: [
      "Activate alternative shipping routes via Kaohsiung and Manila",
      "Notify downstream manufacturers of potential delays",
      "Assess inventory buffers across critical components",
      "Monitor situation for escalation indicators",
    ],
    externalLinks: [
      { label: "GDELT Event Monitor", url: "https://www.gdeltproject.org" },
      { label: "AIS Maritime Data", url: "https://www.marinetraffic.com" },
    ],
  },
  {
    id: "ALT-2024-003",
    title: "Energy: Grid frequency instability detected across Central European interconnection",
    description: "ENTSO-E real-time monitoring has detected abnormal frequency deviations (49.85 Hz, threshold: 49.90 Hz) across the Continental European synchronous area. Root cause analysis indicates unexpected loss of 2.4 GW generation capacity in the Franco-German border region. Automatic frequency restoration reserves have been activated.",
    severity: "high",
    category: "energy",
    status: "read",
    source: "ENTSO-E Transparency Platform",
    sourceUrl: "https://transparency.entsoe.eu",
    region: "Central Europe",
    country: "France / Germany",
    coordinates: [7.5, 48.5],
    impact: "Risk of automatic load shedding if frequency drops below 49.80 Hz. 45M consumers potentially affected.",
    estimatedImpactScore: 78,
    timestamp: h(2),
    updatedAt: h(1),
    relatedEntities: ["RTE France", "Amprion", "TransnetBW", "ENTSO-E"],
    recommendations: [
      "Monitor frequency restoration reserve activation",
      "Prepare demand response programs for activation",
      "Assess cross-border power flow constraints",
      "Notify industrial consumers of potential curtailment",
    ],
    externalLinks: [
      { label: "ENTSO-E Frequency Data", url: "https://transparency.entsoe.eu" },
    ],
  },
  {
    id: "ALT-2024-004",
    title: "Geopolitical: New trade sanctions impacting rare earth mineral supply",
    description: "Newly announced export restrictions on critical rare earth minerals (neodymium, dysprosium, terbium) from primary producing nations. Effective implementation within 30 days. Analysis indicates 40% reduction in available global supply for defense and technology applications. Price futures have spiked 25% in pre-market trading.",
    severity: "high",
    category: "geopolitical",
    status: "unread",
    source: "GDELT / Reuters Intelligence",
    region: "Global",
    country: "Multiple",
    coordinates: [104.0, 35.0],
    impact: "Strategic mineral supply disruption affecting defense, EV manufacturing, and renewable energy sectors. Estimated $15B annual trade impact.",
    estimatedImpactScore: 81,
    timestamp: h(3),
    updatedAt: h(2),
    relatedEntities: ["Lynas Corp", "MP Materials", "Northern Minerals", "US DoD"],
    recommendations: [
      "Assess strategic reserve levels for critical minerals",
      "Identify alternative supply sources (Australia, Canada)",
      "Review defense program dependencies on affected minerals",
      "Engage diplomatic channels for exemption negotiations",
    ],
    externalLinks: [
      { label: "GDELT Analysis", url: "https://www.gdeltproject.org" },
      { label: "USGS Mineral Data", url: "https://www.usgs.gov/centers/national-minerals-information-center" },
    ],
  },
  {
    id: "ALT-2024-005",
    title: "Climate: Category 4 tropical cyclone approaching critical port infrastructure",
    description: "NOAA National Hurricane Center tracking Category 4 tropical cyclone (sustained winds 210 km/h) with projected landfall near major port facilities within 48 hours. Storm surge estimates of 4-6 meters. Multiple LNG terminals, refinery complexes, and container ports in projected path. Pre-emptive evacuations initiated.",
    severity: "critical",
    category: "climate",
    status: "investigating",
    source: "NOAA / National Hurricane Center",
    sourceUrl: "https://www.nhc.noaa.gov",
    region: "Gulf of Mexico",
    country: "United States",
    coordinates: [-90.0, 28.0],
    impact: "Potential shutdown of 35% US Gulf refining capacity. LNG export disruptions. Container port closures affecting $800M daily trade flows.",
    estimatedImpactScore: 88,
    timestamp: h(6),
    updatedAt: m(90),
    relatedEntities: ["Port of Houston", "Cheniere Energy", "ExxonMobil Baytown", "LOOP LLC"],
    recommendations: [
      "Activate port closure protocols",
      "Coordinate vessel routing alternatives",
      "Assess refinery shutdown procedures",
      "Monitor NHC advisories every 6 hours",
      "Pre-position emergency response assets",
    ],
    externalLinks: [
      { label: "NHC Advisory", url: "https://www.nhc.noaa.gov" },
      { label: "NOAA Weather", url: "https://www.weather.gov" },
    ],
  },
  {
    id: "ALT-2024-006",
    title: "Infrastructure: Submarine cable damage detected in Mediterranean Sea",
    description: "Multiple submarine telecommunications cables in the Eastern Mediterranean have reported signal degradation consistent with physical damage. Affected routes carry approximately 25% of Europe-Asia data traffic. Cable repair vessels have been dispatched but estimated repair time is 2-4 weeks. Traffic rerouting via alternative cable systems is underway.",
    severity: "medium",
    category: "infrastructure",
    status: "read",
    source: "TeleGeography / Cable Monitor",
    region: "Eastern Mediterranean",
    country: "Multiple (GR, EG, IL)",
    coordinates: [30.0, 34.0],
    impact: "25% reduction in Europe-Asia data bandwidth. Increased latency for financial trading systems. Cloud service degradation in affected regions.",
    estimatedImpactScore: 62,
    timestamp: h(8),
    updatedAt: h(4),
    relatedEntities: ["Telecom Egypt", "Sparkle", "BSNL", "SubCom"],
    recommendations: [
      "Activate backup routing protocols",
      "Notify affected customers of potential latency increases",
      "Coordinate with cable operators on repair timeline",
      "Assess impact on financial trading infrastructure",
    ],
    externalLinks: [
      { label: "TeleGeography Cable Map", url: "https://www.submarinecablemap.com" },
    ],
  },
  {
    id: "ALT-2024-007",
    title: "Cyber: Zero-day vulnerability in industrial control firmware",
    description: "A critical zero-day vulnerability (CVSS 9.8) has been identified in Siemens SIMATIC S7 PLC firmware versions 2.x-4.x, affecting an estimated 120,000+ industrial installations globally. Proof-of-concept exploit code has been observed in underground forums. The vulnerability allows remote code execution without authentication on affected PLCs controlling water treatment, manufacturing, and energy systems.",
    severity: "critical",
    category: "cyber",
    status: "unread",
    source: "ICS-CERT / Siemens ProductCERT",
    region: "Global",
    country: "Multiple",
    coordinates: [11.5, 48.1],
    impact: "120,000+ industrial installations at risk. Critical infrastructure sectors (water, energy, manufacturing) require immediate patching.",
    estimatedImpactScore: 95,
    timestamp: h(1),
    updatedAt: m(20),
    relatedEntities: ["Siemens AG", "Schneider Electric", "Rockwell Automation"],
    recommendations: [
      "Apply emergency firmware patch (v4.2.1) immediately",
      "Isolate affected PLCs from internet-facing networks",
      "Enable enhanced IDS/IPS rules for S7 protocol",
      "Conduct inventory of all affected firmware versions",
      "Report confirmed exploitation to ICS-CERT",
    ],
    externalLinks: [
      { label: "ICS-CERT Advisory", url: "https://www.cisa.gov/uscert/ics" },
      { label: "Siemens Security Advisory", url: "https://cert-portal.siemens.com" },
    ],
  },
  {
    id: "ALT-2024-008",
    title: "Energy: European natural gas storage below seasonal average",
    description: "EU natural gas storage levels have dropped to 62% capacity, 15 percentage points below the 5-year seasonal average. Cold weather forecasts for the next 2 weeks and reduced LNG imports due to Asian spot market competition are contributing factors. Several EU member states are approaching trigger levels for demand reduction measures.",
    severity: "medium",
    category: "energy",
    status: "acknowledged",
    source: "GIE AGSI+ / ENTSO-G",
    sourceUrl: "https://agsi.gie.eu",
    region: "European Union",
    country: "Multiple EU",
    coordinates: [10.0, 50.0],
    impact: "Risk of gas supply restrictions if cold spell persists. Industrial consumers may face curtailment. Gas price volatility expected.",
    estimatedImpactScore: 58,
    timestamp: h(12),
    updatedAt: h(6),
    relatedEntities: ["GIE", "Gazprom", "Equinor", "TotalEnergies"],
    recommendations: [
      "Monitor daily storage withdrawal rates",
      "Assess fuel-switching capabilities at power plants",
      "Coordinate with TSOs on interruptible supply contracts",
      "Review emergency gas supply regulations",
    ],
    externalLinks: [
      { label: "AGSI+ Storage Data", url: "https://agsi.gie.eu" },
      { label: "ENTSO-G Outlook", url: "https://www.entsog.eu" },
    ],
  },
];

export const alertCategories: { value: AlertCategory; label: string; color: string }[] = [
  { value: "cyber", label: "Cyber Security", color: "#8b5cf6" },
  { value: "infrastructure", label: "Infrastructure", color: "#3b82f6" },
  { value: "energy", label: "Energy", color: "#f59e0b" },
  { value: "geopolitical", label: "Geopolitical", color: "#ef4444" },
  { value: "climate", label: "Climate", color: "#06b6d4" },
  { value: "supply_chain", label: "Supply Chain", color: "#10b981" },
];

export const severityConfig: Record<AlertSeverity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: "Critical", color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30" },
  high: { label: "High", color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/30" },
  medium: { label: "Medium", color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30" },
  low: { label: "Low", color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30" },
};
