'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import type { OSINTSignal } from '@/lib/types'

export default function ActiveSignalsSummary() {
  const [signals, setSignals] = useState<OSINTSignal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSignals = async () => {
      try {
        const data = await apiClient.getOSINTSignals({ limit: 5 })
        setSignals(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to load signals:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSignals()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-sm text-gray-500">Loading active signals...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">Active Intelligence Signals</h2>
        <Link href="/intelligence" className="text-sm text-gray-600 hover:text-gray-900">
          View all →
        </Link>
      </div>

      {signals.length === 0 ? (
        <div className="text-sm text-gray-500 py-4">
          No active signals in the last 24 hours.
        </div>
      ) : (
        <div className="space-y-3">
          {signals.map((signal) => (
            <div key={signal.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 mb-1">{signal.title}</div>
                  <div className="text-xs text-gray-600 mb-2">{signal.summary}</div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{signal.source}</span>
                    <span>•</span>
                    <span>{new Date(signal.published_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className={`${signal.confidence > 0.7 ? 'text-green-600' : signal.confidence > 0.4 ? 'text-yellow-600' : 'text-red-600'}`}>
                      Confidence: {(signal.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
