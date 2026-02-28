package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// Cache is the interface for cache operations
type Cache interface {
	Get(ctx context.Context, key string, dest interface{}) error
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Delete(ctx context.Context, keys ...string) error
	Exists(ctx context.Context, keys ...string) (int64, error)
	Clear(ctx context.Context, pattern string) error
	IncrementCounter(ctx context.Context, key string, increment int64) (int64, error)
	DecrementCounter(ctx context.Context, key string, decrement int64) (int64, error)
	GetCounter(ctx context.Context, key string) (int64, error)
	PublishEvent(ctx context.Context, channel string, message interface{}) error
	SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error)
	HealthCheck(ctx context.Context) error
	Close() error
}

// RedisCache implements Cache using Redis
type RedisCache struct {
	client *redis.Client
	logger *zap.Logger
}

// NewRedisCache creates a new Redis cache
func NewRedisCache(redisURL string, logger *zap.Logger) (*RedisCache, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse redis URL: %w", err)
	}

	opts.PoolSize = 50
	opts.MinIdleConns = 10
	opts.DialTimeout = 5 * time.Second
	opts.ReadTimeout = 3 * time.Second
	opts.WriteTimeout = 3 * time.Second
	opts.PoolTimeout = 4 * time.Second

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	logger.Info("Connected to Redis", zap.Int("pool_size", opts.PoolSize))
	return &RedisCache{client: client, logger: logger}, nil
}

// Get retrieves a value from cache
func (c *RedisCache) Get(ctx context.Context, key string, dest interface{}) error {
	val, err := c.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return fmt.Errorf("key not found: %s", key)
	}
	if err != nil {
		c.logger.Error("Failed to get from cache", zap.String("key", key), zap.Error(err))
		return err
	}

	if err := json.Unmarshal([]byte(val), dest); err != nil {
		c.logger.Error("Failed to unmarshal cache value", zap.String("key", key), zap.Error(err))
		return err
	}

	return nil
}

// Set stores a value in cache
func (c *RedisCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		c.logger.Error("Failed to marshal value for cache", zap.String("key", key), zap.Error(err))
		return err
	}

	if err := c.client.Set(ctx, key, data, ttl).Err(); err != nil {
		c.logger.Error("Failed to set cache", zap.String("key", key), zap.Error(err))
		return err
	}

	return nil
}

// SetNX sets a value only if it doesn't exist (for idempotency keys, distributed locks)
func (c *RedisCache) SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return false, err
	}

	result, err := c.client.SetNX(ctx, key, data, ttl).Result()
	if err != nil {
		c.logger.Error("Failed to setnx cache", zap.String("key", key), zap.Error(err))
		return false, err
	}

	return result, nil
}

// Delete removes values from cache
func (c *RedisCache) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}

	if err := c.client.Del(ctx, keys...).Err(); err != nil {
		c.logger.Error("Failed to delete from cache", zap.Strings("keys", keys), zap.Error(err))
		return err
	}

	return nil
}

// Exists checks if keys exist in cache
func (c *RedisCache) Exists(ctx context.Context, keys ...string) (int64, error) {
	count, err := c.client.Exists(ctx, keys...).Result()
	if err != nil {
		c.logger.Error("Failed to check cache existence", zap.Strings("keys", keys), zap.Error(err))
		return 0, err
	}
	return count, nil
}

// Clear removes all keys matching a pattern from cache
func (c *RedisCache) Clear(ctx context.Context, pattern string) error {
	iter := c.client.Scan(ctx, 0, pattern, 100).Iterator()
	var keys []string

	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}

	if err := iter.Err(); err != nil {
		c.logger.Error("Failed to scan cache keys", zap.String("pattern", pattern), zap.Error(err))
		return err
	}

	if len(keys) > 0 {
		return c.Delete(ctx, keys...)
	}

	return nil
}

// IncrementCounter increments a counter
func (c *RedisCache) IncrementCounter(ctx context.Context, key string, increment int64) (int64, error) {
	val, err := c.client.IncrBy(ctx, key, increment).Result()
	if err != nil {
		c.logger.Error("Failed to increment counter", zap.String("key", key), zap.Error(err))
		return 0, err
	}
	return val, nil
}

// DecrementCounter decrements a counter
func (c *RedisCache) DecrementCounter(ctx context.Context, key string, decrement int64) (int64, error) {
	val, err := c.client.DecrBy(ctx, key, decrement).Result()
	if err != nil {
		c.logger.Error("Failed to decrement counter", zap.String("key", key), zap.Error(err))
		return 0, err
	}
	return val, nil
}

// GetCounter gets a counter value
func (c *RedisCache) GetCounter(ctx context.Context, key string) (int64, error) {
	val, err := c.client.Get(ctx, key).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	if err != nil {
		c.logger.Error("Failed to get counter", zap.String("key", key), zap.Error(err))
		return 0, err
	}
	return val, nil
}

