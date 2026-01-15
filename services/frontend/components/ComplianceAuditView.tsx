'use client'

import type { ComplianceAudit } from '@/lib/types'

interface ComplianceAuditViewProps {
  audits: ComplianceAudit[]
}

export default function ComplianceAuditView({ audits }: ComplianceAuditViewProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Audit Trail</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {audits.length === 0 ? (
          <div className="text-sm text-gray-500 py-4">No audit records available</div>
        ) : (
          audits.slice(0, 20).map((audit) => (
            <div key={audit.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
              <div className="text-sm font-medium text-gray-900 mb-1 capitalize">
                {audit.audit_type.replace('_', ' ')}
              </div>
              <div className="text-xs text-gray-600 mb-1">{audit.action}</div>
              <div className="text-xs text-gray-500">
                {new Date(audit.timestamp).toLocaleString()} • User: {audit.user_id}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
