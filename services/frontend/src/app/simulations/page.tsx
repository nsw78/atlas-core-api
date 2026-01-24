"use client";

import { useState, useCallback } from "react";
import { MainLayout } from "@/components/layouts";
import { useI18n } from "@/i18n";
import {
  scenarioTemplates,
  savedScenarios,
  type ScenarioTemplate,
  type SavedScenario,
  type ScenarioResults,
} from "@/data/scenarios";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ============================================
// WIZARD STEPS
// ============================================
type WizardStep = "list" | "select_type" | "configure" | "running" | "results";

export default function SimulationsPage() {
  const { t } = useI18n();
  const [step, setStep] = useState<WizardStep>("list");
  const [selectedTemplate, setSelectedTemplate] = useState<ScenarioTemplate | null>(null);
  const [parameters, setParameters] = useState<Record<string, string | number>>({});
  const [scenarioName, setScenarioName] = useState("");
  const [runProgress, setRunProgress] = useState(0);
  const [results, setResults] = useState<ScenarioResults | null>(null);
  const [scenarios, setScenarios] = useState<SavedScenario[]>(savedScenarios);
  const [viewingScenario, setViewingScenario] = useState<SavedScenario | null>(null);

  // Initialize parameters when template is selected
  const selectTemplate = useCallback((template: ScenarioTemplate) => {
    setSelectedTemplate(template);
    const defaults: Record<string, string | number> = {};
    template.parameters.forEach((p) => {
      defaults[p.key] = p.defaultValue;
    });
    setParameters(defaults);
    setScenarioName(`${template.label} - ${new Date().toLocaleDateString()}`);
    setStep("configure");
  }, []);

  // Run simulation
  const runSimulation = useCallback(() => {
    setStep("running");
    setRunProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setRunProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          // Generate results
          const generatedResults: ScenarioResults = {
            overallImpact: Math.round(50 + Math.random() * 40),
            economicImpact: Math.round(40 + Math.random() * 50),
            socialImpact: Math.round(20 + Math.random() * 60),
            infrastructureImpact: Math.round(30 + Math.random() * 60),
            environmentalImpact: Math.round(10 + Math.random() * 40),
            probability: Math.round(15 + Math.random() * 50),
            confidence: Math.round(75 + Math.random() * 20),
            timeline: [
              { day: 1, event: "Initial disruption detected", impact: 15 },
              { day: 3, event: "Escalation of primary effects", impact: 35 },
              { day: 7, event: "Secondary cascading effects begin", impact: 55 },
              { day: 14, event: "Peak impact reached", impact: 85 },
              { day: 21, event: "Stabilization begins", impact: 70 },
              { day: 30, event: "Recovery phase initiated", impact: 50 },
            ],
            recommendations: [
              "Activate contingency protocols for affected sectors",
              "Coordinate with regional authorities for resource allocation",
              "Establish alternative supply routes and backup systems",
              "Monitor secondary indicators for further escalation",
              "Prepare public communication strategy",
            ],
            affectedRegions: ["Asia Pacific", "Europe", "North America"],
          };
          setResults(generatedResults);
          setStep("results");

          // Add to saved scenarios
          const newScenario: SavedScenario = {
            id: `SCN-${String(scenarios.length + 1).padStart(3, "0")}`,
            name: scenarioName,
            type: selectedTemplate?.type || "cyber_attack",
            status: "completed",
            parameters,
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            results: generatedResults,
          };
          setScenarios((prev) => [newScenario, ...prev]);
          return 100;
        }
        return prev + 2;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [scenarioName, selectedTemplate, parameters, scenarios.length]);

  // Reset wizard
  const resetWizard = useCallback(() => {
    setStep("list");
    setSelectedTemplate(null);
    setParameters({});
    setScenarioName("");
    setRunProgress(0);
    setResults(null);
    setViewingScenario(null);
  }, []);

  // View a saved scenario
  const viewScenario = useCallback((scenario: SavedScenario) => {
    if (scenario.results) {
      setViewingScenario(scenario);
      setResults(scenario.results);
      setStep("results");
    }
  }, []);

  return (
    <MainLayout title={t("simulations.title")} subtitle={t("simulations.subtitle")}>
      <div className="space-y-6">
        {/* Step Indicator (when in wizard mode) */}
        {step !== "list" && (
          <div className="flex items-center gap-2">
            <button
              onClick={resetWizard}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to {t("simulations.scenarios")}
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {(["select_type", "configure", "running", "results"] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step === s ? "bg-blue-600 text-white" :
                    (["select_type", "configure", "running", "results"].indexOf(step) > i)
                      ? "bg-emerald-500 text-white" : "bg-gray-700 text-gray-400"
                  }`}>
                    {(["select_type", "configure", "running", "results"].indexOf(step) > i)
                      ? <CheckIcon className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  {i < 3 && <div className={`w-8 h-0.5 ${
                    (["select_type", "configure", "running", "results"].indexOf(step) > i) ? "bg-emerald-500" : "bg-gray-700"
                  }`} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP: List (Home) */}
        {step === "list" && (
          <>
            {/* Create New Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Saved Scenarios</h2>
                <p className="text-xs text-gray-400">{scenarios.length} scenarios created</p>
              </div>
              <button
                onClick={() => setStep("select_type")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Scenario
              </button>
            </div>

            {/* Scenarios Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios.map((scenario) => {
                const template = scenarioTemplates.find((t) => t.type === scenario.type);
                return (
                  <button
                    key={scenario.id}
                    onClick={() => viewScenario(scenario)}
                    className="text-left bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        scenario.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
                        scenario.status === "running" ? "bg-amber-500/20 text-amber-400" :
                        scenario.status === "failed" ? "bg-red-500/20 text-red-400" :
                        "bg-gray-700 text-gray-400"
                      }`}>
                        {scenario.status}
                      </span>
                      <span className="text-xs text-gray-500">{scenario.id}</span>
                    </div>
                    <h3 className="text-sm font-medium text-white mb-1">{scenario.name}</h3>
                    <p className="text-xs text-gray-500 mb-3" style={{ color: template?.color }}>
                      {template?.label}
                    </p>
                    {scenario.results ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-500">{t("simulations.impact")}</p>
                          <p className={`text-lg font-bold ${
                            scenario.results.overallImpact >= 70 ? "text-red-400" :
                            scenario.results.overallImpact >= 40 ? "text-amber-400" : "text-emerald-400"
                          }`}>{scenario.results.overallImpact}/100</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t("simulations.confidence")}</p>
                          <p className="text-lg font-bold text-blue-400">{scenario.results.confidence}%</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">
                        {scenario.status === "running" ? "Simulation in progress..." : "No results yet"}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* STEP: Select Type */}
        {step === "select_type" && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">{t("simulations.scenarios")}</h2>
            <p className="text-sm text-gray-400 mb-6">Select the type of scenario you want to simulate</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarioTemplates.map((template) => (
                <button
                  key={template.type}
                  onClick={() => selectTemplate(template)}
                  className="text-left bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-600 transition-all group"
                  style={{ borderColor: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = template.color + "60")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: template.color + "20" }}
                  >
                    <ScenarioIcon type={template.icon} color={template.color} />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{template.label}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{template.description}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-gray-500">
                    <span>{template.parameters.length} parameters</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP: Configure Parameters */}
        {step === "configure" && selectedTemplate && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: selectedTemplate.color + "20" }}
              >
                <ScenarioIcon type={selectedTemplate.icon} color={selectedTemplate.color} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{selectedTemplate.label}</h2>
                <p className="text-xs text-gray-400">Configure simulation parameters</p>
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-5">
              {/* Scenario Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">{t("simulations.scenarios")}</label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Parameters */}
              {selectedTemplate.parameters.map((param) => (
                <div key={param.key}>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    {param.label}
                    {param.unit && <span className="text-gray-500 font-normal ml-1">({param.unit})</span>}
                  </label>

                  {param.type === "select" && (
                    <select
                      value={String(parameters[param.key] || param.defaultValue)}
                      onChange={(e) => setParameters((p) => ({ ...p, [param.key]: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      {param.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}

                  {param.type === "range" && (
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={param.min || 0}
                        max={param.max || 100}
                        step={param.step || 1}
                        value={Number(parameters[param.key] || param.defaultValue)}
                        onChange={(e) => setParameters((p) => ({ ...p, [param.key]: Number(e.target.value) }))}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <span className="text-sm font-medium text-white w-12 text-right">
                        {parameters[param.key] || param.defaultValue}{param.unit ? ` ${param.unit}` : ""}
                      </span>
                    </div>
                  )}

                  {param.type === "number" && (
                    <input
                      type="number"
                      min={param.min}
                      max={param.max}
                      value={Number(parameters[param.key] || param.defaultValue)}
                      onChange={(e) => setParameters((p) => ({ ...p, [param.key]: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  )}

                  {param.type === "region" && (
                    <select
                      value={String(parameters[param.key] || param.defaultValue)}
                      onChange={(e) => setParameters((p) => ({ ...p, [param.key]: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="NA">North America</option>
                      <option value="EU">Europe</option>
                      <option value="APAC">Asia Pacific</option>
                      <option value="ME">Middle East</option>
                      <option value="SA">South America</option>
                      <option value="AF">Africa</option>
                      <option value="GLOBAL">Global</option>
                    </select>
                  )}

                  {param.type === "text" && (
                    <input
                      type="text"
                      value={String(parameters[param.key] || param.defaultValue)}
                      onChange={(e) => setParameters((p) => ({ ...p, [param.key]: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setStep("select_type")}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={runSimulation}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <PlayIcon className="w-4 h-4" />
                {t("simulations.runSimulation")}
              </button>
            </div>
          </div>
        )}

        {/* STEP: Running */}
        {step === "running" && (
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin" />
            <h2 className="text-xl font-semibold text-white mb-2">Running Simulation</h2>
            <p className="text-sm text-gray-400 mb-6">{scenarioName}</p>

            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-200"
                style={{ width: `${runProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{runProgress}% complete</p>

            {/* Progress Steps */}
            <div className="mt-8 space-y-3 text-left max-w-sm mx-auto">
              {[
                { threshold: 0, label: "Initializing simulation engine" },
                { threshold: 20, label: "Loading scenario parameters" },
                { threshold: 40, label: "Running Monte Carlo simulations" },
                { threshold: 60, label: "Analyzing cascading effects" },
                { threshold: 80, label: "Generating impact assessment" },
                { threshold: 95, label: "Compiling recommendations" },
              ].map((s) => (
                <div key={s.threshold} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    runProgress > s.threshold ? "bg-emerald-500" : runProgress >= s.threshold ? "bg-blue-500 animate-pulse" : "bg-gray-700"
                  }`}>
                    {runProgress > s.threshold && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={`text-sm ${runProgress >= s.threshold ? "text-white" : "text-gray-500"}`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP: Results */}
        {step === "results" && results && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {viewingScenario ? viewingScenario.name : scenarioName}
                </h2>
                <p className="text-xs text-gray-400">Simulation completed</p>
              </div>
              <button
                onClick={resetWizard}
                className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:text-white hover:border-gray-600 transition-colors"
              >
                New Scenario
              </button>
            </div>

            {/* Impact Scores */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { label: "Overall", value: results.overallImpact, color: results.overallImpact >= 70 ? "text-red-400" : "text-amber-400" },
                { label: "Economic", value: results.economicImpact, color: results.economicImpact >= 70 ? "text-red-400" : "text-amber-400" },
                { label: "Social", value: results.socialImpact, color: results.socialImpact >= 70 ? "text-red-400" : "text-amber-400" },
                { label: "Infrastructure", value: results.infrastructureImpact, color: results.infrastructureImpact >= 70 ? "text-red-400" : "text-amber-400" },
                { label: "Environmental", value: results.environmentalImpact, color: results.environmentalImpact >= 40 ? "text-amber-400" : "text-emerald-400" },
                { label: "Probability", value: results.probability, color: "text-blue-400" },
                { label: "Confidence", value: results.confidence, color: "text-cyan-400" },
              ].map((item) => (
                <div key={item.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] text-gray-500">/100</p>
                </div>
              ))}
            </div>

            {/* Timeline Chart */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <h3 className="text-base font-semibold text-white mb-4">Impact Timeline</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={results.timeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scenarioGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" stroke="#6b7280" fontSize={10} tickFormatter={(v: number) => `Day ${v}`} />
                    <YAxis stroke="#6b7280" fontSize={10} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                      labelFormatter={(v: number) => `Day ${v}`}
                    />
                    <Area type="monotone" dataKey="impact" stroke="#ef4444" fill="url(#scenarioGrad)" strokeWidth={2} name="Impact Score" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* Timeline Events */}
              <div className="mt-4 space-y-2">
                {results.timeline.map((event, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-14">Day {event.day}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      event.impact >= 70 ? "bg-red-500" : event.impact >= 40 ? "bg-amber-500" : "bg-emerald-500"
                    }`} />
                    <span className="text-xs text-gray-300 flex-1">{event.event}</span>
                    <span className={`text-xs font-medium ${
                      event.impact >= 70 ? "text-red-400" : event.impact >= 40 ? "text-amber-400" : "text-emerald-400"
                    }`}>{event.impact}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations & Regions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-base font-semibold text-white mb-4">Recommendations</h3>
                <ul className="space-y-3">
                  {results.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-base font-semibold text-white mb-4">Affected Regions</h3>
                <div className="space-y-3">
                  {results.affectedRegions.map((region) => (
                    <div key={region} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <span className="text-sm text-gray-300">{region}</span>
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">Affected</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================
function ScenarioIcon({ type, color }: { type: string; color: string }) {
  const className = "w-5 h-5";
  const style = { color };

  switch (type) {
    case "shield":
      return (
        <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case "bolt":
      return (
        <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "globe":
      return (
        <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "cloud":
      return (
        <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      );
    case "truck":
      return (
        <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h8M8 17a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4zM2 5h12l4 6h2a2 2 0 012 2v3a2 2 0 01-2 2h-1" />
        </svg>
      );
    default:
      return null;
  }
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
