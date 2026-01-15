'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { apiClient } from '@/lib/api/client'

interface DataSource {
  id: string
  name: string
  type: string
  status: string
  last_sync?: string
}

export default function IngestionPage() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sourcesResponse, statusData] = await Promise.all([
          apiClient.getIngestionSources(),
          apiClient.getIngestionStatus()
        ])
        
        // Handle different response formats
        let sourcesData: DataSource[] = []
        if (Array.isArray(sourcesResponse)) {
          sourcesData = sourcesResponse
        } else if (sourcesResponse && typeof sourcesResponse === 'object' && 'sources' in sourcesResponse) {
          sourcesData = Array.isArray((sourcesResponse as any).sources) 
            ? (sourcesResponse as any).sources 
            : []
        }
        
        setSources(sourcesData)
        setStatus(statusData)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleTrigger = async (sourceId: string) => {
    try {
      await apiClient.triggerIngestion(sourceId)
      alert('Ingestion triggered successfully')
      // Reload data
      const sourcesResponse = await apiClient.getIngestionSources()
      let sourcesData: DataSource[] = []
      if (Array.isArray(sourcesResponse)) {
        sourcesData = sourcesResponse
      } else if (sourcesResponse && typeof sourcesResponse === 'object' && 'sources' in sourcesResponse) {
        sourcesData = Array.isArray((sourcesResponse as any).sources) 
          ? (sourcesResponse as any).sources 
          : []
      }
      setSources(sourcesData)
    } catch (error) {
      console.error('Failed to trigger ingestion:', error)
      alert('Failed to trigger ingestion')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header healthStatus="online" />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-light text-gray-900 mb-2">Data Ingestion</h1>
          <p className="text-gray-600">Manage data sources and monitor ingestion status</p>
        </div>

        {status && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Total Sources</div>
              <div className="text-2xl font-light text-gray-900">{status.total_sources || 0}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Active Sources</div>
              <div className="text-2xl font-light text-green-600">{status.active_sources || 0}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Total Ingested</div>
              <div className="text-2xl font-light text-gray-900">{status.total_ingested?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Last 24h</div>
              <div className="text-2xl font-light text-gray-900">{status.last_24_hours?.toLocaleString() || 0}</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Data Sources</h2>
            <button className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800">
              Add Source
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500 py-8 text-center">Loading sources...</div>
          ) : sources.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center">
              No data sources configured. Add a source to begin ingestion.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Sync</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sources.map((source) => (
                    <tr key={source.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{source.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{source.type.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          source.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {source.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {source.last_sync 
                          ? new Date(source.last_sync).toLocaleString() 
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleTrigger(source.id)}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          Trigger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
