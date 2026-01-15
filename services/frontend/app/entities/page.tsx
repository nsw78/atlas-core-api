'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import EntitySelector from '@/components/EntitySelector'
import EntityIntelligenceView from '@/components/EntityIntelligenceView'
import { apiClient } from '@/lib/api/client'
import type { StrategicEntity } from '@/lib/types'

export default function EntitiesPage() {
  const [entities, setEntities] = useState<StrategicEntity[]>([])
  const [selectedEntity, setSelectedEntity] = useState<StrategicEntity | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEntities = async () => {
      try {
        const data = await apiClient.getEntities()
        setEntities(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to load entities:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEntities()
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <Header healthStatus="online" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-light text-gray-900 mb-2">Strategic Entity Workspace</h1>
          <p className="text-gray-600">
            Comprehensive intelligence view for countries, regions, organizations, and supply chains
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Entity List */}
          <div className="lg:col-span-1">
            <EntitySelector
              entities={entities}
              selectedEntity={selectedEntity}
              onSelectEntity={setSelectedEntity}
              loading={loading}
            />
          </div>

          {/* Entity Intelligence View */}
          <div className="lg:col-span-3">
            {selectedEntity ? (
              <EntityIntelligenceView entity={selectedEntity} />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-500 mb-4">Select an entity to view intelligence</p>
                <p className="text-sm text-gray-400">
                  Choose from the list or search for a strategic entity of interest
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
