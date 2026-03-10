package vault

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	vault "github.com/hashicorp/vault/api"
)

// Client wraps HashiCorp Vault client with caching and auto-renewal
type Client struct {
	client *vault.Client
	cache  map[string]*cachedSecret
	mu     sync.RWMutex
	ttl    time.Duration
}

type cachedSecret struct {
	data      map[string]interface{}
	expiresAt time.Time
}

// Config holds Vault connection configuration
type Config struct {
	Address   string
	Token     string
	RoleID    string
	SecretID  string
	MountPath string
	CacheTTL  time.Duration
}

// NewClient creates a new Vault client with optional caching
func NewClient(cfg Config) (*Client, error) {
	config := vault.DefaultConfig()
	config.Address = cfg.Address
	config.Timeout = 10 * time.Second

	client, err := vault.NewClient(config)
	if err != nil {
		return nil, fmt.Errorf("vault: failed to create client: %w", err)
	}

	// AppRole authentication (production)
	if cfg.RoleID != "" && cfg.SecretID != "" {
		secret, err := client.Logical().Write("auth/approle/login", map[string]interface{}{
			"role_id":   cfg.RoleID,
			"secret_id": cfg.SecretID,
		})
		if err != nil {
			return nil, fmt.Errorf("vault: approle login failed: %w", err)
		}
		client.SetToken(secret.Auth.ClientToken)
	} else if cfg.Token != "" {
		client.SetToken(cfg.Token)
	}

	ttl := cfg.CacheTTL
	if ttl == 0 {
		ttl = 5 * time.Minute
	}

	return &Client{
		client: client,
		cache:  make(map[string]*cachedSecret),
		ttl:    ttl,
	}, nil
}

// GetSecret reads a secret from Vault KV v2 with caching
func (c *Client) GetSecret(ctx context.Context, path string) (map[string]interface{}, error) {
	// Check cache first
	c.mu.RLock()
	if cached, ok := c.cache[path]; ok && time.Now().Before(cached.expiresAt) {
		c.mu.RUnlock()
		return cached.data, nil
	}
	c.mu.RUnlock()

	// Read from Vault
	secret, err := c.client.Logical().ReadWithContext(ctx, path)
	if err != nil {
		return nil, fmt.Errorf("vault: failed to read %s: %w", path, err)
	}
	if secret == nil || secret.Data == nil {
		return nil, fmt.Errorf("vault: no data at path %s", path)
	}

	// KV v2 wraps data in a "data" key
	data, ok := secret.Data["data"].(map[string]interface{})
	if !ok {
		data = secret.Data
	}

	// Update cache
	c.mu.Lock()
	c.cache[path] = &cachedSecret{
		data:      data,
		expiresAt: time.Now().Add(c.ttl),
	}
	c.mu.Unlock()

	return data, nil
}

// GetString reads a single string value from a secret path
func (c *Client) GetString(ctx context.Context, path, key string) (string, error) {
	data, err := c.GetSecret(ctx, path)
	if err != nil {
		return "", err
	}
	val, ok := data[key].(string)
	if !ok {
		return "", fmt.Errorf("vault: key %s not found or not a string at %s", key, path)
	}
	return val, nil
}

// GetDatabaseCredentials returns database connection credentials
func (c *Client) GetDatabaseCredentials(ctx context.Context) (*DatabaseCredentials, error) {
	data, err := c.GetSecret(ctx, "secret/data/atlas/database")
	if err != nil {
		return nil, err
	}
	return &DatabaseCredentials{
		Host:     data["host"].(string),
		Port:     data["port"].(string),
		Username: data["username"].(string),
		Password: data["password"].(string),
		Database: data["database"].(string),
		SSLMode:  getStringOrDefault(data, "sslmode", "require"),
	}, nil
}

// GetJWTSecret returns the JWT signing secret
func (c *Client) GetJWTSecret(ctx context.Context) (string, error) {
	return c.GetString(ctx, "secret/data/atlas/jwt", "secret")
}

