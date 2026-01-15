'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api/client'
import type { Scenario } from '@/lib/types'

interface ScenarioBuilderProps {
  onCancel: () => void
  onCreated: (scenario: Scenario) => void
}

export default function ScenarioBuilder({ onCancel, onCreated }: ScenarioBuilderProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    model_type: 'economic' as 'economic' | 'infrastructure' | 'supply_chain' | 'policy' | 'climate',
    parameters: {} as Record<string, any>,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const scenario = await apiClient.createScenario(formData)
      onCreated(scenario as Scenario)
    } catch (error) {
      console.error('Failed to create scenario:', error)
      alert('Failed to create scenario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <h2 className="text-2xl font-light text-gray-900 mb-6">Create Scenario</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scenario Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
            placeholder="e.g., Supply Chain Disruption - Electronics Sector"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
            placeholder="Describe the scenario and its strategic context..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model Type
          </label>
          <select
            value={formData.model_type}
            onChange={(e) => setFormData({ ...formData, model_type: e.target.value as any })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            <option value="economic">Economic Impact</option>
            <option value="infrastructure">Infrastructure Resilience</option>
            <option value="supply_chain">Supply Chain Disruption</option>
            <option value="policy">Policy Impact</option>
            <option value="climate">Climate Scenario</option>
          </select>
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Scenario'}
          </button>
        </div>
      </form>
    </div>
  )
}
