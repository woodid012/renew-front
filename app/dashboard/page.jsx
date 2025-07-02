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
  Loader2
} from 'lucide-react'

export default function DashboardPage() {
  const [summaryData, setSummaryData] = useState(null)
  const [portfolioMetrics, setPortfolioMetrics] = useState(null)
  const [assetCount, setAssetCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch summary data from MongoDB
      const [summaryResponse, portfolioResponse, assetResponse] = await Promise.all([
        fetch('/api/dashboard/summary'),
        fetch('/api/dashboard/portfolio-metrics'),
        fetch('/api/dashboard/asset-count')
      ])

      if (!summaryResponse.ok || !portfolioResponse.ok || !assetResponse.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const summaryData = await summaryResponse.json()
      const portfolioData = await portfolioResponse.json()
      const assetData = await assetResponse.json()

      setSummaryData(summaryData)
      setPortfolioMetrics(portfolioData)
      setAssetCount(assetData)
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
        <h1 className="text-3xl font-bold text-gray-900">Portfolio Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your renewable energy portfolio performance</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total CAPEX */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total CAPEX</p>
              <p className="text-2xl font-bold text-gray-900">
                {portfolioMetrics ? formatCurrency(portfolioMetrics.totalCapex) : 'Loading...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              Debt: {portfolioMetrics ? formatCurrency(portfolioMetrics.totalDebt) : 'N/A'}
            </span>
          </div>
        </div>

        {/* Portfolio IRR */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Portfolio IRR</p>
              <p className="text-2xl font-bold text-gray-900">
                {portfolioMetrics ? formatPercentage(portfolioMetrics.irr) : 'Loading...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              Equity IRR
            </span>
          </div>
        </div>

        {/* Total Capacity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Capacity</p>
              <p className="text-2xl font-bold text-gray-900">
                {portfolioMetrics ? formatCapacity(portfolioMetrics.totalCapacity) : 'Loading...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              Across {assetCount ? assetCount.totalAssets : 'N/A'} assets
            </span>
          </div>
        </div>

        {/* Gearing */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Portfolio Gearing</p>
              <p className="text-2xl font-bold text-gray-900">
                {portfolioMetrics ? formatPercentage(portfolioMetrics.gearing) : 'Loading...'}
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
          {assetCount && assetCount.byType ? (
            <div className="space-y-3">
              {Object.entries(assetCount.byType).map(([type, count]) => (
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
            <p className="text-gray-500">No asset data available</p>
          )}
        </div>

        {/* Regional Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Distribution</h3>
          {assetCount && assetCount.byRegion ? (
            <div className="space-y-3">
              {Object.entries(assetCount.byRegion).map(([region, count]) => (
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
            <p className="text-gray-500">No regional data available</p>
          )}
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Summary</h3>
        {summaryData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Total Revenue (Annual)</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(summaryData.totalAnnualRevenue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Total OPEX (Annual)</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(summaryData.totalAnnualOpex)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Net Cash Flow (Annual)</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(summaryData.totalAnnualCashFlow)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Loading portfolio summary...</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <a 
          href="/assets" 
          className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Building2 className="w-6 h-6 text-green-600" />
            <div>
              <h4 className="font-medium text-green-900">Manage Assets</h4>
              <p className="text-sm text-green-700">View and configure asset definitions</p>
            </div>
          </div>
        </a>

        <a 
          href="/results" 
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <div>
              <h4 className="font-medium text-blue-900">View Results</h4>
              <p className="text-sm text-blue-700">Analyze detailed cash flow results</p>
            </div>
          </div>
        </a>

        <a 
          href="/price-curves" 
          className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            <div>
              <h4 className="font-medium text-purple-900">Price Curves</h4>
              <p className="text-sm text-purple-700">Manage price forecasts and assumptions</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  )
}