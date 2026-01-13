'use client'

import { useState, useEffect } from 'react'
import RiskAssessment from '@/components/RiskAssessment'
import Header from '@/components/Header'

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<string>('checking')

  useEffect(() => {
    // Check API health
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/health`)
      .then(res => res.json())
      .then(data => {
        setHealthStatus(data.status === 'healthy' ? 'online' : 'offline')
      })
      .catch(() => setHealthStatus('offline'))
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <Header healthStatus={healthStatus} />
      
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <h1 className="text-5xl font-light text-gray-900 mb-4 tracking-tight">
            ATLAS
          </h1>
          <p className="text-2xl text-gray-700 mb-2 font-light">
            Strategic Intelligence for Decisions That Shape the Future
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mt-4">
            Transforming open-source global signals into clear, defensible, executive decisions.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Operational
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Compliant
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Multicloud
            </span>
          </div>
        </div>

        {/* Core Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg border border-gray-200 p-8 hover:border-gray-300 transition-colors">
            <h2 className="text-xl font-medium text-gray-900 mb-3">Strategic Risk Assessment</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Continuous evaluation of geopolitical, economic, climate, and infrastructure risks. 
              Multi-dimensional analysis designed to support capital allocation, expansion, and resilience decisions.
            </p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-8 hover:border-gray-300 transition-colors">
            <h2 className="text-xl font-medium text-gray-900 mb-3">Intelligence Analysis</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              AI-driven synthesis of global open-source intelligence. Correlation of weak signals 
              before they become crises. Explainable outputs suitable for executive review.
            </p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-8 hover:border-gray-300 transition-colors">
            <h2 className="text-xl font-medium text-gray-900 mb-3">Scenario & Impact Simulation</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Forward-looking simulation engine. What-if analysis across policy, supply chain, 
              climate, and market dynamics. Decision rehearsal before real-world execution.
            </p>
          </div>
        </div>

        {/* Strategic Operations Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-light text-gray-900 mb-6">Strategic Operations</h2>
          <RiskAssessment />
        </div>
      </div>
    </main>
  )
}
