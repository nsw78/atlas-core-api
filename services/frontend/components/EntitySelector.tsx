'use client'

import { useState } from 'react'
import type { StrategicEntity } from '@/lib/types'

interface EntitySelectorProps {
  entities: StrategicEntity[]
  selectedEntity: StrategicEntity | null
  onSelectEntity: (entity: StrategicEntity) => void
  loading: boolean
}

export default function EntitySelector({
  entities,
  selectedEntity,
  onSelectEntity,
  loading,
}: EntitySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  const filteredEntities = entities.filter((entity) => {
    const matchesSearch = entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entity.aliases?.some(alias => alias.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = filterType === 'all' || entity.type === filterType
    return matchesSearch && matchesType
  })

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-sm text-gray-500">Loading entities...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search entities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
      </div>

      <div className="mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="all">All Types</option>
          <option value="country">Countries</option>
          <option value="region">Regions</option>
          <option value="organization">Organizations</option>
          <option value="supply_chain">Supply Chains</option>
          <option value="infrastructure">Infrastructure</option>
        </select>
      </div>

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {filteredEntities.length === 0 ? (
          <div className="text-sm text-gray-500 py-4 text-center">
            No entities found
          </div>
        ) : (
          filteredEntities.map((entity) => (
            <button
              key={entity.id}
              onClick={() => onSelectEntity(entity)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                selectedEntity?.id === entity.id
                  ? 'bg-gray-100 border border-gray-300'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <div className="font-medium text-gray-900">{entity.name}</div>
              <div className="text-xs text-gray-500 capitalize">{entity.type.replace('_', ' ')}</div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
