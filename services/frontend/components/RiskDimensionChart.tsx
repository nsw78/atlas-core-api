'use client'

import type { RiskAssessment, RiskDimension } from '@/lib/types'

interface RiskDimensionChartProps {
  assessment: RiskAssessment
  selectedDimension: RiskDimension | 'all'
}

export default function RiskDimensionChart({ assessment, selectedDimension }: RiskDimensionChartProps) {
  const dimensions = Object.entries(assessment.dimensions)
    .filter(([key]) => selectedDimension === 'all' || key === selectedDimension)
    .sort(([, a], [, b]) => b.score - a.score)

  return (
    <div className="space-y-4">
      {dimensions.map(([key, dimension]) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900 capitalize">
                {dimension.name.replace('_', ' ')}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${
                dimension.trend === 'increasing' ? 'bg-red-100 text-red-700' :
                dimension.trend === 'decreasing' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {dimension.trend}
              </span>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {(dimension.score * 100).toFixed(1)}%
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                dimension.score > 0.7 ? 'bg-red-500' :
                dimension.score > 0.4 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${dimension.score * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Confidence: {(dimension.confidence * 100).toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  )
}
