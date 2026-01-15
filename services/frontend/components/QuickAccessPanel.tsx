'use client'

import Link from 'next/link'

export default function QuickAccessPanel() {
  const quickActions = [
    {
      label: 'Data Ingestion',
      description: 'Manage data sources',
      href: '/ingestion',
      icon: '📥',
    },
    {
      label: 'Assess Risk',
      description: 'Generate risk profile',
      href: '/risks',
      icon: '📊',
    },
    {
      label: 'Risk Alerts',
      description: 'Monitor alerts',
      href: '/alerts',
      icon: '⚠️',
    },
    {
      label: 'Normalization',
      description: 'Data quality & rules',
      href: '/normalization',
      icon: '🔧',
    },
    {
      label: 'Entities',
      description: 'Strategic entities',
      href: '/entities',
      icon: '🏢',
    },
    {
      label: 'Compliance',
      description: 'Audit & governance',
      href: '/compliance',
      icon: '🔒',
    },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Access</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickActions.map((action, index) => (
          <Link
            key={index}
            href={action.href}
            className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors group"
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <div className="text-sm font-medium text-gray-900 mb-1 group-hover:text-gray-700">
              {action.label}
            </div>
            <div className="text-xs text-gray-500">{action.description}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
