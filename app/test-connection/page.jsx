// app/test-connection/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Loader2, Server, Database, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function TestConnectionPage() {
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [assetTest, setAssetTest] = useState(null)
  const [dashboardTest, setDashboardTest] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    runAllTests()
  }, [])

  const runAllTests = async () => {
    setLoading(true)
    
    // Test 1: Basic connection
    await testConnection()
    
    // Test 2: Assets API
    await testAssetsAPI()
    
    // Test 3: Dashboard API
    await testDashboardAPI()
    
    setLoading(false)
  }

  const testConnection = async () => {
    try {
      const response = await fetch('/api/test-connection')
      const data = await response.json()
      setConnectionStatus(data)
    } catch (err) {
      setConnectionStatus({ status: 'Error', error: err.message })
    }
  }

  const testAssetsAPI = async () => {
    try {
      const response = await fetch('/api/assets')
      const data = await response.json()
      setAssetTest({
        status: 'Success',
        count: data.count || 0,
        source: data.source,
        assets: data.assets?.slice(0, 3) || [] // Show first 3 assets
      })
    } catch (err) {
      setAssetTest({ status: 'Error', error: err.message })
    }
  }

  const testDashboardAPI = async () => {
    try {
      const response = await fetch('/api/dashboard')
      const data = await response.json()
      setDashboardTest({
        status: 'Success',
        data: {
          totalAssets: data.totalAssets,
          totalCapex: data.totalCapex,
          totalRevenue: data.totalAnnualRevenue,
          dataSource: data.dataSource
        }
      })
    } catch (err) {
      setDashboardTest({ status: 'Error', error: err.message })
    }
  }

  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'N/A'
    return `$${value.toFixed(1)}M`
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Connection Test</h1>
            <p className="text-gray-600 mt-2">Test database connections and API endpoints</p>
          </div>
          <button
            onClick={runAllTests}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Run Tests</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Database Connection Test */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Connection</h2>
          
          {loading && !connectionStatus ? (
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              <span className="text-lg text-gray-600">Testing connection...</span>
            </div>
          ) : connectionStatus && connectionStatus.status === 'Connected' ? (
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-900">Successfully Connected</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Database className="w-5 h-5 text-gray-500 mr-3" />
                  <span className="font-medium text-gray-800">Database:</span>
                  <span className="ml-2 text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{connectionStatus.db}</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <Server className="w-5 h-5 text-gray-500 mr-3" />
                    Available Collections ({connectionStatus.collections.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {connectionStatus.collections.map(col => (
                      <div key={col} className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-sm text-gray-700">
                        {col}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <AlertCircle className="w-8 h-8 text-red-600" />
                <h3 className="text-xl font-semibold text-gray-900">Connection Failed</h3>
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

        {/* Assets API Test */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Assets API Test</h2>
          
          {loading && !assetTest ? (
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              <span className="text-lg text-gray-600">Testing assets API...</span>
            </div>
          ) : assetTest && assetTest.status === 'Success' ? (
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="text-lg font-semibold text-gray-900">Assets API Working</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <span className="font-medium text-gray-800">Total Assets:</span>
                  <span className="text-gray-600">{assetTest.count}</span>
                  <span className="font-medium text-gray-800">Source:</span>
                  <span className="text-gray-600 bg-blue-100 px-2 py-1 rounded-md text-sm">{assetTest.source}</span>
                </div>
                {assetTest.assets.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Sample Assets:</h4>
                    <div className="space-y-2">
                      {assetTest.assets.map(asset => (
                        <div key={asset.asset_id} className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                          <span className="font-medium">{asset.name || asset.asset_name}</span>
                          <span className="text-gray-500 ml-2">({asset.type} • {asset.region})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <span className="text-lg font-semibold text-gray-900">Assets API Failed</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800 font-medium">Error Details:</p>
                <p className="text-red-700 mt-1 text-sm">{assetTest?.error || 'Failed to fetch assets'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard API Test */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Dashboard API Test</h2>
          
          {loading && !dashboardTest ? (
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              <span className="text-lg text-gray-600">Testing dashboard API...</span>
            </div>
          ) : dashboardTest && dashboardTest.status === 'Success' ? (
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="text-lg font-semibold text-gray-900">Dashboard API Working</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3">
                  <div className="text-sm text-blue-600 font-medium">Total Assets</div>
                  <div className="text-xl font-bold text-blue-900">{dashboardTest.data.totalAssets}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3">
                  <div className="text-sm text-green-600 font-medium">Total CAPEX</div>
                  <div className="text-xl font-bold text-green-900">{formatCurrency(dashboardTest.data.totalCapex)}</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-md px-4 py-3">
                  <div className="text-sm text-purple-600 font-medium">Total Revenue</div>
                  <div className="text-xl font-bold text-purple-900">{formatCurrency(dashboardTest.data.totalRevenue)}</div>
                </div>
              </div>
              {dashboardTest.data.dataSource && (
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-3">
                  <div className="text-sm font-medium text-gray-800 mb-1">Data Sources:</div>
                  <div className="text-sm text-gray-600">
                    Cash Flows: {dashboardTest.data.dataSource.cashFlows} • 
                    Inputs: {dashboardTest.data.dataSource.inputs}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <span className="text-lg font-semibold text-gray-900">Dashboard API Failed</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800 font-medium">Error Details:</p>
                <p className="text-red-700 mt-1 text-sm">{dashboardTest?.error || 'Failed to fetch dashboard data'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-3 rounded-md ${
            connectionStatus?.status === 'Connected' ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              {connectionStatus?.status === 'Connected' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">Database Connection</span>
            </div>
          </div>
          
          <div className={`p-3 rounded-md ${
            assetTest?.status === 'Success' ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              {assetTest?.status === 'Success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">Assets API</span>
            </div>
          </div>
          
          <div className={`p-3 rounded-md ${
            dashboardTest?.status === 'Success' ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              {dashboardTest?.status === 'Success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">Dashboard API</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
