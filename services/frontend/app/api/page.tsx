'use client'

export default function APIPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-light text-gray-900 mb-6">
            API-First Strategic Intelligence Infrastructure
          </h1>
          
          <p className="text-lg text-gray-700 mb-8 leading-relaxed">
            An API-first strategic intelligence infrastructure, designed to integrate directly 
            into enterprise systems, decision workflows, and executive dashboards.
          </p>

          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">Design Principles</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="mr-3 text-gray-400">•</span>
                <span><strong className="text-gray-900">Sector-agnostic design</strong> — Applicable across industries and use cases</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-gray-400">•</span>
                <span><strong className="text-gray-900">Policy-compliant by default</strong> — GDPR, LGPD, and international law alignment</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-gray-400">•</span>
                <span><strong className="text-gray-900">Built for institutional use</strong> — Long-term strategic infrastructure, not tactical tools</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">Documentation</h2>
            <p className="text-gray-600 mb-4">
              Complete API documentation available at:
            </p>
            <code className="block bg-gray-50 p-4 rounded border border-gray-200 text-sm text-gray-800">
              /api/v1/docs
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
