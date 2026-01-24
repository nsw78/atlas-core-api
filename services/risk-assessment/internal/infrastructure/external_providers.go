package infrastructure

import (
	"context"
	"time"
)

// ExternalDataProvider defines the interface for fetching real data from external sources
type ExternalDataProvider interface {
	GetFinancialData(entityID string, ctx context.Context) (*FinancialData, error)
	GetGeopoliticalData(entityID string, ctx context.Context) (*GeopoliticalData, error)
	GetComplianceData(entityID string, ctx context.Context) (*ComplianceData, error)
	GetOperationalData(entityID string, ctx context.Context) (*OperationalData, error)
	GetReputationalData(entityID string, ctx context.Context) (*ReputationalData, error)
}

// FinancialData represents financial risk indicators
type FinancialData struct {
	CreditScore       float64   `json:"credit_score"`
	DebtToEquity      float64   `json:"debt_to_equity"`
	RevenueGrowth     float64   `json:"revenue_growth"`
	ProfitMargin      float64   `json:"profit_margin"`
	MarketVolatility  float64   `json:"market_volatility"`
	LastUpdated       time.Time `json:"last_updated"`
	DataQuality       float64   `json:"data_quality"` // 0-1 scale
}

// GeopoliticalData represents geopolitical risk indicators
type GeopoliticalData struct {
	CountryRisk       float64   `json:"country_risk"`
	PoliticalStability float64  `json:"political_stability"`
	SanctionsExposure float64   `json:"sanctions_exposure"`
	TradeRelations    float64   `json:"trade_relations"`
	ConflictZones     []string  `json:"conflict_zones"`
	LastUpdated       time.Time `json:"last_updated"`
	DataQuality       float64   `json:"data_quality"`
}

// ComplianceData represents compliance risk indicators
type ComplianceData struct {
	RegulatoryFines   float64   `json:"regulatory_fines"`
	ComplianceScore   float64   `json:"compliance_score"`
	AuditFindings     int       `json:"audit_findings"`
	DataPrivacyRisk   float64   `json:"data_privacy_risk"`
	LegalActions      int       `json:"legal_actions"`
	LastUpdated       time.Time `json:"last_updated"`
	DataQuality       float64   `json:"data_quality"`
}

// OperationalData represents operational risk indicators
type OperationalData struct {
	CybersecurityIncidents int       `json:"cybersecurity_incidents"`
	SupplyChainRisk       float64   `json:"supply_chain_risk"`
	OperationalEfficiency float64   `json:"operational_efficiency"`
	EmployeeSatisfaction  float64   `json:"employee_satisfaction"`
	SystemDowntime        float64   `json:"system_downtime"`
	LastUpdated          time.Time `json:"last_updated"`
	DataQuality          float64   `json:"data_quality"`
}

// ReputationalData represents reputational risk indicators
type ReputationalData struct {
	SocialMediaSentiment float64   `json:"social_media_sentiment"`
	NewsCoverage         float64   `json:"news_coverage"`
	CustomerReviews      float64   `json:"customer_reviews"`
	BrandValue           float64   `json:"brand_value"`
	CSRScore             float64   `json:"csr_score"`
	LastUpdated          time.Time `json:"last_updated"`
	DataQuality          float64   `json:"data_quality"`
}

// DataProviderConfig holds configuration for external data providers
type DataProviderConfig struct {
	FinancialAPIKey     string
	FinancialBaseURL    string
	GeopoliticalAPIKey  string
	GeopoliticalBaseURL string
	ComplianceAPIKey    string
	ComplianceBaseURL   string
	NewsAPIKey          string
	NewsBaseURL         string
	Timeout             time.Duration
}