'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { apiClient } from '@/lib/api/client'

interface NormalizationRule {
  id: string
  name: string
  field: string
  type: string
  active: boolean
}

export default function NormalizationPage() {
  const [rules, setRules] = useState<NormalizationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rulesResponse, statsData] = await Promise.all([
          apiClient.getNormalizationRules(),
          apiClient.getNormalizationStats()
        ])
        
        // Handle different response formats
        let rulesData: NormalizationRule[] = []
        if (Array.isArray(rulesResponse)) {
          rulesData = rulesResponse
        } else if (rulesResponse && typeof rulesResponse === 'object' && 'rules' in rulesResponse) {
          rulesData = Array.isArray((rulesResponse as any).rules) 
            ? (rulesResponse as any).rules 
            : []
        }
        
        setRules(rulesData)
        setStats(statsData)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <Header healthStatus="online" />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-light text-gray-900 mb-2">Data Normalization</h1>
          <p className="text-gray-600">Manage normalization rules and monitor data quality</p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Total Processed</div>
              <div className="text-2xl font-light text-gray-900">{stats.total_processed?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Last 24h</div>
              <div className="text-2xl font-light text-gray-900">{stats.last_24_hours?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Avg Quality</div>
              <div className="text-2xl font-light text-gray-900">
                {stats.average_quality ? (stats.average_quality * 100).toFixed(1) + '%' : 'N/A'}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-1">Active Rules</div>
              <div className="text-2xl font-light text-green-600">{stats.active_rules || 0}</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Normalization Rules</h2>
            <button className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800">
              Add Rule
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500 py-8 text-center">Loading rules...</div>
          ) : rules.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center">
              No normalization rules configured.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{rule.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{rule.field}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{rule.type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          rule.active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {rule.active ? 'Active' : 'Inactive'}
                        </span>
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
