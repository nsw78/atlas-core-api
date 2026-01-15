'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { apiClient } from '@/lib/api/client'

interface RiskAlert {
  id: string
  entity_id: string
  dimension: string
  threshold: number
  condition: string
  active: boolean
  triggered: boolean
  last_trigger?: string
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  useEffect(() => {
    loadAlerts()
  }, [showActiveOnly])

  const loadAlerts = async () => {
    try {
      const data = await apiClient.getRiskAlerts(showActiveOnly)
      setAlerts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return
    
    try {
      await apiClient.deleteRiskAlert(id)
      loadAlerts()
    } catch (error) {
      console.error('Failed to delete alert:', error)
      alert('Failed to delete alert')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header healthStatus="online" />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">Risk Alerts</h1>
            <p className="text-gray-600">Monitor and manage risk threshold alerts</p>
          </div>
          <button className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800">
            Configure Alert
          </button>
        </div>

        <div className="mb-4 flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">Show active only</span>
          </label>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {loading ? (
            <div className="text-sm text-gray-500 py-8 text-center">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center">
              No alerts configured. Create an alert to monitor risk thresholds.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dimension</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Threshold</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Trigger</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {alerts.map((alert) => (
                    <tr key={alert.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{alert.entity_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{alert.dimension}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{alert.condition}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{(alert.threshold * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            alert.active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {alert.active ? 'Active' : 'Inactive'}
                          </span>
                          {alert.triggered && (
                            <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                              Triggered
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {alert.last_trigger 
                          ? new Date(alert.last_trigger).toLocaleString() 
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(alert.id)}
                          className="text-sm text-red-600 hover:text-red-900"
                        >
                          Delete
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
