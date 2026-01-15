'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import type { StrategicEntity, RiskAssessment, OSINTSignal, GeospatialContext } from '@/lib/types'

interface EntityIntelligenceViewProps {
  entity: StrategicEntity
}

export default function EntityIntelligenceView({ entity }: EntityIntelligenceViewProps) {
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null)
  const [intelligence, setIntelligence] = useState<OSINTSignal[]>([])
  const [geospatialContext, setGeospatialContext] = useState<GeospatialContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEntityData = async () => {
      setLoading(true)
      try {
        const [riskData, intelData, geoData] = await Promise.all([
          apiClient.assessRisk({
            entity_id: entity.id,
            entity_type: entity.type,
            dimensions: ['geopolitical', 'economic', 'infrastructure'],
            time_horizon: '90d',
          }).catch(() => null),
          apiClient.getEntityIntelligence(entity.id).catch(() => []),
          apiClient.getEntityContext(entity.id).catch(() => null),
        ])

        setRiskAssessment(riskData as RiskAssessment)
        setIntelligence(Array.isArray(intelData) ? intelData : [])
        setGeospatialContext(geoData as GeospatialContext)
      } catch (error) {
        console.error('Failed to load entity data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEntityData()
  }, [entity])

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-gray-500">Loading intelligence data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Entity Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-light text-gray-900 mb-2">{entity.name}</h2>
            <div className="text-sm text-gray-500 capitalize mb-4">
              {entity.type.replace('_', ' ')} • Entity ID: {entity.id}
            </div>
            {entity.aliases && entity.aliases.length > 0 && (
              <div className="text-xs text-gray-400">
                Also known as: {entity.aliases.join(', ')}
              </div>
            )}
          </div>
          <Link
            href={`/risks?entity=${entity.id}`}
            className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800"
          >
            View Risk Profile
          </Link>
        </div>
      </div>

      {/* Risk Assessment Summary */}
      {riskAssessment && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Risk Posture</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Overall Risk</div>
              <div className="text-2xl font-light text-gray-900">
                {(riskAssessment.overall_score * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Confidence</div>
              <div className="text-2xl font-light text-gray-900">
                {(riskAssessment.confidence * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Dimensions</div>
              <div className="text-2xl font-light text-gray-900">
                {Object.keys(riskAssessment.dimensions).length}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Risk Factors</div>
              <div className="text-2xl font-light text-gray-900">
                {riskAssessment.factors.length}
              </div>
            </div>
          </div>

          {/* Risk Dimensions */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Risk Dimensions</h4>
            <div className="space-y-3">
              {Object.entries(riskAssessment.dimensions).map(([key, dimension]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 capitalize">{dimension.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {(dimension.score * 100).toFixed(1)}%
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        dimension.trend === 'increasing' ? 'bg-red-100 text-red-700' :
                        dimension.trend === 'decreasing' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {dimension.trend}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        dimension.score > 0.7 ? 'bg-red-500' :
                        dimension.score > 0.4 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${dimension.score * 100}%` }}
                    ></div>
                  </div>
                  {dimension.key_factors.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Key factors: {dimension.key_factors.slice(0, 2).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Intelligence Signals */}
      {intelligence.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Intelligence Signals</h3>
          <div className="space-y-3">
            {intelligence.slice(0, 5).map((signal) => (
              <div key={signal.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                <div className="text-sm font-medium text-gray-900 mb-1">{signal.title}</div>
                <div className="text-xs text-gray-600 mb-2">{signal.summary}</div>
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <span>{signal.source}</span>
                  <span>•</span>
                  <span>{new Date(signal.published_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Confidence: {(signal.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Geospatial Context */}
      {geospatialContext && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Geospatial Context</h3>
          <div className="text-sm text-gray-600 mb-4">
            {geospatialContext.zones.length} legal zones identified
          </div>
          {geospatialContext.supply_chain_nodes.length > 0 && (
            <div className="text-sm text-gray-600">
              {geospatialContext.supply_chain_nodes.length} supply chain nodes mapped
            </div>
          )}
          <Link
            href={`/geospatial?entity=${entity.id}`}
            className="text-sm text-gray-600 hover:text-gray-900 mt-2 inline-block"
          >
            View on map →
          </Link>
        </div>
      )}
    </div>
  )
}
