'use client'

import type { PlatformKPI } from '@/lib/types'

interface StrategicKPIsProps {
  kpis: PlatformKPI
}

export default function StrategicKPIs({ kpis }: StrategicKPIsProps) {
  const kpiItems = [
    {
      label: 'Active Strategic Entities',
      value: kpis.active_entities,
      description: 'Entities under active monitoring',
    },
    {
      label: 'Risk Assessments Today',
      value: kpis.risk_assessments_today,
      description: 'Assessments generated in last 24 hours',
    },
    {
      label: 'OSINT Signals Today',
      value: kpis.osint_signals_today,
      description: 'Intelligence signals processed',
    },
    {
      label: 'Active Scenarios',
      value: kpis.active_scenarios,
      description: 'Simulations in progress',
    },
    {
      label: 'High-Risk Alerts',
      value: kpis.high_risk_alerts,
      description: 'Alerts requiring attention',
      highlight: kpis.high_risk_alerts > 0,
    },
    {
      label: 'Data Sources Active',
      value: kpis.data_sources_active,
      description: 'OSINT sources operational',
    },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Platform Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiItems.map((item, index) => (
          <div key={index} className={`p-4 rounded ${item.highlight ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
            <div className={`text-2xl font-light mb-1 ${item.highlight ? 'text-red-600' : 'text-gray-900'}`}>
              {item.value.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-gray-700 mb-1">{item.label}</div>
            <div className="text-xs text-gray-500">{item.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
