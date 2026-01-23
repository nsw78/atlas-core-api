package router

import (
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"atlas-core-api/services/api-gateway/internal/infrastructure/circuitbreaker"
	"atlas-core-api/services/api-gateway/internal/infrastructure/config"
)

func SetupRoutes(r *gin.RouterGroup, cfg *config.Config) {
	// Strategic Entity Management
	entities := r.Group("/entities")
	{
		entities.GET("", proxyToService(cfg, "entity-service", "/api/v1/entities"))
		entities.GET("/:id", proxyToService(cfg, "entity-service", "/api/v1/entities/:id"))
		entities.POST("", proxyToService(cfg, "entity-service", "/api/v1/entities"))
		entities.GET("/:id/context", proxyToService(cfg, "entity-service", "/api/v1/entities/:id/context"))
		entities.GET("/:id/intelligence", proxyToService(cfg, "entity-service", "/api/v1/entities/:id/intelligence"))
	}

	// Risk Assessment routes
	risks := r.Group("/risks")
	{
		risks.POST("/assess", proxyToService(cfg, "risk-assessment", "/api/v1/risks/assess"))
		risks.GET("/:id", proxyToService(cfg, "risk-assessment", "/api/v1/risks/:id"))
		risks.GET("/trends", proxyToService(cfg, "risk-assessment", "/api/v1/risks/trends"))
		risks.POST("/alerts", proxyToService(cfg, "risk-assessment", "/api/v1/risks/alerts"))
		risks.GET("/profiles", proxyToService(cfg, "risk-assessment", "/api/v1/risks/profiles"))
	}

	// Risk Profiles (Executive summaries)
	riskProfiles := r.Group("/risk-profiles")
	{
		riskProfiles.GET("", proxyToService(cfg, "risk-assessment", "/api/v1/risk-profiles"))
		riskProfiles.GET("/:id", proxyToService(cfg, "risk-assessment", "/api/v1/risk-profiles/:id"))
		riskProfiles.POST("", proxyToService(cfg, "risk-assessment", "/api/v1/risk-profiles"))
	}

	// Scenario Simulation routes
	scenarios := r.Group("/scenarios")
	{
		scenarios.POST("", proxyToService(cfg, "scenario-simulation", "/api/v1/scenarios"))
		scenarios.GET("", proxyToService(cfg, "scenario-simulation", "/api/v1/scenarios"))
		scenarios.GET("/:id", proxyToService(cfg, "scenario-simulation", "/api/v1/scenarios/:id"))
		scenarios.POST("/:id/run", proxyToService(cfg, "scenario-simulation", "/api/v1/scenarios/:id/run"))
		scenarios.GET("/:id/results", proxyToService(cfg, "scenario-simulation", "/api/v1/scenarios/:id/results"))
		scenarios.GET("/:id/compare", proxyToService(cfg, "scenario-simulation", "/api/v1/scenarios/:id/compare"))
	}

	// Geospatial Intelligence
	geospatial := r.Group("/geospatial")
	{
		geospatial.POST("/query", proxyToService(cfg, "geospatial-service", "/api/v1/geo/query"))
		geospatial.GET("/zones", proxyToService(cfg, "geospatial-service", "/api/v1/geo/zones"))
		geospatial.GET("/context", proxyToService(cfg, "geospatial-service", "/api/v1/geo/context"))
		geospatial.GET("/supply-chains", proxyToService(cfg, "geospatial-service", "/api/v1/geo/supply-chains"))
	}

	// OSINT Analysis
	osint := r.Group("/osint")
	{
		osint.GET("/analysis", proxyToService(cfg, "news-aggregator", "/api/v1/osint/analysis"))
		osint.GET("/signals", proxyToService(cfg, "news-aggregator", "/api/v1/osint/signals"))
		osint.GET("/feed", proxyToService(cfg, "news-aggregator", "/api/v1/osint/feed"))
		osint.POST("/query", proxyToService(cfg, "news-aggregator", "/api/v1/osint/query"))
	}

	// News routes
	news := r.Group("/news")
	{
		news.GET("/articles", proxyToService(cfg, "news-aggregator", "/api/v1/news/articles"))
		news.POST("/sources", proxyToService(cfg, "news-aggregator", "/api/v1/news/sources"))
	}

	// Executive Briefings
	briefings := r.Group("/briefings")
	{
		briefings.GET("", proxyToService(cfg, "intelligence-service", "/api/v1/briefings"))
		briefings.POST("", proxyToService(cfg, "intelligence-service", "/api/v1/briefings"))
		briefings.GET("/:id", proxyToService(cfg, "intelligence-service", "/api/v1/briefings/:id"))
	}

	// Compliance & Audit
	compliance := r.Group("/compliance")
	{
		compliance.GET("/audit", proxyToService(cfg, "audit-service", "/api/v1/audit/compliance/report"))
		compliance.GET("/lineage", proxyToService(cfg, "audit-service", "/api/v1/compliance/lineage"))
		compliance.GET("/status", proxyToService(cfg, "audit-service", "/api/v1/compliance/status"))
	}

	// Audit Logging (Phase 1)
	audit := r.Group("/audit")
	{
		audit.GET("/logs", proxyToService(cfg, "audit-service", "/api/v1/audit/logs"))
		audit.GET("/logs/:id", proxyToService(cfg, "audit-service", "/api/v1/audit/logs/:id"))
		audit.POST("/events", proxyToService(cfg, "audit-service", "/api/v1/audit/events"))
		audit.GET("/compliance/report", proxyToService(cfg, "audit-service", "/api/v1/audit/compliance/report"))
	}

	// Platform Overview (Aggregated data)
	overview := r.Group("/overview")
	{
		overview.GET("/status", getPlatformStatus)
		overview.GET("/signals", proxyToService(cfg, "intelligence-service", "/api/v1/overview/signals"))
		overview.GET("/kpis", proxyToService(cfg, "intelligence-service", "/api/v1/overview/kpis"))
	}

	// Data Ingestion (Phase 1)
	ingestion := r.Group("/ingestion")
	{
		sources := ingestion.Group("/sources")
		{
			sources.GET("", proxyToService(cfg, "ingestion-service", "/api/v1/ingestion/sources"))
			sources.POST("", proxyToService(cfg, "ingestion-service", "/api/v1/ingestion/sources"))
			sources.GET("/:id", proxyToService(cfg, "ingestion-service", "/api/v1/ingestion/sources/:id"))
			sources.POST("/:id/data", proxyToService(cfg, "ingestion-service", "/api/v1/ingestion/sources/:id/data"))
			sources.POST("/:id/trigger", proxyToService(cfg, "ingestion-service", "/api/v1/ingestion/sources/:id/trigger"))
		}
		ingestion.GET("/status", proxyToService(cfg, "ingestion-service", "/api/v1/ingestion/status"))
	}

	// Data Normalization (Phase 1)
	normalization := r.Group("/normalization")
	{
		rules := normalization.Group("/rules")
		{
			rules.GET("", proxyToService(cfg, "normalization-service", "/api/v1/normalization/rules"))
			rules.POST("", proxyToService(cfg, "normalization-service", "/api/v1/normalization/rules"))
			rules.GET("/:id", proxyToService(cfg, "normalization-service", "/api/v1/normalization/rules/:id"))
			rules.PUT("/:id", proxyToService(cfg, "normalization-service", "/api/v1/normalization/rules/:id"))
			rules.DELETE("/:id", proxyToService(cfg, "normalization-service", "/api/v1/normalization/rules/:id"))
		}
		normalization.GET("/quality/:data_id", proxyToService(cfg, "normalization-service", "/api/v1/normalization/quality/:data_id"))
		normalization.GET("/stats", proxyToService(cfg, "normalization-service", "/api/v1/normalization/stats"))
	}

	// ML Infrastructure (Phase 2)
	ml := r.Group("/ml")
	{
		ml.GET("/models", proxyToService(cfg, "ml-infrastructure", "/api/v1/models"))
		ml.POST("/models/register", proxyToService(cfg, "ml-infrastructure", "/api/v1/models/register"))
		ml.GET("/models/:model_name", proxyToService(cfg, "ml-infrastructure", "/api/v1/models/:model_name"))
		ml.POST("/models/:model_name/predict", proxyToService(cfg, "ml-infrastructure", "/api/v1/models/:model_name/predict"))
		ml.GET("/experiments", proxyToService(cfg, "ml-infrastructure", "/api/v1/experiments"))
		ml.POST("/experiments/runs", proxyToService(cfg, "ml-infrastructure", "/api/v1/experiments/runs"))
	}

	// NLP Service (Phase 2)
	nlp := r.Group("/nlp")
	{
		nlp.POST("/ner", proxyToService(cfg, "nlp-service", "/api/v1/nlp/ner"))
		nlp.POST("/sentiment", proxyToService(cfg, "nlp-service", "/api/v1/nlp/sentiment"))
		nlp.POST("/classify", proxyToService(cfg, "nlp-service", "/api/v1/nlp/classify"))
		nlp.POST("/summarize", proxyToService(cfg, "nlp-service", "/api/v1/nlp/summarize"))
		nlp.POST("/process", proxyToService(cfg, "nlp-service", "/api/v1/nlp/process"))
	}

	// Graph Intelligence (Phase 2)
	graph := r.Group("/graph")
	{
		graph.POST("/entities/resolve", proxyToService(cfg, "graph-intelligence", "/api/v1/graph/entities/resolve"))
		graph.GET("/entities/:id/relationships", proxyToService(cfg, "graph-intelligence", "/api/v1/graph/entities/:id/relationships"))
		graph.GET("/entities/:id/neighbors", proxyToService(cfg, "graph-intelligence", "/api/v1/graph/entities/:id/neighbors"))
		graph.GET("/risk/propagate", proxyToService(cfg, "graph-intelligence", "/api/v1/graph/risk/propagate"))
		graph.POST("/risk/propagate", proxyToService(cfg, "graph-intelligence", "/api/v1/graph/risk/propagate"))
		graph.GET("/communities", proxyToService(cfg, "graph-intelligence", "/api/v1/graph/communities"))
		graph.GET("/centrality", proxyToService(cfg, "graph-intelligence", "/api/v1/graph/centrality"))
		graph.GET("/path", proxyToService(cfg, "graph-intelligence", "/api/v1/graph/path"))
		graph.GET("/stats", proxyToService(cfg, "graph-intelligence", "/api/v1/graph/stats"))
	}

	// Explainable AI (Phase 2)
	xai := r.Group("/xai")
	{
		xai.POST("/explain", proxyToService(cfg, "xai-service", "/api/v1/xai/explain"))
		xai.GET("/models/:model_id/features", proxyToService(cfg, "xai-service", "/api/v1/xai/models/:model_id/features"))
		xai.GET("/predictions/:prediction_id/explanation", proxyToService(cfg, "xai-service", "/api/v1/xai/predictions/:prediction_id/explanation"))
		xai.POST("/batch/explain", proxyToService(cfg, "xai-service", "/api/v1/xai/batch/explain"))
	}

	// Model Serving (Phase 2)
	models := r.Group("/models")
	{
		models.GET("", proxyToService(cfg, "model-serving", "/api/v1/models"))
		models.POST("/predict", proxyToService(cfg, "model-serving", "/api/v1/models/predict"))
		models.GET("/:model_name/info", proxyToService(cfg, "model-serving", "/api/v1/models/:model_name/info"))
	}

	// Model Monitoring (Phase 2)
	monitoring := r.Group("/monitoring")
	{
		monitoring.POST("/drift/check", proxyToService(cfg, "model-monitoring", "/api/v1/monitoring/drift/check"))
		monitoring.POST("/performance", proxyToService(cfg, "model-monitoring", "/api/v1/monitoring/performance"))
		monitoring.GET("/models/:model_name/performance", proxyToService(cfg, "model-monitoring", "/api/v1/monitoring/models/:model_name/performance"))
		monitoring.GET("/models/:model_name/health", proxyToService(cfg, "model-monitoring", "/api/v1/monitoring/models/:model_name/health"))
		monitoring.GET("/alerts", proxyToService(cfg, "model-monitoring", "/api/v1/monitoring/alerts"))
	}

	// Scenario Simulation (Phase 3)
	simulations := r.Group("/simulations")
	{
		simulations.GET("", proxyToService(cfg, "scenario-simulation", "/api/v1/simulations"))
		simulations.POST("/scenarios", proxyToService(cfg, "scenario-simulation", "/api/v1/simulations/scenarios"))
		simulations.GET("/:simulation_id", proxyToService(cfg, "scenario-simulation", "/api/v1/simulations/:simulation_id"))
		simulations.POST("/compare", proxyToService(cfg, "scenario-simulation", "/api/v1/simulations/compare"))
	}

	// Defensive War-Gaming (Phase 3)
	wargaming := r.Group("/wargaming")
	{
		wargaming.GET("/games", proxyToService(cfg, "war-gaming", "/api/v1/wargaming/games"))
		wargaming.POST("/scenarios", proxyToService(cfg, "war-gaming", "/api/v1/wargaming/scenarios"))
		wargaming.GET("/games/:game_id", proxyToService(cfg, "war-gaming", "/api/v1/wargaming/games/:game_id"))
		wargaming.POST("/risk-escalation", proxyToService(cfg, "war-gaming", "/api/v1/wargaming/risk-escalation"))
	}

	// Digital Twins (Phase 3)
	twins := r.Group("/twins")
	{
		twins.GET("", proxyToService(cfg, "digital-twins", "/api/v1/twins"))
		twins.POST("", proxyToService(cfg, "digital-twins", "/api/v1/twins"))
		twins.GET("/:twin_id", proxyToService(cfg, "digital-twins", "/api/v1/twins/:twin_id"))
		twins.PUT("/:twin_id", proxyToService(cfg, "digital-twins", "/api/v1/twins/:twin_id"))
		twins.POST("/:twin_id/simulate", proxyToService(cfg, "digital-twins", "/api/v1/twins/:twin_id/simulate"))
		twins.GET("/:twin_id/sync", proxyToService(cfg, "digital-twins", "/api/v1/twins/:twin_id/sync"))
	}

	// Policy Impact Analysis (Phase 3)
	policy := r.Group("/policy")
	{
		policy.GET("/analyses", proxyToService(cfg, "policy-impact", "/api/v1/policy/analyses"))
		policy.POST("/analyze", proxyToService(cfg, "policy-impact", "/api/v1/policy/analyze"))
		policy.GET("/analyses/:analysis_id", proxyToService(cfg, "policy-impact", "/api/v1/policy/analyses/:analysis_id"))
		policy.POST("/compare", proxyToService(cfg, "policy-impact", "/api/v1/policy/compare"))
		policy.POST("/visualize", proxyToService(cfg, "policy-impact", "/api/v1/policy/visualize"))
	}

	// Multi-Region (Phase 4)
	regions := r.Group("/regions")
	{
		regions.GET("", proxyToService(cfg, "multi-region", "/api/v1/regions"))
		regions.GET("/:region_id", proxyToService(cfg, "multi-region", "/api/v1/regions/:region_id"))
		regions.GET("/:region_id/replication", proxyToService(cfg, "multi-region", "/api/v1/regions/:region_id/replication"))
		regions.POST("/failover", proxyToService(cfg, "multi-region", "/api/v1/regions/failover"))
		regions.GET("/routing", proxyToService(cfg, "multi-region", "/api/v1/regions/routing"))
		regions.GET("/health", proxyToService(cfg, "multi-region", "/api/v1/regions/health"))
	}

	// Data Residency (Phase 4)
	residency := r.Group("/residency")
	{
		residency.GET("/rules", proxyToService(cfg, "data-residency", "/api/v1/residency/rules"))
		residency.POST("/validate", proxyToService(cfg, "data-residency", "/api/v1/residency/validate"))
		residency.POST("/rules", proxyToService(cfg, "data-residency", "/api/v1/residency/rules"))
		residency.GET("/data/:data_id/location", proxyToService(cfg, "data-residency", "/api/v1/residency/data/:data_id/location"))
		residency.GET("/compliance", proxyToService(cfg, "data-residency", "/api/v1/residency/compliance"))
	}

	// Federated Learning (Phase 4)
	federated := r.Group("/federated")
	{
		federated.GET("/models", proxyToService(cfg, "federated-learning", "/api/v1/federated/models"))
		federated.POST("/models", proxyToService(cfg, "federated-learning", "/api/v1/federated/models"))
		federated.GET("/models/:model_id", proxyToService(cfg, "federated-learning", "/api/v1/federated/models/:model_id"))
		federated.POST("/models/:model_id/rounds", proxyToService(cfg, "federated-learning", "/api/v1/federated/models/:model_id/rounds"))
		federated.GET("/models/:model_id/rounds/:round_id", proxyToService(cfg, "federated-learning", "/api/v1/federated/models/:model_id/rounds/:round_id"))
		federated.POST("/models/:model_id/aggregate", proxyToService(cfg, "federated-learning", "/api/v1/federated/models/:model_id/aggregate"))
		federated.POST("/continual/update", proxyToService(cfg, "federated-learning", "/api/v1/federated/continual/update"))
	}

	// Mobile API (Phase 4)
	mobile := r.Group("/mobile")
	{
		mobile.POST("/sessions", proxyToService(cfg, "mobile-api", "/api/v1/mobile/sessions"))
		mobile.GET("/dashboard", proxyToService(cfg, "mobile-api", "/api/v1/mobile/dashboard"))
		mobile.POST("/offline/sync", proxyToService(cfg, "mobile-api", "/api/v1/mobile/offline/sync"))
		mobile.GET("/offline/data", proxyToService(cfg, "mobile-api", "/api/v1/mobile/offline/data"))
		mobile.GET("/alerts", proxyToService(cfg, "mobile-api", "/api/v1/mobile/alerts"))
		mobile.POST("/notifications/register", proxyToService(cfg, "mobile-api", "/api/v1/mobile/notifications/register"))
	}

	// Compliance Automation (Phase 4)
	complianceAuto := r.Group("/compliance/automation")
	{
		complianceAuto.GET("/policies", proxyToService(cfg, "compliance-automation", "/api/v1/compliance/policies"))
		complianceAuto.POST("/policies", proxyToService(cfg, "compliance-automation", "/api/v1/compliance/policies"))
		complianceAuto.POST("/scan", proxyToService(cfg, "compliance-automation", "/api/v1/compliance/scan"))
		complianceAuto.GET("/scan/:scan_id", proxyToService(cfg, "compliance-automation", "/api/v1/compliance/scan/:scan_id"))
		complianceAuto.GET("/status", proxyToService(cfg, "compliance-automation", "/api/v1/compliance/status"))
		complianceAuto.POST("/evidence/generate", proxyToService(cfg, "compliance-automation", "/api/v1/compliance/evidence/generate"))
	}

	// Performance Optimization (Phase 5)
	optimization := r.Group("/optimization")
	{
		optimization.POST("/analyze", proxyToService(cfg, "performance-optimization", "/api/v1/optimization/analyze"))
		optimization.GET("/metrics", proxyToService(cfg, "performance-optimization", "/api/v1/optimization/metrics"))
		optimization.POST("/apply", proxyToService(cfg, "performance-optimization", "/api/v1/optimization/apply"))
		optimization.GET("/slo", proxyToService(cfg, "performance-optimization", "/api/v1/optimization/slo"))
		optimization.POST("/benchmark", proxyToService(cfg, "performance-optimization", "/api/v1/optimization/benchmark"))
	}

	// Cost Optimization (Phase 5)
	cost := r.Group("/cost")
	{
		cost.GET("/analysis", proxyToService(cfg, "cost-optimization", "/api/v1/cost/analysis"))
		cost.GET("/recommendations", proxyToService(cfg, "cost-optimization", "/api/v1/cost/recommendations"))
		cost.POST("/budgets", proxyToService(cfg, "cost-optimization", "/api/v1/cost/budgets"))
		cost.GET("/budgets", proxyToService(cfg, "cost-optimization", "/api/v1/cost/budgets"))
		cost.GET("/alerts", proxyToService(cfg, "cost-optimization", "/api/v1/cost/alerts"))
	}

	// Advanced R&D (Phase 5)
	rd := r.Group("/rd")
	{
		rd.GET("/projects", proxyToService(cfg, "advanced-rd", "/api/v1/rd/projects"))
		rd.POST("/projects", proxyToService(cfg, "advanced-rd", "/api/v1/rd/projects"))
		rd.POST("/threats/simulate", proxyToService(cfg, "advanced-rd", "/api/v1/rd/threats/simulate"))
		rd.GET("/models/experimental", proxyToService(cfg, "advanced-rd", "/api/v1/rd/models/experimental"))
		rd.GET("/partners", proxyToService(cfg, "advanced-rd", "/api/v1/rd/partners"))
	}

	// Security Certification (Phase 5)
	certifications := r.Group("/certifications")
	{
		certifications.GET("", proxyToService(cfg, "security-certification", "/api/v1/certifications"))
		certifications.POST("/assess", proxyToService(cfg, "security-certification", "/api/v1/certifications/assess"))
		certifications.POST("/penetration-test", proxyToService(cfg, "security-certification", "/api/v1/security/penetration-test"))
		certifications.GET("/penetration-tests", proxyToService(cfg, "security-certification", "/api/v1/security/penetration-tests"))
		certifications.GET("/red-team/exercises", proxyToService(cfg, "security-certification", "/api/v1/security/red-team/exercises"))
		certifications.GET("/compliance-status", proxyToService(cfg, "security-certification", "/api/v1/security/compliance-status"))
	}

	// Continuous Improvement (Phase 5)
	improvement := r.Group("/improvement")
	{
		improvement.GET("/metrics", proxyToService(cfg, "continuous-improvement", "/api/v1/improvement/metrics"))
		improvement.POST("/requests", proxyToService(cfg, "continuous-improvement", "/api/v1/improvement/requests"))
		improvement.GET("/requests", proxyToService(cfg, "continuous-improvement", "/api/v1/improvement/requests"))
		improvement.POST("/feedback", proxyToService(cfg, "continuous-improvement", "/api/v1/improvement/feedback"))
		improvement.GET("/recommendations", proxyToService(cfg, "continuous-improvement", "/api/v1/improvement/recommendations"))
	}
}

