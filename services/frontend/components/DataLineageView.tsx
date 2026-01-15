'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api/client'
import type { DataLineage } from '@/lib/types'

export default function DataLineageView() {
  const [dataId, setDataId] = useState('')
  const [lineage, setLineage] = useState<DataLineage | null>(null)
  const [loading, setLoading] = useState(false)

  const handleQuery = async () => {
    if (!dataId) return
    setLoading(true)
    try {
      const data = await apiClient.getDataLineage(dataId)
      setLineage(data as DataLineage)
    } catch (error) {
      console.error('Failed to load lineage:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Data Lineage</h2>
      <div className="mb-4">
        <input
          type="text"
          value={dataId}
          onChange={(e) => setDataId(e.target.value)}
          placeholder="Enter data ID..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
        />
        <button
          onClick={handleQuery}
          disabled={loading || !dataId}
          className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          Query Lineage
        </button>
      </div>
      {lineage && (
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-gray-600 mb-1">Source</div>
            <div className="text-gray-900">{lineage.source}</div>
          </div>
          <div>
            <div className="text-gray-600 mb-1">Transformations</div>
            <div className="space-y-1">
              {lineage.transformations.map((t, i) => (
                <div key={i} className="text-xs text-gray-700">
                  {i + 1}. {t.operation} ({t.service}) - {new Date(t.timestamp).toLocaleString()}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-gray-600 mb-1">Compliance Status</div>
            <div className={`text-sm ${lineage.compliance_status === 'compliant' ? 'text-green-600' : 'text-yellow-600'}`}>
              {lineage.compliance_status}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
