'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api/client'
import type { OSINTSignal } from '@/lib/types'

interface OSINTQueryProps {
  onResults: (signals: OSINTSignal[]) => void
}

export default function OSINTQuery({ onResults }: OSINTQueryProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await apiClient.getOSINTAnalysis(query)
      if (data && typeof data === 'object' && 'signals' in data) {
        const signals = (data as { signals?: OSINTSignal[] }).signals
        onResults(Array.isArray(signals) ? signals : [])
      } else {
        onResults([])
      }
    } catch (error) {
      console.error('Query failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleQuery} className="bg-white rounded-lg border border-gray-200 p-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Query Intelligence Signals
      </label>
      <div className="flex space-x-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search query..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Querying...' : 'Query'}
        </button>
      </div>
    </form>
  )
}