// PublishEvent publishes an event to a channel
func (c *RedisCache) PublishEvent(ctx context.Context, channel string, message interface{}) error {
	data, err := json.Marshal(message)
	if err != nil {
		return err
	}

	if err := c.client.Publish(ctx, channel, string(data)).Err(); err != nil {
		c.logger.Error("Failed to publish event", zap.String("channel", channel), zap.Error(err))
		return err
	}

	return nil
}

// HealthCheck checks the health of the cache
func (c *RedisCache) HealthCheck(ctx context.Context) error {
	return c.client.Ping(ctx).Err()
}

// Close closes the cache connection
func (c *RedisCache) Close() error {
	return c.client.Close()
}

// InMemoryCache implements Cache using thread-safe in-memory storage (for development/testing)
type InMemoryCache struct {
	mu     sync.RWMutex
	data   map[string]cacheEntry
	logger *zap.Logger
}

type cacheEntry struct {
	value     []byte
	expiresAt time.Time
}

// NewInMemoryCache creates a new in-memory cache
func NewInMemoryCache(logger *zap.Logger) *InMemoryCache {
	c := &InMemoryCache{
		data:   make(map[string]cacheEntry),
		logger: logger,
	}
	go c.cleanup()
	return c
}

// cleanup periodically removes expired entries
func (c *InMemoryCache) cleanup() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for k, v := range c.data {
			if !v.expiresAt.IsZero() && now.After(v.expiresAt) {
				delete(c.data, k)
			}
		}
		c.mu.Unlock()
	}
}

// Get retrieves a value from cache
func (c *InMemoryCache) Get(ctx context.Context, key string, dest interface{}) error {
	c.mu.RLock()
	entry, exists := c.data[key]
	c.mu.RUnlock()

	if !exists {
		return fmt.Errorf("key not found: %s", key)
	}

	if !entry.expiresAt.IsZero() && time.Now().After(entry.expiresAt) {
		c.mu.Lock()
		delete(c.data, key)
		c.mu.Unlock()
		return fmt.Errorf("key not found: %s", key)
	}

	return json.Unmarshal(entry.value, dest)
}

// Set stores a value in cache
func (c *InMemoryCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}

	entry := cacheEntry{value: data}
	if ttl > 0 {
		entry.expiresAt = time.Now().Add(ttl)
	}

	c.mu.Lock()
	c.data[key] = entry
	c.mu.Unlock()

	return nil
}

// SetNX sets a value only if it doesn't exist
func (c *InMemoryCache) SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if entry, exists := c.data[key]; exists {
		if entry.expiresAt.IsZero() || time.Now().Before(entry.expiresAt) {
			return false, nil
		}
	}

	data, err := json.Marshal(value)
	if err != nil {
		return false, err
	}

	entry := cacheEntry{value: data}
	if ttl > 0 {
		entry.expiresAt = time.Now().Add(ttl)
	}

	c.data[key] = entry
	return true, nil
}

// Delete removes values from cache
func (c *InMemoryCache) Delete(ctx context.Context, keys ...string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, key := range keys {
		delete(c.data, key)
	}
	return nil
}

// Exists checks if keys exist in cache
func (c *InMemoryCache) Exists(ctx context.Context, keys ...string) (int64, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	count := int64(0)
	now := time.Now()
	for _, key := range keys {
		if entry, exists := c.data[key]; exists {
			if entry.expiresAt.IsZero() || now.Before(entry.expiresAt) {
				count++
			}
		}
	}
	return count, nil
}

// Clear removes all keys matching a pattern from cache
func (c *InMemoryCache) Clear(ctx context.Context, pattern string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	for key := range c.data {
		if key == pattern || pattern == "*" {
			delete(c.data, key)
		}
	}
	return nil
}

// IncrementCounter increments a counter
func (c *InMemoryCache) IncrementCounter(ctx context.Context, key string, increment int64) (int64, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	var val int64
	if entry, exists := c.data[key]; exists {
		json.Unmarshal(entry.value, &val)
	}
	val += increment
	data, _ := json.Marshal(val)
	c.data[key] = cacheEntry{value: data}
	return val, nil
}

// DecrementCounter decrements a counter
func (c *InMemoryCache) DecrementCounter(ctx context.Context, key string, decrement int64) (int64, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	var val int64
	if entry, exists := c.data[key]; exists {
		json.Unmarshal(entry.value, &val)
	}
	val -= decrement
	data, _ := json.Marshal(val)
	c.data[key] = cacheEntry{value: data}
	return val, nil
}

// GetCounter gets a counter value
func (c *InMemoryCache) GetCounter(ctx context.Context, key string) (int64, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	var val int64
	if entry, exists := c.data[key]; exists {
		json.Unmarshal(entry.value, &val)
	}
	return val, nil
}

// PublishEvent publishes an event to a channel
func (c *InMemoryCache) PublishEvent(ctx context.Context, channel string, message interface{}) error {
	c.logger.Info("Event published (in-memory)", zap.String("channel", channel))
	return nil
}

// HealthCheck checks the health of the cache
func (c *InMemoryCache) HealthCheck(ctx context.Context) error {
	return nil
}

// Close closes the cache connection
func (c *InMemoryCache) Close() error {
	return nil
}
