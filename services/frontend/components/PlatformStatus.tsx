'use client'

import type { PlatformStatus as PlatformStatusType } from '@/lib/types'

interface PlatformStatusProps {
  status: PlatformStatusType
}

export default function PlatformStatusComponent({ status }: PlatformStatusProps) {
  const serviceStatus = (service: string) => {
    const state = status.services[service] || 'offline'
    return {
      label: state === 'operational' ? 'Operational' : state === 'degraded' ? 'Degraded' : 'Offline',
      color: state === 'operational' ? 'bg-green-500' : state === 'degraded' ? 'bg-yellow-500' : 'bg-red-500',
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Platform Status</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {Object.entries(status.services).map(([service, state]) => {
          const statusInfo = serviceStatus(service)
          return (
            <div key={service} className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${statusInfo.color}`}></div>
              <div>
                <div className="text-sm font-medium text-gray-900 capitalize">
                  {service.replace(/_/g, ' ')}
                </div>
                <div className="text-xs text-gray-500">{statusInfo.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600">Compliance Status</div>
          <div className="flex items-center space-x-4 mt-1">
            <span className="text-xs text-gray-500">
              GDPR: <span className={status.compliance.gdpr === 'compliant' ? 'text-green-600' : 'text-red-600'}>
                {status.compliance.gdpr}
              </span>
            </span>
            <span className="text-xs text-gray-500">
              LGPD: <span className={status.compliance.lgpd === 'compliant' ? 'text-green-600' : 'text-red-600'}>
                {status.compliance.lgpd}
              </span>
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          {new Date(status.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  )
}
