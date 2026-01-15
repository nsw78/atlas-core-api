'use client'

import type { OSINTSignal } from '@/lib/types'

interface OSINTFeedProps {
  signals: OSINTSignal[]
  loading: boolean
}

export default function OSINTFeed({ signals, loading }: OSINTFeedProps) {
  if (loading) {
    return <div className="text-sm text-gray-500 py-8 text-center">Loading intelligence signals...</div>
  }

  return (
    <div className="space-y-4">
      {signals.map((signal) => (
        <div key={signal.id} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">{signal.title}</h3>
            <div className="flex items-center space-x-2">
              <span className={`text-xs px-2 py-1 rounded ${
                signal.confidence > 0.7 ? 'bg-green-100 text-green-700' :
                signal.confidence > 0.4 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {(signal.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-4">{signal.summary}</p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>{signal.source}</span>
              <span>•</span>
              <span>{new Date(signal.published_at).toLocaleString()}</span>
              <span>•</span>
              <span>Credibility: {(signal.source_credibility * 100).toFixed(0)}%</span>
            </div>
            {signal.url && (
              <a href={signal.url} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900">
                Source →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
