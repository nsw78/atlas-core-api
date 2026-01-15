'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import OSINTFeed from '@/components/OSINTFeed'
import OSINTQuery from '@/components/OSINTQuery'
import { apiClient } from '@/lib/api/client'
import type { OSINTSignal } from '@/lib/types'

export default function IntelligencePage() {
  const [signals, setSignals] = useState<OSINTSignal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSignals = async () => {
      try {
        const data = await apiClient.getOSINTFeed(50)
        setSignals(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to load signals:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSignals()
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <Header healthStatus="online" />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-light text-gray-900 mb-2">OSINT Intelligence Feed</h1>
          <p className="text-gray-600">Curated intelligence stream with AI-summarized insights</p>
        </div>
        <div className="mb-6">
          <OSINTQuery onResults={(results) => setSignals(results)} />
        </div>
        <OSINTFeed signals={signals} loading={loading} />
      </div>
    </main>
  )
}
