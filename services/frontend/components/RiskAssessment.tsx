'use client'

import { useState } from 'react'

export default function RiskAssessment() {
  const [entityId, setEntityId] = useState('Federative Republic of Brazil')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAssess = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Convert human-readable entity name to system ID if needed
      const systemEntityId = entityId.toLowerCase().includes('brazil') ? 'country-BRA' : 
                            entityId.toLowerCase().includes('usa') || entityId.toLowerCase().includes('united states') ? 'country-USA' :
                            entityId

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/risks/assess`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token' // TODO: Get from auth
          },
          body: JSON.stringify({
            entity_id: systemEntityId,
            entity_type: 'country',
            dimensions: ['geopolitical', 'economic', 'infrastructure'],
            time_horizon: '90d'
          })
        }
      )

      if (!response.ok) {
        throw new Error('Strategic assessment unavailable')
      }

      const data = await response.json()
      setResult(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assessment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-light text-gray-900 mb-2">Strategic Risk Profile</h2>
        <p className="text-sm text-gray-500">
          Multi-dimensional risk assessment for strategic decision support
        </p>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Strategic Entity of Interest
        </label>
        <input
          type="text"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-gray-900"
          placeholder="Federative Republic of Brazil"
        />
        <p className="mt-2 text-xs text-gray-500">
          Enter country, region, or infrastructure entity
        </p>
      </div>

      <button
        onClick={handleAssess}
        disabled={loading}
        className="px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm tracking-wide transition-colors"
      >
        {loading ? 'Generating Assessment...' : 'Generate Strategic Risk Profile'}
      </button>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8 p-6 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment Summary</h3>
          <div className="space-y-4 text-sm">
            <div className="flex items-baseline justify-between pb-3 border-b border-gray-200">
              <span className="text-gray-600">Overall Risk Score</span>
              <span className="text-2xl font-light text-gray-900">{(result.overall_score * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-gray-600">Assessment Confidence</span>
              <span className="text-gray-900">{(result.confidence * 100).toFixed(1)}%</span>
            </div>
            {result.dimensions && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Risk Dimensions</h4>
                <div className="space-y-3">
                  {Object.entries(result.dimensions).map(([key, dim]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <span className="text-gray-700 capitalize">{dim.name}</span>
                        <span className="ml-2 text-xs text-gray-500">({dim.trend})</span>
                      </div>
                      <span className="text-gray-900 font-medium">{(dim.score * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.factors && result.factors.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Key Risk Factors</h4>
                <ul className="space-y-2">
                  {result.factors.slice(0, 3).map((factor: any) => (
                    <li key={factor.id} className="text-sm text-gray-600">
                      • {factor.name} <span className="text-gray-400">({factor.source})</span>
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
