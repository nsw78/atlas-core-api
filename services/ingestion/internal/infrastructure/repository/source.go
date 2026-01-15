package repository

import (
	models "atlas-core-api/services/ingestion/internal/domain"
	"sync"
	"time"
)

type SourceRepository interface {
	Create(source *models.DataSource) error
	GetByID(id string) (*models.DataSource, error)
	List() ([]*models.DataSource, error)
	Update(source *models.DataSource) error
	Delete(id string) error
	UpdateLastSync(id string, t time.Time) error
}

type inMemorySourceRepository struct {
	sources map[string]*models.DataSource
	mu      sync.RWMutex
}

func NewSourceRepository() SourceRepository {
	return &inMemorySourceRepository{
		sources: make(map[string]*models.DataSource),
	}
}

func (r *inMemorySourceRepository) Create(source *models.DataSource) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	source.CreatedAt = time.Now()
	source.UpdatedAt = time.Now()
	r.sources[source.ID] = source
	return nil
}

func (r *inMemorySourceRepository) GetByID(id string) (*models.DataSource, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	source, exists := r.sources[id]
	if !exists {
		return nil, ErrNotFound
	}
	return source, nil
}

func (r *inMemorySourceRepository) List() ([]*models.DataSource, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	sources := make([]*models.DataSource, 0, len(r.sources))
	for _, source := range r.sources {
		sources = append(sources, source)
	}
	return sources, nil
}

func (r *inMemorySourceRepository) Update(source *models.DataSource) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	if _, exists := r.sources[source.ID]; !exists {
		return ErrNotFound
	}
	
	source.UpdatedAt = time.Now()
	r.sources[source.ID] = source
	return nil
}

func (r *inMemorySourceRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	if _, exists := r.sources[id]; !exists {
		return ErrNotFound
	}
	
	delete(r.sources, id)
	return nil
}

func (r *inMemorySourceRepository) UpdateLastSync(id string, t time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	source, exists := r.sources[id]
	if !exists {
		return ErrNotFound
	}
	
	source.LastSync = &t
	source.UpdatedAt = time.Now()
	return nil
}

var ErrNotFound = &RepositoryError{Message: "source not found"}

type RepositoryError struct {
	Message string
}

func (e *RepositoryError) Error() string {
	return e.Message
}
