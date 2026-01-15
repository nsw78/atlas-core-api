'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api/client'
import type { Scenario } from '@/lib/types'

interface ScenarioListProps {
  scenarios: Scenario[]
  selectedScenario: Scenario | null
  onSelectScenario: (scenario: Scenario) => void
  loading: boolean
}

export default function ScenarioList({
  scenarios,
  selectedScenario,
  onSelectScenario,
  loading,
}: ScenarioListProps) {
  const [runningScenarios, setRunningScenarios] = useState<Set<string>>(new Set())

  const handleRunScenario = async (scenario: Scenario) => {
    if (scenario.status === 'running') return

    setRunningScenarios(new Set([...runningScenarios, scenario.id]))
    try {
      await apiClient.runScenario(scenario.id)
      // Poll for results
      setTimeout(async () => {
        const updated = await apiClient.getScenario(scenario.id)
        onSelectScenario(updated as Scenario)
        setRunningScenarios(new Set([...runningScenarios].filter(id => id !== scenario.id)))
      }, 2000)
    } catch (error) {
      console.error('Failed to run scenario:', error)
      setRunningScenarios(new Set([...runningScenarios].filter(id => id !== scenario.id)))
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-gray-500">Loading scenarios...</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Scenario List */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Scenarios</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {scenarios.length === 0 ? (
              <div className="text-sm text-gray-500 py-4 text-center">
                No scenarios created yet
              </div>
            ) : (
              scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => onSelectScenario(scenario)}
                  className={`w-full text-left px-3 py-3 rounded border transition-colors ${
                    selectedScenario?.id === scenario.id
                      ? 'bg-gray-100 border-gray-300'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 mb-1">{scenario.name}</div>
                  <div className="text-xs text-gray-500 mb-2 capitalize">{scenario.model_type}</div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded ${
                      scenario.status === 'completed' ? 'bg-green-100 text-green-700' :
                      scenario.status === 'running' ? 'bg-blue-100 text-blue-700' :
                      scenario.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {scenario.status}
                    </span>
                    {scenario.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRunScenario(scenario)
                        }}
                        disabled={runningScenarios.has(scenario.id)}
                        className="text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      >
                        Run →
                      </button>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Scenario Details */}
      <div className="lg:col-span-2">
        {selectedScenario ? (
          <ScenarioDetails scenario={selectedScenario} />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">Select a scenario to view details</p>
            <p className="text-sm text-gray-400">
              Choose from the list or create a new scenario
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ScenarioDetails({ scenario }: { scenario: Scenario }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-light text-gray-900 mb-2">{scenario.name}</h2>
        <p className="text-sm text-gray-600 mb-4">{scenario.description}</p>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="capitalize">Type: {scenario.model_type}</span>
          <span>•</span>
          <span className={`capitalize ${
            scenario.status === 'completed' ? 'text-green-600' :
            scenario.status === 'running' ? 'text-blue-600' :
            scenario.status === 'failed' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            Status: {scenario.status}
          </span>
          <span>•</span>
          <span>Created: {new Date(scenario.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {scenario.results && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Simulation Results</h3>
          
          {scenario.results.economic_impact && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Economic Impact</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">GDP Impact</div>
                  <div className="text-lg font-medium text-gray-900">
                    {scenario.results.economic_impact.gdp_impact_percent > 0 ? '+' : ''}
                    {scenario.results.economic_impact.gdp_impact_percent.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Estimated Loss</div>
                  <div className="text-lg font-medium text-gray-900">
                    ${(scenario.results.economic_impact.estimated_loss_usd / 1e9).toFixed(2)}B
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Affected Sectors</div>
                  <div className="text-lg font-medium text-gray-900">
                    {scenario.results.economic_impact.affected_sectors.length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {scenario.results.recommendations && scenario.results.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Recommendations</h4>
              <ul className="space-y-2">
                {scenario.results.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="mr-2 text-gray-400">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
