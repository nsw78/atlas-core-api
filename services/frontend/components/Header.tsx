'use client'

import Link from 'next/link'

interface HeaderProps {
  healthStatus: string
}

export default function Header({ healthStatus }: HeaderProps) {
  const navItems = [
    { label: 'Overview', href: '/' },
    { label: 'Entities', href: '/entities' },
    { label: 'Risks', href: '/risks' },
    { label: 'Alerts', href: '/alerts' },
    { label: 'Scenarios', href: '/scenarios' },
    { label: 'Ingestion', href: '/ingestion' },
    { label: 'Normalization', href: '/normalization' },
    { label: 'Geospatial', href: '/geospatial' },
    { label: 'Intelligence', href: '/intelligence' },
    { label: 'Compliance', href: '/compliance' },
  ]

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-light text-gray-900 tracking-wide">
              ATLAS
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <nav className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-gray-600 hover:text-gray-900 font-light"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                healthStatus === 'online' ? 'bg-green-500' : 
                healthStatus === 'offline' ? 'bg-red-500' : 
                'bg-yellow-500'
              }`}></div>
              <span className="text-xs text-gray-500 font-light tracking-wide uppercase">
                {healthStatus === 'online' ? 'Operational' : 
                 healthStatus === 'offline' ? 'Offline' : 
                 'Initializing'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
