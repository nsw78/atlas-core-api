'use client'

import { useState } from 'react'

export default function RiskAssessment() {
  const [entityId, setEntityId] = useState('country-BRA')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAssess = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/risks/assess`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token' // TODO: Get from auth
          },
          body: JSON.stringify({
            entity_id: entityId,
            entity_type: 'country',
            dimensions: ['geopolitical', 'economic'],
            time_horizon: '30d'
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to assess risk')
      }

      const data = await response.json()
      setResult(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-4">Risk Assessment</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Entity ID
        </label>
        <input
          type="text"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="country-BRA"
        />
      </div>

      <button
        onClick={handleAssess}
        disabled={loading}
        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Assessing...' : 'Assess Risk'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="font-semibold mb-2">Assessment Result</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Overall Score: </span>
              <span className="text-primary-600">{(result.overall_score * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="font-medium">Confidence: </span>
              <span>{(result.confidence * 100).toFixed(1)}%</span>
            </div>
            {result.dimensions && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Dimensions:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(result.dimensions).map(([key, dim]: [string, any]) => (
                    <li key={key}>
                      {dim.name}: {(dim.score * 100).toFixed(1)}% ({dim.trend})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
