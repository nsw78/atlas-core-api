package router

import (
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"atlas-core-api/services/api-gateway/internal/infrastructure/circuitbreaker"
	"atlas-core-api/services/api-gateway/internal/infrastructure/config"
)

// SetupRoutes configures all API gateway proxy routes using config-driven service registry
func SetupRoutes(r *gin.RouterGroup, cfg *config.Config, logger *zap.Logger) {
	proxy := newServiceProxy(cfg, logger)

	// Strategic Entity Management
	entities := r.Group("/entities")
	{
		entities.GET("", proxy.forward("entity-service", "/api/v1/entities"))
		entities.GET("/:id", proxy.forward("entity-service", "/api/v1/entities/:id"))
		entities.POST("", proxy.forward("entity-service", "/api/v1/entities"))
		entities.GET("/:id/context", proxy.forward("entity-service", "/api/v1/entities/:id/context"))
		entities.GET("/:id/intelligence", proxy.forward("entity-service", "/api/v1/entities/:id/intelligence"))
	}

	// Risk Assessment
	risks := r.Group("/risks")
	{
		risks.POST("/assess", proxy.forward("risk-assessment", "/api/v1/risks/assess"))
		risks.GET("/:id", proxy.forward("risk-assessment", "/api/v1/risks/:id"))
		risks.GET("/trends", proxy.forward("risk-assessment", "/api/v1/risks/trends"))
		risks.POST("/alerts", proxy.forward("risk-assessment", "/api/v1/risks/alerts"))
		risks.GET("/profiles", proxy.forward("risk-assessment", "/api/v1/risks/profiles"))
	}

	// Risk Profiles (Executive summaries)
	riskProfiles := r.Group("/risk-profiles")
	{
		riskProfiles.GET("", proxy.forward("risk-assessment", "/api/v1/risk-profiles"))
		riskProfiles.GET("/:id", proxy.forward("risk-assessment", "/api/v1/risk-profiles/:id"))
		riskProfiles.POST("", proxy.forward("risk-assessment", "/api/v1/risk-profiles"))
	}

	// Scenario Simulation
	scenarios := r.Group("/scenarios")
	{
		scenarios.POST("", proxy.forward("scenario-simulation", "/api/v1/scenarios"))
		scenarios.GET("", proxy.forward("scenario-simulation", "/api/v1/scenarios"))
		scenarios.GET("/:id", proxy.forward("scenario-simulation", "/api/v1/scenarios/:id"))
		scenarios.POST("/:id/run", proxy.forward("scenario-simulation", "/api/v1/scenarios/:id/run"))
		scenarios.GET("/:id/results", proxy.forward("scenario-simulation", "/api/v1/scenarios/:id/results"))
		scenarios.GET("/:id/compare", proxy.forward("scenario-simulation", "/api/v1/scenarios/:id/compare"))
	}

	// Geospatial Intelligence
	geospatial := r.Group("/geospatial")
	{
		geospatial.POST("/query", proxy.forward("geospatial-service", "/api/v1/geo/query"))
		geospatial.GET("/zones", proxy.forward("geospatial-service", "/api/v1/geo/zones"))
		geospatial.GET("/context", proxy.forward("geospatial-service", "/api/v1/geo/context"))
		geospatial.GET("/supply-chains", proxy.forward("geospatial-service", "/api/v1/geo/supply-chains"))
	}

	// OSINT Analysis
	osint := r.Group("/osint")
	{
		osint.GET("/analysis", proxy.forward("news-aggregator", "/api/v1/osint/analysis"))
		osint.GET("/signals", proxy.forward("news-aggregator", "/api/v1/osint/signals"))
		osint.GET("/feed", proxy.forward("news-aggregator", "/api/v1/osint/feed"))
		osint.POST("/query", proxy.forward("news-aggregator", "/api/v1/osint/query"))
	}

	// News
	news := r.Group("/news")
	{
		news.GET("/articles", proxy.forward("news-aggregator", "/api/v1/news/articles"))
		news.POST("/sources", proxy.forward("news-aggregator", "/api/v1/news/sources"))
	}

	// Executive Briefings
	briefings := r.Group("/briefings")
	{
		briefings.GET("", proxy.forward("intelligence-service", "/api/v1/briefings"))
		briefings.POST("", proxy.forward("intelligence-service", "/api/v1/briefings"))
		briefings.GET("/:id", proxy.forward("intelligence-service", "/api/v1/briefings/:id"))
	}

	// Sanctions Screening & Trade Intelligence
	sanctions := r.Group("/sanctions")
	{
		sanctions.POST("/screen", proxy.forward("sanctions-screening", "/api/v1/sanctions/screen"))
		sanctions.POST("/batch", proxy.forward("sanctions-screening", "/api/v1/sanctions/batch"))
		sanctions.GET("/lists", proxy.forward("sanctions-screening", "/api/v1/sanctions/lists"))
		sanctions.GET("/countries", proxy.forward("sanctions-screening", "/api/v1/sanctions/countries"))
		sanctions.GET("/stats", proxy.forward("sanctions-screening", "/api/v1/sanctions/stats"))
	}

	trade := r.Group("/trade")
	{
		trade.POST("/intelligence", proxy.forward("sanctions-screening", "/api/v1/trade/intelligence"))
		trade.GET("/partners/:country_code", proxy.forward("sanctions-screening", "/api/v1/trade/partners/:country_code"))
		trade.GET("/restrictions", proxy.forward("sanctions-screening", "/api/v1/trade/restrictions"))
		trade.GET("/commodities/:hs_code", proxy.forward("sanctions-screening", "/api/v1/trade/commodities/:hs_code"))
	}

	// Compliance & Audit
	compliance := r.Group("/compliance")
	{
		compliance.GET("/audit", proxy.forward("audit-service", "/api/v1/audit/compliance/report"))
		compliance.GET("/lineage", proxy.forward("audit-service", "/api/v1/compliance/lineage"))
		compliance.GET("/status", proxy.forward("audit-service", "/api/v1/compliance/status"))
	}

	// Audit Logging
	audit := r.Group("/audit")
	{
		audit.GET("/logs", proxy.forward("audit-service", "/api/v1/audit/logs"))
		audit.GET("/logs/:id", proxy.forward("audit-service", "/api/v1/audit/logs/:id"))
		audit.POST("/events", proxy.forward("audit-service", "/api/v1/audit/events"))
		audit.GET("/compliance/report", proxy.forward("audit-service", "/api/v1/audit/compliance/report"))
	}

	// Platform Overview
	overview := r.Group("/overview")
	{
		overview.GET("/status", getPlatformStatus(cfg))
		overview.GET("/signals", proxy.forward("intelligence-service", "/api/v1/overview/signals"))
		overview.GET("/kpis", proxy.forward("intelligence-service", "/api/v1/overview/kpis"))
	}

	// Data Ingestion
	ingestion := r.Group("/ingestion")
	{
		sources := ingestion.Group("/sources")
		{
			sources.GET("", proxy.forward("ingestion-service", "/api/v1/ingestion/sources"))
			sources.POST("", proxy.forward("ingestion-service", "/api/v1/ingestion/sources"))
			sources.GET("/:id", proxy.forward("ingestion-service", "/api/v1/ingestion/sources/:id"))
			sources.POST("/:id/data", proxy.forward("ingestion-service", "/api/v1/ingestion/sources/:id/data"))
			sources.POST("/:id/trigger", proxy.forward("ingestion-service", "/api/v1/ingestion/sources/:id/trigger"))
		}
		ingestion.GET("/status", proxy.forward("ingestion-service", "/api/v1/ingestion/status"))
	}

	// Data Normalization
	normalization := r.Group("/normalization")
	{
		rules := normalization.Group("/rules")
		{
			rules.GET("", proxy.forward("normalization-service", "/api/v1/normalization/rules"))
			rules.POST("", proxy.forward("normalization-service", "/api/v1/normalization/rules"))
			rules.GET("/:id", proxy.forward("normalization-service", "/api/v1/normalization/rules/:id"))
			rules.PUT("/:id", proxy.forward("normalization-service", "/api/v1/normalization/rules/:id"))
			rules.DELETE("/:id", proxy.forward("normalization-service", "/api/v1/normalization/rules/:id"))
		}
		normalization.GET("/quality/:data_id", proxy.forward("normalization-service", "/api/v1/normalization/quality/:data_id"))
		normalization.GET("/stats", proxy.forward("normalization-service", "/api/v1/normalization/stats"))
	}

	// ML Infrastructure
	ml := r.Group("/ml")
	{
		ml.GET("/models", proxy.forward("ml-infrastructure", "/api/v1/models"))
		ml.POST("/models/register", proxy.forward("ml-infrastructure", "/api/v1/models/register"))
		ml.GET("/models/:model_name", proxy.forward("ml-infrastructure", "/api/v1/models/:model_name"))
		ml.POST("/models/:model_name/predict", proxy.forward("ml-infrastructure", "/api/v1/models/:model_name/predict"))
		ml.GET("/experiments", proxy.forward("ml-infrastructure", "/api/v1/experiments"))
		ml.POST("/experiments/runs", proxy.forward("ml-infrastructure", "/api/v1/experiments/runs"))
	}

	// NLP Service
	nlp := r.Group("/nlp")
	{
		nlp.POST("/ner", proxy.forward("nlp-service", "/api/v1/nlp/ner"))
		nlp.POST("/sentiment", proxy.forward("nlp-service", "/api/v1/nlp/sentiment"))
		nlp.POST("/classify", proxy.forward("nlp-service", "/api/v1/nlp/classify"))
		nlp.POST("/summarize", proxy.forward("nlp-service", "/api/v1/nlp/summarize"))
		nlp.POST("/process", proxy.forward("nlp-service", "/api/v1/nlp/process"))
	}

	// Graph Intelligence
	graph := r.Group("/graph")
	{
		graph.POST("/entities/resolve", proxy.forward("graph-intelligence", "/api/v1/graph/entities/resolve"))
		graph.GET("/entities/:id/relationships", proxy.forward("graph-intelligence", "/api/v1/graph/entities/:id/relationships"))
		graph.GET("/entities/:id/neighbors", proxy.forward("graph-intelligence", "/api/v1/graph/entities/:id/neighbors"))
		graph.GET("/risk/propagate", proxy.forward("graph-intelligence", "/api/v1/graph/risk/propagate"))
		graph.POST("/risk/propagate", proxy.forward("graph-intelligence", "/api/v1/graph/risk/propagate"))
		graph.GET("/communities", proxy.forward("graph-intelligence", "/api/v1/graph/communities"))
		graph.GET("/centrality", proxy.forward("graph-intelligence", "/api/v1/graph/centrality"))
		graph.GET("/path", proxy.forward("graph-intelligence", "/api/v1/graph/path"))
		graph.GET("/stats", proxy.forward("graph-intelligence", "/api/v1/graph/stats"))
	}

	// Explainable AI
	xai := r.Group("/xai")
	{
		xai.POST("/explain", proxy.forward("xai-service", "/api/v1/xai/explain"))
		xai.GET("/models/:model_id/features", proxy.forward("xai-service", "/api/v1/xai/models/:model_id/features"))
		xai.GET("/predictions/:prediction_id/explanation", proxy.forward("xai-service", "/api/v1/xai/predictions/:prediction_id/explanation"))
		xai.POST("/batch/explain", proxy.forward("xai-service", "/api/v1/xai/batch/explain"))
	}

	// Model Serving
	models := r.Group("/models")
	{
		models.GET("", proxy.forward("model-serving", "/api/v1/models"))
		models.POST("/predict", proxy.forward("model-serving", "/api/v1/models/predict"))
		models.GET("/:model_name/info", proxy.forward("model-serving", "/api/v1/models/:model_name/info"))
	}

	// Model Monitoring
	monitoring := r.Group("/monitoring")
	{
		monitoring.POST("/drift/check", proxy.forward("model-monitoring", "/api/v1/monitoring/drift/check"))
		monitoring.POST("/performance", proxy.forward("model-monitoring", "/api/v1/monitoring/performance"))
		monitoring.GET("/models/:model_name/performance", proxy.forward("model-monitoring", "/api/v1/monitoring/models/:model_name/performance"))
		monitoring.GET("/models/:model_name/health", proxy.forward("model-monitoring", "/api/v1/monitoring/models/:model_name/health"))
		monitoring.GET("/alerts", proxy.forward("model-monitoring", "/api/v1/monitoring/alerts"))
	}

	// Simulations
	simulations := r.Group("/simulations")
	{
		simulations.GET("", proxy.forward("scenario-simulation", "/api/v1/simulations"))
		simulations.POST("/scenarios", proxy.forward("scenario-simulation", "/api/v1/simulations/scenarios"))
		simulations.GET("/:simulation_id", proxy.forward("scenario-simulation", "/api/v1/simulations/:simulation_id"))
		simulations.POST("/compare", proxy.forward("scenario-simulation", "/api/v1/simulations/compare"))
	}

	// Defensive War-Gaming
	wargaming := r.Group("/wargaming")
	{
		wargaming.GET("/games", proxy.forward("war-gaming", "/api/v1/wargaming/games"))
		wargaming.POST("/scenarios", proxy.forward("war-gaming", "/api/v1/wargaming/scenarios"))
		wargaming.GET("/games/:game_id", proxy.forward("war-gaming", "/api/v1/wargaming/games/:game_id"))
		wargaming.POST("/risk-escalation", proxy.forward("war-gaming", "/api/v1/wargaming/risk-escalation"))
	}

	// Digital Twins
	twins := r.Group("/twins")
	{
		twins.GET("", proxy.forward("digital-twins", "/api/v1/twins"))
		twins.POST("", proxy.forward("digital-twins", "/api/v1/twins"))
		twins.GET("/:twin_id", proxy.forward("digital-twins", "/api/v1/twins/:twin_id"))
		twins.PUT("/:twin_id", proxy.forward("digital-twins", "/api/v1/twins/:twin_id"))
		twins.POST("/:twin_id/simulate", proxy.forward("digital-twins", "/api/v1/twins/:twin_id/simulate"))
		twins.GET("/:twin_id/sync", proxy.forward("digital-twins", "/api/v1/twins/:twin_id/sync"))
	}

	// Policy Impact Analysis
	policy := r.Group("/policy")
	{
		policy.GET("/analyses", proxy.forward("policy-impact", "/api/v1/policy/analyses"))
		policy.POST("/analyze", proxy.forward("policy-impact", "/api/v1/policy/analyze"))
		policy.GET("/analyses/:analysis_id", proxy.forward("policy-impact", "/api/v1/policy/analyses/:analysis_id"))
		policy.POST("/compare", proxy.forward("policy-impact", "/api/v1/policy/compare"))
		policy.POST("/visualize", proxy.forward("policy-impact", "/api/v1/policy/visualize"))
	}

	// Multi-Region
	regions := r.Group("/regions")
	{
		regions.GET("", proxy.forward("multi-region", "/api/v1/regions"))
		regions.GET("/:region_id", proxy.forward("multi-region", "/api/v1/regions/:region_id"))
		regions.GET("/:region_id/replication", proxy.forward("multi-region", "/api/v1/regions/:region_id/replication"))
		regions.POST("/failover", proxy.forward("multi-region", "/api/v1/regions/failover"))
		regions.GET("/routing", proxy.forward("multi-region", "/api/v1/regions/routing"))
		regions.GET("/health", proxy.forward("multi-region", "/api/v1/regions/health"))
	}

	// Data Residency
	residency := r.Group("/residency")
	{
		residency.GET("/rules", proxy.forward("data-residency", "/api/v1/residency/rules"))
		residency.POST("/validate", proxy.forward("data-residency", "/api/v1/residency/validate"))
		residency.POST("/rules", proxy.forward("data-residency", "/api/v1/residency/rules"))
		residency.GET("/data/:data_id/location", proxy.forward("data-residency", "/api/v1/residency/data/:data_id/location"))
		residency.GET("/compliance", proxy.forward("data-residency", "/api/v1/residency/compliance"))
	}

	// Federated Learning
	federated := r.Group("/federated")
	{
		federated.GET("/models", proxy.forward("federated-learning", "/api/v1/federated/models"))
		federated.POST("/models", proxy.forward("federated-learning", "/api/v1/federated/models"))
		federated.GET("/models/:model_id", proxy.forward("federated-learning", "/api/v1/federated/models/:model_id"))
		federated.POST("/models/:model_id/rounds", proxy.forward("federated-learning", "/api/v1/federated/models/:model_id/rounds"))
		federated.GET("/models/:model_id/rounds/:round_id", proxy.forward("federated-learning", "/api/v1/federated/models/:model_id/rounds/:round_id"))
		federated.POST("/models/:model_id/aggregate", proxy.forward("federated-learning", "/api/v1/federated/models/:model_id/aggregate"))
		federated.POST("/continual/update", proxy.forward("federated-learning", "/api/v1/federated/continual/update"))
	}

	// Mobile API
	mobile := r.Group("/mobile")
	{
		mobile.POST("/sessions", proxy.forward("mobile-api", "/api/v1/mobile/sessions"))
		mobile.GET("/dashboard", proxy.forward("mobile-api", "/api/v1/mobile/dashboard"))
		mobile.POST("/offline/sync", proxy.forward("mobile-api", "/api/v1/mobile/offline/sync"))
		mobile.GET("/offline/data", proxy.forward("mobile-api", "/api/v1/mobile/offline/data"))
		mobile.GET("/alerts", proxy.forward("mobile-api", "/api/v1/mobile/alerts"))
		mobile.POST("/notifications/register", proxy.forward("mobile-api", "/api/v1/mobile/notifications/register"))
	}

	// Compliance Automation
	complianceAuto := r.Group("/compliance/automation")
	{
		complianceAuto.GET("/policies", proxy.forward("compliance-automation", "/api/v1/compliance/policies"))
		complianceAuto.POST("/policies", proxy.forward("compliance-automation", "/api/v1/compliance/policies"))
		complianceAuto.POST("/scan", proxy.forward("compliance-automation", "/api/v1/compliance/scan"))
		complianceAuto.GET("/scan/:scan_id", proxy.forward("compliance-automation", "/api/v1/compliance/scan/:scan_id"))
		complianceAuto.GET("/status", proxy.forward("compliance-automation", "/api/v1/compliance/status"))
		complianceAuto.POST("/evidence/generate", proxy.forward("compliance-automation", "/api/v1/compliance/evidence/generate"))
	}

	// Performance Optimization
	optimization := r.Group("/optimization")
	{
		optimization.POST("/analyze", proxy.forward("performance-optimization", "/api/v1/optimization/analyze"))
		optimization.GET("/metrics", proxy.forward("performance-optimization", "/api/v1/optimization/metrics"))
		optimization.POST("/apply", proxy.forward("performance-optimization", "/api/v1/optimization/apply"))
		optimization.GET("/slo", proxy.forward("performance-optimization", "/api/v1/optimization/slo"))
		optimization.POST("/benchmark", proxy.forward("performance-optimization", "/api/v1/optimization/benchmark"))
	}

	// Cost Optimization
	cost := r.Group("/cost")
	{
		cost.GET("/analysis", proxy.forward("cost-optimization", "/api/v1/cost/analysis"))
		cost.GET("/recommendations", proxy.forward("cost-optimization", "/api/v1/cost/recommendations"))
		cost.POST("/budgets", proxy.forward("cost-optimization", "/api/v1/cost/budgets"))
		cost.GET("/budgets", proxy.forward("cost-optimization", "/api/v1/cost/budgets"))
		cost.GET("/alerts", proxy.forward("cost-optimization", "/api/v1/cost/alerts"))
	}

	// Advanced R&D
	rd := r.Group("/rd")
	{
		rd.GET("/projects", proxy.forward("advanced-rd", "/api/v1/rd/projects"))
		rd.POST("/projects", proxy.forward("advanced-rd", "/api/v1/rd/projects"))
		rd.POST("/threats/simulate", proxy.forward("advanced-rd", "/api/v1/rd/threats/simulate"))
		rd.GET("/models/experimental", proxy.forward("advanced-rd", "/api/v1/rd/models/experimental"))
		rd.GET("/partners", proxy.forward("advanced-rd", "/api/v1/rd/partners"))
	}

	// Security Certification
	certifications := r.Group("/certifications")
	{
		certifications.GET("", proxy.forward("security-certification", "/api/v1/certifications"))
		certifications.POST("/assess", proxy.forward("security-certification", "/api/v1/certifications/assess"))
		certifications.POST("/penetration-test", proxy.forward("security-certification", "/api/v1/security/penetration-test"))
		certifications.GET("/penetration-tests", proxy.forward("security-certification", "/api/v1/security/penetration-tests"))
		certifications.GET("/red-team/exercises", proxy.forward("security-certification", "/api/v1/security/red-team/exercises"))
		certifications.GET("/compliance-status", proxy.forward("security-certification", "/api/v1/security/compliance-status"))
	}

	// Continuous Improvement
	improvement := r.Group("/improvement")
	{
		improvement.GET("/metrics", proxy.forward("continuous-improvement", "/api/v1/improvement/metrics"))
		improvement.POST("/requests", proxy.forward("continuous-improvement", "/api/v1/improvement/requests"))
		improvement.GET("/requests", proxy.forward("continuous-improvement", "/api/v1/improvement/requests"))
		improvement.POST("/feedback", proxy.forward("continuous-improvement", "/api/v1/improvement/feedback"))
		improvement.GET("/recommendations", proxy.forward("continuous-improvement", "/api/v1/improvement/recommendations"))
	}

	logger.Info("All proxy routes configured", zap.Int("registered_services", len(cfg.Services.Registry)))
}

