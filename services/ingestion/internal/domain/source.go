package models

import "time"

type SourceType string

const (
	SourceTypeNewsAPI    SourceType = "news_api"
	SourceTypeRSS         SourceType = "rss"
	SourceTypeManual      SourceType = "manual"
	SourceTypeSynthetic   SourceType = "synthetic"
	SourceTypeLicensed    SourceType = "licensed"
)

type DataSource struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Type        SourceType             `json:"type"`
	Config      map[string]interface{} `json:"config"`
	Status      string                 `json:"status"` // active, inactive, error
	LastSync    *time.Time             `json:"last_sync"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

type IngestedData struct {
	ID          string                 `json:"id"`
	SourceID    string                 `json:"source_id"`
	Data        map[string]interface{} `json:"data"`
	Metadata    DataMetadata           `json:"metadata"`
	IngestedAt  time.Time              `json:"ingested_at"`
}

type DataMetadata struct {
	Source      string    `json:"source"`
	Timestamp   time.Time `json:"timestamp"`
	Provenance  string    `json:"provenance"`
	Format      string    `json:"format"`
	Schema      string    `json:"schema"`
	Quality     float64   `json:"quality"` // 0-1 score
}

type IngestionStatus struct {
	TotalSources    int            `json:"total_sources"`
	ActiveSources   int            `json:"active_sources"`
	TotalIngested   int64          `json:"total_ingested"`
	Last24Hours     int64          `json:"last_24_hours"`
	ErrorRate       float64        `json:"error_rate"`
	SourcesStatus   []SourceStatus `json:"sources_status"`
}

type SourceStatus struct {
	SourceID    string    `json:"source_id"`
	Name        string    `json:"name"`
	Status      string    `json:"status"`
	LastSync    *time.Time `json:"last_sync"`
	Ingested24h int64     `json:"ingested_24h"`
	ErrorCount  int       `json:"error_count"`
}