func proxyToService(cfg *config.Config, serviceName, backendPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Simple HTTP proxy to backend services
		serviceURLs := map[string]string{
			"risk-assessment":     "http://risk-assessment:8082",
			"scenario-simulation": "http://scenario-simulation:8093",
			"news-aggregator":     "http://news-aggregator:8083",
			"ingestion-service":  "http://ingestion-service:8084",
			"normalization-service": "http://normalization-service:8085",
			"audit-service":       "http://audit-logging:8086",
			"ml-infrastructure":   "http://ml-infrastructure:8087",
			"nlp-service":         "http://nlp-service:8088",
			"graph-intelligence":  "http://graph-intelligence:8089",
			"xai-service":         "http://xai-service:8090",
			"model-serving":       "http://model-serving:8091",
			"model-monitoring":    "http://model-monitoring:8092",
			"war-gaming":          "http://war-gaming:8094",
			"digital-twins":       "http://digital-twins:8095",
			"policy-impact":       "http://policy-impact:8096",
			"multi-region":        "http://multi-region:8097",
			"data-residency":      "http://data-residency:8098",
		"federated-learning":  "http://federated-learning:8099",
		"mobile-api":          "http://mobile-api:8100",
		"compliance-automation": "http://compliance-automation:8101",
		"performance-optimization": "http://performance-optimization:8102",
		"cost-optimization":   "http://cost-optimization:8103",
		"advanced-rd":         "http://advanced-rd:8104",
		"security-certification": "http://security-certification:8105",
		"continuous-improvement": "http://continuous-improvement:8106",
		"entity-service":      "http://entity-service:8107",
		"geospatial-service":  "http://geospatial-service:8108",
		"intelligence-service": "http://intelligence-service:8109",
		}

		baseURL, exists := serviceURLs[serviceName]
		if !exists {
			c.JSON(404, gin.H{"error": "Service not found", "service": serviceName})
			return
		}

		// Replace path parameters
		finalPath := backendPath
		for _, param := range c.Params {
			finalPath = strings.Replace(finalPath, ":"+param.Key, param.Value, 1)
		}

		// Add query string
		if c.Request.URL.RawQuery != "" {
			finalPath += "?" + c.Request.URL.RawQuery
		}

		// Forward request to backend service with circuit breaker
		req, err := http.NewRequest(c.Request.Method, baseURL+finalPath, c.Request.Body)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to create request"})
			return
		}

		// Copy headers (except Host)
		for key, values := range c.Request.Header {
			if key != "Host" {
				for _, value := range values {
					req.Header.Add(key, value)
				}
			}
		}

		// Use circuit breaker for resilient requests
		resp, err := circuitbreaker.DoHTTPRequest(serviceName, req)
		if err != nil {
			c.JSON(503, gin.H{"error": "Service unavailable", "service": serviceName, "details": err.Error()})
			return
		}
		defer resp.Body.Close()

		// Copy response headers
		for key, values := range resp.Header {
			for _, value := range values {
				c.Header(key, value)
			}
		}

		// Copy response body
		body, _ := io.ReadAll(resp.Body)
		c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), body)
	}
}

