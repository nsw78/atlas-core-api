'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import ScenarioList from '@/components/ScenarioList'
import ScenarioBuilder from '@/components/ScenarioBuilder'
import { apiClient } from '@/lib/api/client'
import type { Scenario } from '@/lib/types'

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const data = await apiClient.getScenarios()
        setScenarios(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to load scenarios:', error)
      } finally {
        setLoading(false)
      }
    }

    loadScenarios()
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <Header healthStatus="online" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">Scenario & Impact Simulation</h1>
            <p className="text-gray-600">
              Forward-looking simulation engine for what-if analysis and decision rehearsal
            </p>
          </div>
          <button
            onClick={() => setShowBuilder(true)}
            className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800"
          >
            Create Scenario
          </button>
        </div>

        {showBuilder ? (
          <ScenarioBuilder
            onCancel={() => setShowBuilder(false)}
            onCreated={(scenario) => {
              setScenarios([scenario, ...scenarios])
              setSelectedScenario(scenario)
              setShowBuilder(false)
            }}
          />
        ) : (
          <ScenarioList
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            onSelectScenario={setSelectedScenario}
            loading={loading}
          />
        )}
      </div>
    </main>
  )
}
