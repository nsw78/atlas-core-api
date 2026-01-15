'use client'

import Header from '@/components/Header'
import GeospatialMap from '@/components/GeospatialMap'

export default function GeospatialPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header healthStatus="online" />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-light text-gray-900 mb-2">Geospatial Intelligence</h1>
          <p className="text-gray-600">Interactive map-driven exploration of supply chains and infrastructure</p>
        </div>
        <GeospatialMap />
      </div>
    </main>
  )
}