// GetRedisCredentials returns Redis connection credentials
func (c *Client) GetRedisCredentials(ctx context.Context) (*RedisCredentials, error) {
	data, err := c.GetSecret(ctx, "secret/data/atlas/redis")
	if err != nil {
		return nil, err
	}
	return &RedisCredentials{
		Host:     data["host"].(string),
		Port:     data["port"].(string),
		Password: getStringOrDefault(data, "password", ""),
		DB:       getStringOrDefault(data, "db", "0"),
	}, nil
}

// GetKafkaCredentials returns Kafka connection credentials
func (c *Client) GetKafkaCredentials(ctx context.Context) (*KafkaCredentials, error) {
	data, err := c.GetSecret(ctx, "secret/data/atlas/kafka")
	if err != nil {
		return nil, err
	}
	return &KafkaCredentials{
		Brokers:  data["brokers"].(string),
		Username: getStringOrDefault(data, "username", ""),
		Password: getStringOrDefault(data, "password", ""),
		SASL:     getStringOrDefault(data, "sasl_mechanism", ""),
	}, nil
}

// GetAPIKeys returns API key signing material
func (c *Client) GetAPIKeys(ctx context.Context) (map[string]string, error) {
	data, err := c.GetSecret(ctx, "secret/data/atlas/api-keys")
	if err != nil {
		return nil, err
	}
	keys := make(map[string]string)
	for k, v := range data {
		if s, ok := v.(string); ok {
			keys[k] = s
		}
	}
	return keys, nil
}

// InvalidateCache removes a cached secret
func (c *Client) InvalidateCache(path string) {
	c.mu.Lock()
	delete(c.cache, path)
	c.mu.Unlock()
}

// StartTokenRenewal begins a background goroutine to renew the Vault token
func (c *Client) StartTokenRenewal(ctx context.Context) {
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-time.After(30 * time.Minute):
				secret, err := c.client.Auth().Token().RenewSelfWithContext(ctx, 3600)
				if err != nil {
					log.Printf("vault: token renewal failed: %v", err)
					continue
				}
				if secret.Auth != nil {
					log.Printf("vault: token renewed, ttl=%ds", secret.Auth.LeaseDuration)
				}
			}
		}
	}()
}

// Health checks Vault server health
func (c *Client) Health(ctx context.Context) error {
	health, err := c.client.Sys().HealthWithContext(ctx)
	if err != nil {
		return fmt.Errorf("vault: health check failed: %w", err)
	}
	if !health.Initialized {
		return fmt.Errorf("vault: not initialized")
	}
	if health.Sealed {
		return fmt.Errorf("vault: sealed")
	}
	return nil
}

// DatabaseCredentials holds PostgreSQL connection info
type DatabaseCredentials struct {
	Host     string
	Port     string
	Username string
	Password string
	Database string
	SSLMode  string
}

// DSN returns a PostgreSQL connection string
func (d *DatabaseCredentials) DSN() string {
	return fmt.Sprintf("postgresql://%s:%s@%s:%s/%s?sslmode=%s",
		d.Username, d.Password, d.Host, d.Port, d.Database, d.SSLMode)
}

// RedisCredentials holds Redis connection info
type RedisCredentials struct {
	Host     string
	Port     string
	Password string
	DB       string
}

// URL returns a Redis connection URL
func (r *RedisCredentials) URL() string {
	if r.Password != "" {
		return fmt.Sprintf("redis://:%s@%s:%s/%s", r.Password, r.Host, r.Port, r.DB)
	}
	return fmt.Sprintf("redis://%s:%s/%s", r.Host, r.Port, r.DB)
}

// KafkaCredentials holds Kafka connection info
type KafkaCredentials struct {
	Brokers  string
	Username string
	Password string
	SASL     string
}

func getStringOrDefault(data map[string]interface{}, key, defaultVal string) string {
	if val, ok := data[key].(string); ok {
		return val
	}
	return defaultVal
}
