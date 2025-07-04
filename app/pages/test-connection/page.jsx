// app/pages/test-connection/page.jsx
"use client"

import React, { useEffect, useState } from 'react'
import {
  Database, CheckCircle, AlertCircle, Loader2, RefreshCw
} from 'lucide-react'

export default function TestConnectionPage() {
  const [connectionData, setConnectionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchConnectionData()
  }, [])

  const fetchConnectionData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/test-connection')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setConnectionData(result)
      console.log("MongoDB Connection Data:", result)
    } catch (e) {
      console.error("Error fetching connection data:", e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
        <p>Testing MongoDB connection...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-4" />
        <p>Error: {error}</p>
        <button
          onClick={fetchConnectionData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <RefreshCw className="inline-block w-4 h-4 mr-2" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">MongoDB Connection Test</h1>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex items-center mb-4">
          {connectionData?.status === 'Connected' ? (
            <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
          )}
          <h2 className="text-xl font-semibold">Connection Status: {connectionData?.status}</h2>
        </div>
        {connectionData?.status === 'Connected' ? (
          <p className="text-gray-700">Successfully connected to database: <span className="font-medium">{connectionData?.db}</span></p>
        ) : (
          <p className="text-red-600">Error: {connectionData?.error}</p>
        )}
      </div>

      {connectionData?.status === 'Connected' && connectionData?.collections && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Collections and Sample Data</h2>
          <div className="space-y-6">
            {connectionData.collections.map(collectionName => (
              <div key={collectionName} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2 flex items-center">
                  <Database className="w-5 h-5 text-gray-600 mr-2" />
                  {collectionName}
                </h3>
                <div className="bg-gray-50 p-3 rounded-md text-sm font-mono overflow-x-auto">
                  <pre>{JSON.stringify(connectionData.sampleData[collectionName], null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}