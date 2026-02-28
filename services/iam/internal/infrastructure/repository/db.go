package repository

import (
	"database/sql"
	"time"

	_ "github.com/lib/pq"
)

// DBConfig holds enterprise connection pool configuration
type DBConfig struct {
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

// DefaultDBConfig returns production-ready pool defaults
func DefaultDBConfig() DBConfig {
	return DBConfig{
		MaxOpenConns:    25,
		MaxIdleConns:    10,
		ConnMaxLifetime: 5 * time.Minute,
		ConnMaxIdleTime: 3 * time.Minute,
	}
}

// NewPostgresDB creates a new PostgreSQL connection with enterprise connection pooling
func NewPostgresDB(databaseURL string, cfgs ...DBConfig) (*sql.DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}

	cfg := DefaultDBConfig()
	if len(cfgs) > 0 {
		cfg = cfgs[0]
	}

	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	db.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}
