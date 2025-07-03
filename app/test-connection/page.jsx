// app/test-connection/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Loader2, Server, Database, CheckCircle, AlertCircle } from 'lucide-react'

export default function TestConnectionPage() {
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConnectionStatus = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/test-connection')
        const data = await response.json()
        setConnectionStatus(data)
      } catch (err) {
        setConnectionStatus({ status: 'Error', error: err.message })
      } finally {
        setLoading(false)
      }
    }

    fetchConnectionStatus()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Database Connection Test</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {loading ? (
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            <span className="text-lg text-gray-600">Running connection test...</span>
          </div>
        ) : connectionStatus && connectionStatus.status === 'Connected' ? (
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <h2 className="text-2xl font-semibold text-gray-900">Successfully Connected</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <Database className="w-5 h-5 text-gray-500 mr-3" />
                <span className="font-medium text-gray-800">Database:</span>
                <span className="ml-2 text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{connectionStatus.db}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <Server className="w-5 h-5 text-gray-500 mr-3" />
                  Available Collections ({connectionStatus.collections.length})
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {connectionStatus.collections.map(col => (
                    <li key={col} className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-sm text-gray-700">
                      {col}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <h2 className="text-2xl font-semibold text-gray-900">Connection Failed</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center">
                <Database className="w-5 h-5 text-gray-500 mr-3" />
                <span className="font-medium text-gray-800">Database:</span>
                <span className="ml-2 text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{connectionStatus?.db || 'Unknown'}</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800 font-medium">Error Details:</p>
                <p className="text-red-700 mt-1 text-sm">{connectionStatus?.error || 'An unknown error occurred.'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
