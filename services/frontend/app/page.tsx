'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import PlatformStatus from '@/components/PlatformStatus'
import ActiveSignalsSummary from '@/components/ActiveSignalsSummary'
import StrategicKPIs from '@/components/StrategicKPIs'
import QuickAccessPanel from '@/components/QuickAccessPanel'
import { apiClient } from '@/lib/api/client'
import type { PlatformStatus as PlatformStatusType, PlatformKPI } from '@/lib/types'

export default function Home() {
  const [platformStatus, setPlatformStatus] = useState<PlatformStatusType | null>(null)
  const [kpis, setKPIs] = useState<PlatformKPI | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [status, kpiData] = await Promise.all([
          apiClient.getPlatformStatus(),
          apiClient.getPlatformKPIs(),
        ])
        setPlatformStatus(status as PlatformStatusType)
        setKPIs(kpiData as PlatformKPI)
      } catch (error) {
        console.error('Failed to load platform data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <Header healthStatus={platformStatus?.platform === 'operational' ? 'online' : 'offline'} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-light text-gray-900 mb-4 tracking-tight">
            ATLAS
          </h1>
          <p className="text-2xl text-gray-700 mb-2 font-light">
            Strategic Intelligence for Decisions That Shape the Future
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mt-4">
            Transforming open-source global signals into clear, defensible, executive decisions.
          </p>
        </div>

        {/* Platform Status */}
        {platformStatus && (
          <div className="mb-8">
            <PlatformStatus status={platformStatus} />
          </div>
        )}

        {/* Strategic KPIs */}
        {kpis && (
          <div className="mb-8">
            <StrategicKPIs kpis={kpis} />
          </div>
        )}

        {/* Active Risk Signals */}
        <div className="mb-8">
          <ActiveSignalsSummary />
        </div>

        {/* Core Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link href="/entities" className="bg-white rounded-lg border border-gray-200 p-8 hover:border-gray-300 transition-colors group">
            <h2 className="text-xl font-medium text-gray-900 mb-3 group-hover:text-gray-700">
              Strategic Entity Workspace
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Comprehensive intelligence view for countries, regions, organizations, and supply chains. 
              Historical and real-time signal correlation.
            </p>
            <span className="text-xs text-gray-400 mt-4 inline-block">Explore entities →</span>
          </Link>
          
          <Link href="/risks" className="bg-white rounded-lg border border-gray-200 p-8 hover:border-gray-300 transition-colors group">
            <h2 className="text-xl font-medium text-gray-900 mb-3 group-hover:text-gray-700">
              Risk Intelligence Dashboard
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Multi-domain risk visualization with time-based evolution. 
              Explainable risk factors across geopolitical, economic, climate, and operational dimensions.
            </p>
            <span className="text-xs text-gray-400 mt-4 inline-block">View risks →</span>
          </Link>
          
          <Link href="/scenarios" className="bg-white rounded-lg border border-gray-200 p-8 hover:border-gray-300 transition-colors group">
            <h2 className="text-xl font-medium text-gray-900 mb-3 group-hover:text-gray-700">
              Scenario & Simulation
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Forward-looking simulation engine. What-if analysis across policy, supply chain, 
              climate, and market dynamics. Decision rehearsal before execution.
            </p>
            <span className="text-xs text-gray-400 mt-4 inline-block">Run scenarios →</span>
          </Link>
        </div>

        {/* Additional Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link href="/geospatial" className="bg-white rounded-lg border border-gray-200 p-8 hover:border-gray-300 transition-colors group">
            <h2 className="text-xl font-medium text-gray-900 mb-3 group-hover:text-gray-700">
              Geospatial Intelligence
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Interactive map-driven exploration of supply chains, infrastructure dependencies, 
              and geopolitical boundaries.
            </p>
            <span className="text-xs text-gray-400 mt-4 inline-block">View map →</span>
          </Link>

          <Link href="/intelligence" className="bg-white rounded-lg border border-gray-200 p-8 hover:border-gray-300 transition-colors group">
            <h2 className="text-xl font-medium text-gray-900 mb-3 group-hover:text-gray-700">
              OSINT Intelligence Feed
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Curated intelligence stream with AI-summarized insights. 
              Source traceability and signal confidence indicators.
            </p>
            <span className="text-xs text-gray-400 mt-4 inline-block">View feed →</span>
          </Link>

          <Link href="/compliance" className="bg-white rounded-lg border border-gray-200 p-8 hover:border-gray-300 transition-colors group">
            <h2 className="text-xl font-medium text-gray-900 mb-3 group-hover:text-gray-700">
              Compliance & Governance
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Audit trails, data provenance, model explainability, 
              and policy enforcement status.
            </p>
            <span className="text-xs text-gray-400 mt-4 inline-block">View compliance →</span>
          </Link>
        </div>

      </div>
    </main>
  )
}
