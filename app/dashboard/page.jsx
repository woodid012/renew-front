// app/dashboard/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Building2, 
  TrendingUp, 
  Calculator,
  DollarSign,
  BarChart3,
  Zap,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye
} from 'lucide-react'

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard')
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const data = await response.json()
      setDashboardData(data)
      setLastUpdated(new Date())
      setError(null)
      
    } catch (err) {
      console.error('Dashboard data fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <span className="text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'N/A'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value * 1000000) // Convert from millions to actual dollars
  }

  const formatCurrencyShort = (value) => {
    if (!value && value !== 0) return 'N/A'
    return `$${value.toFixed(1)}M`
  }

  const formatPercentage = (value) => {
    if (!value && value !== 0) return 'N/A'
    return `${(value * 100).toFixed(1)}%`
  }

  const formatCapacity = (value) => {
    if (!value && value !== 0) return 'N/A'
    return `${value.toFixed(0)} MW`
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Portfolio Dashboard</h1>
            <p className="text-gray-600 mt-2">Overview of your renewable energy portfolio performance</p>
          </div>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchDashboardData}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total CAPEX */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total CAPEX</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData ? formatCurrencyShort(dashboardData.totalCapex) : 'Loading...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              Debt: {dashboardData ? formatCurrencyShort(dashboardData.totalDebt) : 'N/A'}
            </span>
            <span className="text-sm text-gray-500 ml-2">
              Equity: {dashboardData ? formatCurrencyShort(dashboardData.totalEquity) : 'N/A'}
            </span>
          </div>
        </div>

        {/* Portfolio IRR */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Portfolio IRR</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData ? formatPercentage(dashboardData.irr) : 'Loading...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              {dashboardData?.dataSource?.hasIRR ? 'Equity IRR' : 'Not calculated'}
            </span>
          </div>
        </div>

        {/* Total Capacity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Capacity</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData ? formatCapacity(dashboardData.totalCapacity) : 'Loading...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              Across {dashboardData ? dashboardData.totalAssets : 'N/A'} assets
            </span>
          </div>
        </div>

        {/* Gearing */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Portfolio Gearing</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData ? formatPercentage(dashboardData.gearing) : 'Loading...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              Debt to Total CAPEX
            </span>
          </div>
        </div>
      </div>

      {/* Asset Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Asset Types */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Types</h3>
          {dashboardData && dashboardData.byType && Object.keys(dashboardData.byType).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(dashboardData.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      type === 'solar' ? 'bg-yellow-500' :
                      type === 'wind' ? 'bg-blue-500' :
                      type === 'storage' ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-900 capitalize">{type}</span>
                  </div>
                  <span className="text-sm text-gray-600">{count} assets</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">No asset type data available</p>
              <p className="text-sm text-gray-400 mt-1">Asset data may be in cash flows only</p>
            </div>
          )}
        </div>

        {/* Regional Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Distribution</h3>
          {dashboardData && dashboardData.byRegion && Object.keys(dashboardData.byRegion).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(dashboardData.byRegion).map(([region, count]) => (
                <div key={region} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-gray-900">{region}</span>
                  </div>
                  <span className="text-sm text-gray-600">{count} assets</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">No regional data available</p>
              <p className="text-sm text-gray-400 mt-1">Asset data may be in cash flows only</p>
            </div>
          )}
        </div>
      </div>

      {/* Financial Performance Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Performance Summary</h3>
        {dashboardData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(dashboardData.totalAnnualRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Cumulative across all periods</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Total OPEX</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(dashboardData.totalAnnualOpex)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Cumulative operating expenses</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Equity Cash Flow</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(dashboardData.totalAnnualCashFlow)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total equity cash flows</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Average per Asset</p>
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(dashboardData.avgRevenuePerAsset)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Revenue per asset</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Loading portfolio summary...</p>
        )}
      </div>

      {/* Data Source Information */}
      {dashboardData?.dataSource && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-8">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Data Sources</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Cash Flows:</span> {dashboardData.dataSource.cashFlows}
            </div>
            <div>
              <span className="font-medium">Asset Inputs:</span> {dashboardData.dataSource.inputs}
            </div>
            <div>
              <span className="font-medium">Status:</span> 
              <span className={`ml-1 ${dashboardData.dataSource.hasIRR ? 'text-green-600' : 'text-orange-600'}`}>
                {dashboardData.dataSource.hasIRR ? 'IRR Available' : 'IRR Not Calculated'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <a 
          href="/assets" 
          className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <Building2 className="w-6 h-6 text-green-600" />
            <div className="flex-1">
              <h4 className="font-medium text-green-900">Manage Assets</h4>
              <p className="text-sm text-green-700">View and configure asset definitions</p>
            </div>
            <Eye className="w-4 h-4 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </a>

        <a 
          href="/results" 
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">View Results</h4>
              <p className="text-sm text-blue-700">Analyze detailed cash flow results</p>
            </div>
            <Eye className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </a>

        <a 
          href="/price-curves" 
          className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            <div className="flex-1">
              <h4 className="font-medium text-purple-900">Price Curves</h4>
              <p className="text-sm text-purple-700">Manage price forecasts and assumptions</p>
            </div>
            <Eye className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </a>
      </div>
    </div>
  )
}