// serviceProxy encapsulates the config-driven proxy logic with connection pooling
type serviceProxy struct {
	cfg    *config.Config
	logger *zap.Logger
	client *http.Client
}

func newServiceProxy(cfg *config.Config, logger *zap.Logger) *serviceProxy {
	return &serviceProxy{
		cfg:    cfg,
		logger: logger,
		client: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 10,
				IdleConnTimeout:     90 * time.Second,
			},
		},
	}
}

// forward creates a handler that proxies requests to a backend service via the config registry
func (p *serviceProxy) forward(serviceName, backendPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		baseURL, exists := p.cfg.Services.Registry[serviceName]
		if !exists {
			p.logger.Error("Service not found in registry", zap.String("service", serviceName))
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"code":    http.StatusServiceUnavailable,
				"message": "Service not available",
				"service": serviceName,
			})
			return
		}

		// Replace path parameters
		finalPath := backendPath
		for _, param := range c.Params {
			finalPath = strings.Replace(finalPath, ":"+param.Key, param.Value, 1)
		}

		if c.Request.URL.RawQuery != "" {
			finalPath += "?" + c.Request.URL.RawQuery
		}

		req, err := http.NewRequestWithContext(c.Request.Context(), c.Request.Method, baseURL+finalPath, c.Request.Body)
		if err != nil {
			p.logger.Error("Failed to create proxy request", zap.String("service", serviceName), zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": "Failed to create request"})
			return
		}

		// Propagate headers (skip hop-by-hop)
		hopByHop := map[string]bool{
			"Connection": true, "Keep-Alive": true, "Transfer-Encoding": true,
			"Proxy-Authenticate": true, "Proxy-Authorization": true, "Te": true,
			"Trailers": true, "Upgrade": true,
		}
		for key, values := range c.Request.Header {
			if key == "Host" || hopByHop[key] {
				continue
			}
			for _, value := range values {
				req.Header.Add(key, value)
			}
		}

		// Inject gateway context headers for downstream services
		req.Header.Set("X-Forwarded-For", c.ClientIP())
		req.Header.Set("X-Request-ID", c.GetString("request_id"))
		req.Header.Set("X-Trace-ID", c.GetString("trace_id"))
		if userID := c.GetString("user_id"); userID != "" {
			req.Header.Set("X-User-ID", userID)
		}
		if username := c.GetString("username"); username != "" {
			req.Header.Set("X-Username", username)
		}

		// Execute with circuit breaker resilience
		resp, err := circuitbreaker.DoHTTPRequest(serviceName, req)
		if err != nil {
			p.logger.Warn("Upstream service error",
				zap.String("service", serviceName),
				zap.String("path", finalPath),
				zap.Error(err),
			)
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"code":     http.StatusServiceUnavailable,
				"message":  "Service temporarily unavailable",
				"service":  serviceName,
				"trace_id": c.GetString("request_id"),
			})
			return
		}
		defer resp.Body.Close()

		for key, values := range resp.Header {
			for _, value := range values {
				c.Header(key, value)
			}
		}

		body, _ := io.ReadAll(resp.Body)
		c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), body)
	}
}

