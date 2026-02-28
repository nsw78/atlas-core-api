package cache

// CacheKey generates a cache key from multiple parts
func CacheKey(parts ...string) string {
	key := "atlas"
	for _, part := range parts {
		key += ":" + part
	}
	return key
}
