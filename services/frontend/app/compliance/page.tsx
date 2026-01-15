'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import ComplianceAuditView from '@/components/ComplianceAuditView'
import DataLineageView from '@/components/DataLineageView'
import { apiClient } from '@/lib/api/client'
import type { ComplianceAudit, DataLineage } from '@/lib/types'

export default function CompliancePage() {
  const [audits, setAudits] = useState<ComplianceAudit[]>([])
  const [complianceStatus, setComplianceStatus] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [auditData, status] = await Promise.all([
          apiClient.getComplianceAudit(),
          apiClient.getComplianceStatus(),
        ])
        setAudits(Array.isArray(auditData) ? auditData : [])
        setComplianceStatus(status)
      } catch (error) {
        console.error('Failed to load compliance data:', error)
      }
    }
    loadData()
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <Header healthStatus="online" />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-light text-gray-900 mb-2">Compliance & Governance</h1>
          <p className="text-gray-600">Audit trails, data provenance, and policy enforcement</p>
        </div>
        {complianceStatus && (
          <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Compliance Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">GDPR</div>
                <div className={`text-lg font-medium ${complianceStatus.gdpr === 'compliant' ? 'text-green-600' : 'text-red-600'}`}>
                  {complianceStatus.gdpr}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">LGPD</div>
                <div className={`text-lg font-medium ${complianceStatus.lgpd === 'compliant' ? 'text-green-600' : 'text-red-600'}`}>
                  {complianceStatus.lgpd}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ComplianceAuditView audits={audits} />
          <DataLineageView />
        </div>
      </div>
    </main>
  )
}
