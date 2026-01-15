'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import RiskDashboard from '@/components/RiskDashboard'
import { apiClient } from '@/lib/api/client'
import type { RiskProfile, RiskAssessment } from '@/lib/types'

export default function RisksPage() {
  const searchParams = useSearchParams()
  const entityId = searchParams.get('entity')
  
  const [riskProfiles, setRiskProfiles] = useState<RiskProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<RiskProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRiskProfiles = async () => {
      try {
        const data = await apiClient.getRiskProfiles()
        const profiles = Array.isArray(data) ? data : []
        setRiskProfiles(profiles)
        
        if (entityId) {
          const profile = profiles.find((p: RiskProfile) => p.entity_id === entityId)
          if (profile) setSelectedProfile(profile)
        } else if (profiles.length > 0) {
          setSelectedProfile(profiles[0])
        }
      } catch (error) {
        console.error('Failed to load risk profiles:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRiskProfiles()
  }, [entityId])

  return (
    <main className="min-h-screen bg-gray-50">
      <Header healthStatus="online" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-light text-gray-900 mb-2">Risk Intelligence Dashboard</h1>
          <p className="text-gray-600">
            Multi-domain risk visualization with time-based evolution and explainable risk factors
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-gray-500">Loading risk intelligence...</div>
          </div>
        ) : selectedProfile ? (
          <RiskDashboard profile={selectedProfile} />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">No risk profiles available</p>
            <p className="text-sm text-gray-400">
              Generate a risk assessment to create a risk profile
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
