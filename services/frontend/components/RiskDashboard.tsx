'use client'

import { useState } from 'react'
import RiskDimensionChart from './RiskDimensionChart'
import RiskTimeline from './RiskTimeline'
import RiskFactorsList from './RiskFactorsList'
import type { RiskProfile, RiskDimension } from '@/lib/types'

interface RiskDashboardProps {
  profile: RiskProfile
}

export default function RiskDashboard({ profile }: RiskDashboardProps) {
  const [selectedDimension, setSelectedDimension] = useState<RiskDimension | 'all'>('all')

  const dimensions = Object.keys(profile.current_assessment.dimensions) as RiskDimension[]

  return (
    <div className="space-y-6">
      {/* Risk Profile Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-light text-gray-900 mb-2">{profile.name}</h2>
            <p className="text-sm text-gray-600">{profile.summary}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Overall Risk Score</div>
            <div className="text-3xl font-light text-gray-900">
              {(profile.current_assessment.overall_score * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Confidence: {(profile.current_assessment.confidence * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Dimension Selector */}
        <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
          <button
            onClick={() => setSelectedDimension('all')}
            className={`px-3 py-1 text-xs rounded ${
              selectedDimension === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Dimensions
          </button>
          {dimensions.map((dim) => (
            <button
              key={dim}
              onClick={() => setSelectedDimension(dim)}
              className={`px-3 py-1 text-xs rounded capitalize ${
                selectedDimension === dim
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {dim.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Dimensions</h3>
          <RiskDimensionChart
            assessment={profile.current_assessment}
            selectedDimension={selectedDimension}
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Evolution</h3>
          <RiskTimeline trends={profile.historical_trends} selectedDimension={selectedDimension} />
        </div>
      </div>

      {/* Risk Factors */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Key Risk Factors</h3>
        <RiskFactorsList
          factors={profile.current_assessment.factors}
          selectedDimension={selectedDimension}
        />
      </div>

      {/* Active Alerts */}
      {profile.alerts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Active Risk Alerts</h3>
          <div className="space-y-3">
            {profile.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded border ${
                  alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                  alert.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                  'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1 capitalize">
                      {alert.dimension} Risk Alert
                    </div>
                    <div className="text-xs text-gray-600">
                      Current: {(alert.current_value * 100).toFixed(1)}% • 
                      Threshold: {(alert.threshold * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Triggered: {new Date(alert.triggered_at).toLocaleString()}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded capitalize ${
                    alert.severity === 'critical' ? 'bg-red-200 text-red-800' :
                    alert.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                    'bg-yellow-200 text-yellow-800'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