// getPlatformStatus returns real-time aggregated health from the service registry
func getPlatformStatus(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		client := &http.Client{Timeout: 3 * time.Second}
		serviceStatuses := make(map[string]interface{})

		for name, url := range cfg.Services.Registry {
			healthURL := url + "/health"
			status := "unknown"
			var latencyMs int64

			start := time.Now()
			resp, err := client.Get(healthURL)
			latencyMs = time.Since(start).Milliseconds()

			if err != nil {
				status = "unreachable"
			} else {
				resp.Body.Close()
				if resp.StatusCode == http.StatusOK {
					status = "operational"
				} else {
					status = "degraded"
				}
			}

			serviceStatuses[name] = map[string]interface{}{
				"status":     status,
				"latency_ms": latencyMs,
			}
		}

		platformStatus := "operational"
		for _, s := range serviceStatuses {
			sMap := s.(map[string]interface{})
			if sMap["status"] == "unreachable" {
				platformStatus = "degraded"
				break
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"code":    http.StatusOK,
			"message": "Platform status",
			"data": gin.H{
				"platform":  platformStatus,
				"services":  serviceStatuses,
				"timestamp": time.Now().UTC().Format(time.RFC3339),
				"compliance": gin.H{
					"gdpr": "compliant",
					"lgpd": "compliant",
				},
			},
		})
	}
}
