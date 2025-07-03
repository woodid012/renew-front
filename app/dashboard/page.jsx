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
  Eye,
  Settings,
  Database,
  PieChart,
  TrendingDown,
  Calendar,
  Percent,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null)
  const [assetInputsData, setAssetInputsData] = useState(null)
  const [totalPortfolioDebt, setTotalPortfolioDebt] = useState(0)
  const [totalPortfolioEquity, setTotalPortfolioEquity] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedAsset, setExpandedAsset] = useState(null)

  useEffect(() => {
    fetchAllDashboardData()
  }, [])

  const fetchAllDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch both regular dashboard data and asset inputs
      const [dashboardResponse, assetInputsResponse] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/dashboard/asset-inputs').catch(err => {
          console.warn('Asset inputs API not available:', err)
          return { ok: false, status: 404 }
        })
      ])
      
      if (!dashboardResponse.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const dashboardData = await dashboardResponse.json()
      setDashboardData(dashboardData)
      
      // Handle asset inputs response - don't fail if this API isn't available
      if (assetInputsResponse.ok) {
        const assetInputsData = await assetInputsResponse.json()
        setAssetInputsData(assetInputsData)
      } else {
        console.warn('Asset inputs API returned:', assetInputsResponse.status)
        setAssetInputsData(null)
      }
      
      setLastUpdated(new Date())
      setError(null)
      
    } catch (err) {
      console.error('Dashboard data fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-AU')
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
            onClick={fetchAllDashboardData}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Portfolio Dashboard</h1>
            <p className="text-gray-600 mt-2">Complete portfolio management and asset configuration</p>
          </div>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchAllDashboardData}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Portfolio Overview</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'assets'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4" />
                <span>Asset Configuration</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'performance'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Performance Metrics</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total CAPEX */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total CAPEX</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {assetInputsData ? formatCurrencyShort(assetInputsData.summary.totalCapex) : 'Loading...'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-sm text-gray-500">
                  Debt: {assetInputsData ? formatCurrencyShort(assetInputsData.summary.totalDebt) : 'N/A'}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  Equity: {assetInputsData ? formatCurrencyShort(assetInputsData.summary.totalEquity) : 'N/A'}
                </span>
              </div>
            </div>

            {/* Portfolio IRR */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Portfolio IRR</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {assetInputsData ? formatPercentage(assetInputsData.summary.avgIRR) : 'Loading...'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-sm text-gray-500">
                  {assetInputsData?.metadata?.hasIRRData ? 'Average Equity IRR' : 'Not calculated'}
                </span>
              </div>
            </div>

            {/* Total Capacity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Capacity</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {assetInputsData ? formatCapacity(assetInputsData.summary.totalCapacity) : 'Loading...'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-sm text-gray-500">
                  Across {assetInputsData ? assetInputsData.summary.totalAssets : 'N/A'} assets
                </span>
              </div>
            </div>

            {/* Portfolio Gearing */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Portfolio Gearing</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {assetInputsData ? formatPercentage(assetInputsData.summary.portfolioGearing) : 'Loading...'}
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

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Asset Types */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Types</h3>
              {assetInputsData && assetInputsData.breakdown.byType && Object.keys(assetInputsData.breakdown.byType).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(assetInputsData.breakdown.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          type === 'solar' ? 'bg-yellow-500' :
                          type === 'wind' ? 'bg-blue-500' :
                          type === 'storage' ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                        <span className="text-sm font-medium text-gray-900 capitalize">{type}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{count} assets</div>
                        <div className="text-xs text-gray-500">
                          {assetInputsData.breakdown.capacityByType[type] ? 
                            `${formatCapacity(assetInputsData.breakdown.capacityByType[type])}` : 
                            ''
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No asset type data available</p>
                </div>
              )}
            </div>

            {/* Regional Distribution */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Distribution</h3>
              {assetInputsData && assetInputsData.breakdown.byRegion && Object.keys(assetInputsData.breakdown.byRegion).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(assetInputsData.breakdown.byRegion).map(([region, count]) => (
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
                </div>
              )}
            </div>

            {/* Financing Structure */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financing Structure</h3>
              {assetInputsData && assetInputsData.breakdown.byFinancing && Object.keys(assetInputsData.breakdown.byFinancing).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(assetInputsData.breakdown.byFinancing).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          category.includes('High') ? 'bg-red-500' :
                          category.includes('Medium') ? 'bg-yellow-500' :
                          category.includes('Low') ? 'bg-blue-500' : 'bg-green-500'
                        }`} />
                        <span className="text-sm font-medium text-gray-900">{category}</span>
                      </div>
                      <span className="text-sm text-gray-600">{count} assets</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No financing data available</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Asset Configuration Tab */}
      {activeTab === 'assets' && assetInputsData && assetInputsData.assets && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Asset Configuration</h3>
                  <p className="text-sm text-gray-600">Complete asset inputs and assumptions from MongoDB</p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Database className="w-4 h-4" />
                  <span>Source: {assetInputsData?.metadata?.source || 'Not available'}</span>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
              {assetInputsData?.assets?.map((asset) => (
                  <div key={asset.asset_id} className="border border-gray-200 rounded-lg">
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedAsset(expandedAsset === asset.asset_id ? null : asset.asset_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${
                            asset.type === 'solar' ? 'bg-yellow-500' :
                            asset.type === 'wind' ? 'bg-blue-500' :
                            asset.type === 'storage' ? 'bg-green-500' : 'bg-gray-500'
                          }`} />
                          <div>
                            <h4 className="font-semibold text-gray-900">{asset.asset_name}</h4>
                            <p className="text-sm text-gray-600">
                              {asset.type} • {asset.region} • {formatCapacity(asset.capacity)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">{formatCurrencyShort(asset.cost_capex)}</div>
                            <div className="text-xs text-gray-500">{formatPercentage(asset.debt_gearing)} gearing</div>
                          </div>
                          {expandedAsset === asset.asset_id ? 
                            <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          }
                        </div>
                      </div>
                    </div>
                    
                    {expandedAsset === asset.asset_id && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {/* Technical Specifications */}
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Technical Specifications</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Capacity Factor:</span>
                                <span>{formatPercentage(asset.capacity_factor / 100)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Annual Degradation:</span>
                                <span>{formatPercentage(asset.annual_degradation / 100)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Volume Loss Adj:</span>
                                <span>{formatPercentage(asset.volume_loss_adjustment / 100)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Asset Life:</span>
                                <span>{asset.asset_life} years</span>
                              </div>
                            </div>
                          </div>

                          {/* Financial Assumptions */}
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Financial Assumptions</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Total CAPEX:</span>
                                <span>{formatCurrencyShort(asset.cost_capex)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Max Gearing:</span>
                                <span>{formatPercentage(asset.cost_max_gearing)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Interest Rate:</span>
                                <span>{formatPercentage(asset.cost_interest_rate)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Tenor:</span>
                                <span>{asset.cost_tenor_years} years</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Terminal Value:</span>
                                <span>{formatCurrencyShort(asset.cost_terminal_value)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Operational Assumptions */}
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Operational Assumptions</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Operating Costs:</span>
                                <span>{formatCurrencyShort(asset.cost_operating_costs)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">OPEX Escalation:</span>
                                <span>{formatPercentage(asset.cost_operating_cost_escalation / 100)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Construction Start:</span>
                                <span>{formatDate(asset.construction_start_date)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Operations Start:</span>
                                <span>{formatDate(asset.operating_start_date)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Debt Sizing Results */}
                        {asset.debt_gearing > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <h5 className="font-medium text-gray-900 mb-3">Debt Sizing Results</h5>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                              <div className="bg-white p-3 rounded border">
                                <div className="text-gray-600">Total Debt</div>
                                <div className="font-semibold">{formatCurrencyShort(asset.debt_amount)}</div>
                              </div>
                              <div className="bg-white p-3 rounded border">
                                <div className="text-gray-600">Equity</div>
                                <div className="font-semibold">{formatCurrencyShort(asset.debt_equity_amount)}</div>
                              </div>
                              <div className="bg-white p-3 rounded border">
                                <div className="text-gray-600">Gearing</div>
                                <div className="font-semibold">{formatPercentage(asset.debt_gearing)}</div>
                              </div>
                              <div className="bg-white p-3 rounded border">
                                <div className="text-gray-600">Equity IRR</div>
                                <div className="font-semibold">
                                  {asset.equity_irr ? formatPercentage(asset.equity_irr) : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Contracts */}
                        {asset.contracts && asset.contracts.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <h5 className="font-medium text-gray-900 mb-3">Revenue Contracts ({asset.contracts.length})</h5>
                            <div className="text-sm text-gray-600">
                              Contract details available in asset configuration
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Average IRR</p>
                  <p className="text-xl font-bold text-gray-900">
                    {assetInputsData ? formatPercentage(assetInputsData.summary.avgIRR) : 'Loading...'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <Percent className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Average Gearing</p>
                  <p className="text-xl font-bold text-gray-900">
                    {assetInputsData ? formatPercentage(assetInputsData.summary.avgGearing) : 'Loading...'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <Calculator className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">CAPEX per MW</p>
                  <p className="text-xl font-bold text-gray-900">
                    {assetInputsData && assetInputsData.summary.totalCapacity > 0 ? 
                      formatCurrencyShort(assetInputsData.summary.totalCapex / assetInputsData.summary.totalCapacity) : 
                      'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <PieChart className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Debt/Equity Ratio</p>
                  <p className="text-xl font-bold text-gray-900">
                    {assetInputsData && assetInputsData.summary.totalEquity > 0 ? 
                      `${(assetInputsData.summary.totalDebt / assetInputsData.summary.totalEquity).toFixed(1)}:1` : 
                      'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg border ${
                assetInputsData?.metadata?.hasIRRData ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center space-x-2">
                  {assetInputsData?.metadata?.hasIRRData ? (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  ) : (
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  )}
                  <span className="font-medium">IRR Data</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {assetInputsData?.metadata?.hasIRRData ? 'Available' : 'Not calculated'}
                </p>
              </div>
              
              <div className={`p-4 rounded-lg border ${
                assetInputsData?.metadata?.hasDebtData ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center space-x-2">
                  {assetInputsData?.metadata?.hasDebtData ? (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  ) : (
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  )}
                  <span className="font-medium">Debt Sizing</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {assetInputsData?.metadata?.hasDebtData ? 'Complete' : 'Not configured'}
                </p>
              </div>
              
              <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Asset Count</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {assetInputsData?.metadata?.assetCount || 0} assets configured
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions - Always visible */}
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

        <button 
          onClick={fetchAllDashboardData}
          className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-purple-600" />
            <div className="flex-1 text-left">
              <h4 className="font-medium text-purple-900">Refresh Data</h4>
              <p className="text-sm text-purple-700">Update dashboard from MongoDB</p>
            </div>
            <RefreshCw className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      </div>
    </div>
  )
}