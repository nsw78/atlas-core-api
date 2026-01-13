'use client'

interface HeaderProps {
  healthStatus: string
}

export default function Header({ healthStatus }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-primary-600">ATLAS</h1>
            <span className="text-sm text-gray-500">Strategic Intelligence Platform</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                healthStatus === 'online' ? 'bg-green-500' : 
                healthStatus === 'offline' ? 'bg-red-500' : 
                'bg-yellow-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                API {healthStatus === 'online' ? 'Online' : 
                     healthStatus === 'offline' ? 'Offline' : 
                     'Checking...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
