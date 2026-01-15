'use client'

import type { RiskTrend, RiskDimension } from '@/lib/types'

interface RiskTimelineProps {
  trends: RiskTrend[]
  selectedDimension: RiskDimension | 'all'
}

export default function RiskTimeline({ trends, selectedDimension }: RiskTimelineProps) {
  const filteredTrends = trends.filter(t => 
    selectedDimension === 'all' || t.dimension === selectedDimension
  ).slice(-30) // Last 30 data points

  if (filteredTrends.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-8 text-center">
        No historical trend data available
      </div>
    )
  }

  const maxScore = Math.max(...filteredTrends.map(t => t.score))
  const minScore = Math.min(...filteredTrends.map(t => t.score))

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between h-48 border-b border-gray-200">
        {filteredTrends.map((trend, index) => {
          const height = ((trend.score - minScore) / (maxScore - minScore || 1)) * 100
          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center justify-end mx-0.5"
              title={`${new Date(trend.date).toLocaleDateString()}: ${(trend.score * 100).toFixed(1)}%`}
            >
              <div
                className={`w-full rounded-t ${
                  trend.score > 0.7 ? 'bg-red-500' :
                  trend.score > 0.4 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ height: `${height}%`, minHeight: '4px' }}
              ></div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
        <span>{new Date(filteredTrends[0]?.date).toLocaleDateString()}</span>
        <span>{new Date(filteredTrends[filteredTrends.length - 1]?.date).toLocaleDateString()}</span>
      </div>
    </div>
  )
}
