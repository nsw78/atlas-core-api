'use client'

interface HeaderProps {
  healthStatus: string
}

export default function Header({ healthStatus }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-light text-gray-900 tracking-wide">ATLAS</h1>
            <div className="h-6 w-px bg-gray-300"></div>
            <span className="text-sm text-gray-500 font-light">Strategic Intelligence System</span>
          </div>
          
          <div className="flex items-center space-x-6">
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
