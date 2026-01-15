package sources

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type NewsAPIClient struct {
	APIKey string
	BaseURL string
	Client  *http.Client
}

func NewNewsAPIClient(apiKey string) *NewsAPIClient {
	return &NewsAPIClient{
		APIKey:  apiKey,
		BaseURL: "https://newsapi.org/v2",
		Client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

type NewsAPIResponse struct {
	Status       string    `json:"status"`
	TotalResults int       `json:"totalResults"`
	Articles     []Article `json:"articles"`
}

type Article struct {
	Source      Source    `json:"source"`
	Author      string    `json:"author"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	URL         string    `json:"url"`
	URLToImage  string    `json:"urlToImage"`
	PublishedAt time.Time `json:"publishedAt"`
	Content     string    `json:"content"`
}

type Source struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func (c *NewsAPIClient) FetchTopHeadlines(country, category string, pageSize int) (*NewsAPIResponse, error) {
	url := fmt.Sprintf("%s/top-headlines?country=%s&category=%s&pageSize=%d&apiKey=%s",
		c.BaseURL, country, category, pageSize, c.APIKey)

	resp, err := c.Client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch news: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("news API error: %s", string(body))
	}

	var result NewsAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

func (c *NewsAPIClient) FetchEverything(query string, pageSize int) (*NewsAPIResponse, error) {
	url := fmt.Sprintf("%s/everything?q=%s&pageSize=%d&apiKey=%s",
		c.BaseURL, query, pageSize, c.APIKey)

	resp, err := c.Client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch news: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("news API error: %s", string(body))
	}

	var result NewsAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}
