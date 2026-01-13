'use client'

interface CapabilityCardProps {
  title: string
  description: string
  icon?: string
}

export default function CapabilityCard({ title, description, icon }: CapabilityCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 hover:border-gray-300 transition-colors">
      <h2 className="text-xl font-medium text-gray-900 mb-3">{title}</h2>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  )
}
