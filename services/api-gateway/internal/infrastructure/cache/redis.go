package cache

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisCache struct {
	client *redis.Client
	ctx    context.Context
}

func NewRedisCache(addr string, password string, db int) *RedisCache {
	client := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           db,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		PoolSize:     10,
		MinIdleConns: 5,
	})

	return &RedisCache{
		client: client,
		ctx:    context.Background(),
	}
}

// Get retrieves a value from cache
func (r *RedisCache) Get(key string, dest interface{}) error {
	val, err := r.client.Get(r.ctx, key).Result()
	if err == redis.Nil {
		return nil // Key does not exist
	}
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(val), dest)
}

// Set stores a value in cache with TTL
func (r *RedisCache) Set(key string, value interface{}, ttl time.Duration) error {
	json, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return r.client.Set(r.ctx, key, json, ttl).Err()
}

// Delete removes a key from cache
func (r *RedisCache) Delete(key string) error {
	return r.client.Del(r.ctx, key).Err()
}

// Exists checks if a key exists
func (r *RedisCache) Exists(key string) (bool, error) {
	count, err := r.client.Exists(r.ctx, key).Result()
	return count > 0, err
}

// Ping checks if Redis is reachable
func (r *RedisCache) Ping() error {
	return r.client.Ping(r.ctx).Err()
}

// Close closes the Redis connection
func (r *RedisCache) Close() error {
	return r.client.Close()
}

// CacheKey generates a cache key from multiple parts
func CacheKey(parts ...string) string {
	key := "atlas"
	for _, part := range parts {
		key += ":" + part
	}
	return key
}