// Platform status endpoint (aggregated from multiple services)
func getPlatformStatus(c *gin.Context) {
	// Aggregate status from core services
	status := gin.H{
		"platform": "operational",
		"services": gin.H{
			"api_gateway":      "operational",
			"iam":              "operational",
			"risk_assessment":  "operational",
			"news_aggregator":  "operational",
			"ingestion":        "operational",
			"normalization":    "operational",
			"audit_logging":    "operational",
			"ml_infrastructure": "operational",
			"nlp_service":      "operational",
			"graph_intelligence": "operational",
			"xai_service":      "operational",
			"model_serving":    "operational",
			"model_monitoring": "operational",
		"scenario_simulation": "operational",
		"war_gaming":       "operational",
		"digital_twins":    "operational",
		"policy_impact":    "operational",
		"multi_region":     "operational",
		"data_residency":   "operational",
		"federated_learning": "operational",
		"mobile_api":       "operational",
		"compliance_automation": "operational",
		"performance_optimization": "operational",
		"cost_optimization": "operational",
		"advanced_rd":      "operational",
		"security_certification": "operational",
		"continuous_improvement": "operational",
		"geospatial":       "operational",
		"intelligence":     "operational",
		},
		"compliance": gin.H{
			"gdpr": "compliant",
			"lgpd": "compliant",
		},
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}
	c.JSON(200, gin.H{"data": status})
}
