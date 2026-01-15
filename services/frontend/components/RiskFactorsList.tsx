'use client'

import type { RiskFactor, RiskDimension } from '@/lib/types'

interface RiskFactorsListProps {
  factors: RiskFactor[]
  selectedDimension: RiskDimension | 'all'
}

export default function RiskFactorsList({ factors, selectedDimension }: RiskFactorsListProps) {
  const sortedFactors = [...factors]
    .filter(f => selectedDimension === 'all' || f.source.includes(selectedDimension))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 10)

  if (sortedFactors.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4">
        No risk factors available for selected dimension
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sortedFactors.map((factor) => (
        <div key={factor.id} className="flex items-start justify-between border-b border-gray-100 last:border-0 pb-3 last:pb-0">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 mb-1">{factor.name}</div>
            {factor.description && (
              <div className="text-xs text-gray-600 mb-2">{factor.description}</div>
            )}
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <span>Source: {factor.source}</span>
              <span>•</span>
              <span>Impact: {(factor.impact * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div className="ml-4">
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-900 h-2 rounded-full"
                style={{ width: `${factor.impact * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
