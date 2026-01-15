package sources

import (
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"time"
)

type RSSClient struct {
	Client *http.Client
}

func NewRSSClient() *RSSClient {
	return &RSSClient{
		Client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

type RSSFeed struct {
	XMLName xml.Name `xml:"rss"`
	Channel Channel  `xml:"channel"`
}

type Channel struct {
	Title       string    `xml:"title"`
	Link        string    `xml:"link"`
	Description string    `xml:"description"`
	Items       []RSSItem `xml:"item"`
}

type RSSItem struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	PubDate     string `xml:"pubDate"`
	Author      string `xml:"author"`
	GUID        string `xml:"guid"`
}

func (c *RSSClient) FetchFeed(url string) (*RSSFeed, error) {
	resp, err := c.Client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch RSS feed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("RSS feed error: %s", string(body))
	}

	var feed RSSFeed
	decoder := xml.NewDecoder(resp.Body)
	if err := decoder.Decode(&feed); err != nil {
		return nil, fmt.Errorf("failed to decode RSS feed: %w", err)
	}

	return &feed, nil
}

func (c *RSSClient) ParseItems(feed *RSSFeed) []map[string]interface{} {
	items := make([]map[string]interface{}, 0, len(feed.Channel.Items))
	
	for _, item := range feed.Channel.Items {
		data := map[string]interface{}{
			"title":       item.Title,
			"link":        item.Link,
			"description": item.Description,
			"pub_date":    item.PubDate,
			"author":      item.Author,
			"guid":        item.GUID,
			"source":      feed.Channel.Title,
		}
		items = append(items, data)
	}
	
	return items
}
