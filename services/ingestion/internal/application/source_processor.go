package service

import (
	models "atlas-core-api/services/ingestion/internal/domain"
	"atlas-core-api/services/ingestion/internal/infrastructure/sources"
	"fmt"
	"time"
)

type SourceProcessor struct {
	ingestionService IngestionService
	newsAPIClient    *sources.NewsAPIClient
	rssClient       *sources.RSSClient
}

func NewSourceProcessor(ingestionService IngestionService, newsAPIKey string) *SourceProcessor {
	var newsAPI *sources.NewsAPIClient
	if newsAPIKey != "" {
		newsAPI = sources.NewNewsAPIClient(newsAPIKey)
	}

	return &SourceProcessor{
		ingestionService: ingestionService,
		newsAPIClient:    newsAPI,
		rssClient:        sources.NewRSSClient(),
	}
}

func (p *SourceProcessor) ProcessNewsAPISource(sourceID string, config map[string]interface{}) error {
	if p.newsAPIClient == nil {
		return fmt.Errorf("NewsAPI client not configured")
	}

	country := "us"
	if c, ok := config["country"].(string); ok {
		country = c
	}

	category := "general"
	if cat, ok := config["category"].(string); ok {
		category = cat
	}

	pageSize := 10
	if ps, ok := config["page_size"].(float64); ok {
		pageSize = int(ps)
	}

	response, err := p.newsAPIClient.FetchTopHeadlines(country, category, pageSize)
	if err != nil {
		return fmt.Errorf("failed to fetch from NewsAPI: %w", err)
	}

	// Ingest each article
	for _, article := range response.Articles {
		articleData := map[string]interface{}{
			"title":       article.Title,
			"description": article.Description,
			"url":         article.URL,
			"author":      article.Author,
			"published_at": article.PublishedAt.Format(time.RFC3339),
			"source":      article.Source.Name,
			"content":     article.Content,
		}

		if _, err := p.ingestionService.IngestData(sourceID, articleData); err != nil {
			// Log error but continue processing
			continue
		}
	}

	return nil
}

func (p *SourceProcessor) ProcessRSSSource(sourceID string, config map[string]interface{}) error {
	url, ok := config["url"].(string)
	if !ok || url == "" {
		return fmt.Errorf("RSS URL not provided in config")
	}

	feed, err := p.rssClient.FetchFeed(url)
	if err != nil {
		return fmt.Errorf("failed to fetch RSS feed: %w", err)
	}

	items := p.rssClient.ParseItems(feed)

	// Ingest each item
	for _, item := range items {
		if _, err := p.ingestionService.IngestData(sourceID, item); err != nil {
			// Log error but continue processing
			continue
		}
	}

	return nil
}

func (p *SourceProcessor) ProcessSyntheticSource(sourceID string, config map[string]interface{}) error {
	// Generate synthetic data for testing
	count := 5
	if c, ok := config["count"].(float64); ok {
		count = int(c)
	}

	for i := 0; i < count; i++ {
		syntheticData := map[string]interface{}{
			"id":          fmt.Sprintf("synthetic-%d-%d", time.Now().Unix(), i),
			"title":       fmt.Sprintf("Synthetic Event %d", i+1),
			"description": fmt.Sprintf("This is a synthetic data point %d for testing purposes", i+1),
			"timestamp":   time.Now().Format(time.RFC3339),
			"type":        "synthetic",
			"value":       fmt.Sprintf("value-%d", i),
		}

		if _, err := p.ingestionService.IngestData(sourceID, syntheticData); err != nil {
			continue
		}
	}

	return nil
}

func (p *SourceProcessor) ProcessSource(sourceID string) error {
	source, err := p.ingestionService.GetSource(sourceID)
	if err != nil {
		return err
	}

	switch source.Type {
	case models.SourceTypeNewsAPI:
		return p.ProcessNewsAPISource(sourceID, source.Config)
	case models.SourceTypeRSS:
		return p.ProcessRSSSource(sourceID, source.Config)
	case models.SourceTypeSynthetic:
		return p.ProcessSyntheticSource(sourceID, source.Config)
	default:
		return fmt.Errorf("unsupported source type: %s", source.Type)
	}
}
