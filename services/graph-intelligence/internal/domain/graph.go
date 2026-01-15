package models

type Entity struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"` // person, organization, location, event
	Name     string                 `json:"name"`
	Properties map[string]interface{} `json:"properties"`
}

type Relationship struct {
	ID         string                 `json:"id"`
	Type       string                 `json:"type"` // OWNS, EMPLOYS, LOCATED_IN, etc.
	From       string                 `json:"from"`
	To         string                 `json:"to"`
	Properties map[string]interface{} `json:"properties"`
}

type ResolveEntitiesRequest struct {
	Entities []Entity `json:"entities" binding:"required"`
}

type ResolvedEntity struct {
	OriginalEntities []string `json:"original_entities"`
	ResolvedID       string   `json:"resolved_id"`
	Confidence       float64  `json:"confidence"`
}

type RiskPropagationRequest struct {
	EntityID  string  `json:"entity_id" binding:"required"`
	MaxDepth  int     `json:"max_depth"`
	Threshold float64 `json:"threshold"`
}

type RiskPropagationResult struct {
	EntityID         string             `json:"entity_id"`
	PropagationScores map[string]float64 `json:"propagation_scores"`
	AffectedEntities []string           `json:"affected_entities"`
	MaxDepth         int                `json:"max_depth"`
}

type Community struct {
	ID        string   `json:"id"`
	Members   []string `json:"members"`
	Size      int      `json:"size"`
	Modularity float64 `json:"modularity"`
}

type CentralityResult struct {
	EntityID  string  `json:"entity_id"`
	PageRank  float64 `json:"pagerank"`
	Betweenness float64 `json:"betweenness"`
	Closeness  float64 `json:"closeness"`
}

type GraphStats struct {
	TotalNodes     int64   `json:"total_nodes"`
	TotalRelationships int64   `json:"total_relationships"`
	NodeTypes      map[string]int64 `json:"node_types"`
	RelationshipTypes map[string]int64 `json:"relationship_types"`
	AverageDegree  float64 `json:"average_degree"`
}
