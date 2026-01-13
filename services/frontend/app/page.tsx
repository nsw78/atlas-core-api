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
    <main className="min-h-screen">
      <Header healthStatus={healthStatus} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ATLAS Strategic Intelligence Platform
          </h1>
          <p className="text-gray-600">
            Advanced Threat Analysis & Legal Strategic Intelligence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Risk Assessment</h2>
            <p className="text-gray-600 text-sm">
              Assess geopolitical, economic, and infrastructure risks
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Intelligence Analysis</h2>
            <p className="text-gray-600 text-sm">
              AI-powered analysis of open-source intelligence
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Scenario Simulation</h2>
            <p className="text-gray-600 text-sm">
              What-if analysis and policy impact modeling
            </p>
          </div>
        </div>

        <RiskAssessment />
      </div>
    </main>
  )
}
