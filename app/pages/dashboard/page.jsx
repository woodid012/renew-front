// app/pages/dashboard/page.jsx

// WIP NOTES:
// - check table duplicates on capex (base sens)

'use client'

import { useState, useEffect } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart, registerables } from 'chart.js'
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
  ChevronUp,
  Users,
  Activity
} from 'lucide-react'

Chart.register(...registerables)

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null)
  const [assetInputsData, setAssetInputsData] = useState(null)
  const [portfolioData, setPortfolioData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [expandedAsset, setExpandedAsset] = useState(null)

  useEffect(() => {
    fetchAllDashboardData()
  }, [])

  const fetchAllDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch asset output summary data and portfolio revenue/net income data
      const [assetOutputResponse, revenueResponse, netIncomeResponse] = await Promise.all([
        fetch('/api/dashboard/asset-output-summary'),
        fetch('/api/all-assets-summary?period=yearly&field=revenue').catch(err => {
          console.warn('Revenue data API not available:', err)
          return { ok: false, status: 404 }
        }),
        fetch('/api/all-assets-summary?period=yearly&field=net_income').catch(err => {
          console.warn('Net income data API not available:', err)
          return { ok: false, status: 404 }
        })
      ])
      
      if (!assetOutputResponse.ok) {
        throw new Error('Failed to fetch asset output summary data')
      }
      
      const assetOutputData = await assetOutputResponse.json()
      setAssetInputsData(assetOutputData)

      // Handle portfolio data responses
      let portfolioChartData = { revenue: null, netIncome: null }
      
      if (revenueResponse.ok) {
        const revenueData = await revenueResponse.json()
        portfolioChartData.revenue = revenueData.data
      }
      
      if (netIncomeResponse.ok) {
        const netIncomeData = await netIncomeResponse.json()
        portfolioChartData.netIncome = netIncomeData.data
      }
      
      setPortfolioData(portfolioChartData)
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

  // Generate portfolio chart data
  const generateChartData = (data, assetInputsData, fieldName) => {
    if (!data || !assetInputsData) return null

    const assetNames = {}
    assetInputsData.assets.forEach(asset => {
      assetNames[asset.asset_id] = asset.asset_name
    })

    const periods = Object.keys(data).sort()
    const assetIds = assetInputsData.assets.map(asset => asset.asset_id)
    
    const colors = [
      '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ]

    const datasets = assetIds.map((assetId, index) => ({
      label: assetNames[assetId] || `Asset ${assetId}`,
      data: periods.map(period => (data[period][assetId] || 0)), // Values already in millions
      backgroundColor: colors[index % colors.length],
      borderColor: colors[index % colors.length],
      borderWidth: 0,
    }))

    return {
      labels: periods,
      datasets: datasets
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 15,
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed.y
            const assetName = context.dataset.label
            return `${assetName}: $${value.toFixed(1)}M`
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'Year',
          font: { size: 12, weight: 'bold' }
        }
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Amount ($M)',
          font: { size: 12, weight: 'bold' }
        },
        ticks: {
          callback: function(value) {
            return `$${value.toFixed(0)}M`
          }
        }
      }
    }
  }

  const revenueChartData = generateChartData(portfolioData?.revenue, assetInputsData, 'revenue')
  const netIncomeChartData = generateChartData(portfolioData?.netIncome, assetInputsData, 'net_income')

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
            <p className="text-gray-600 mt-2">Complete portfolio management and performance overview</p>
          </div>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
        </div>

        {/* Total Debt */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Debt</p>
              <p className="text-2xl font-bold text-gray-900">
                {assetInputsData ? formatCurrencyShort(assetInputsData.summary.totalDebt) : 'Loading...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Total Equity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Equity</p>
              <p className="text-2xl font-bold text-gray-900">
                {assetInputsData ? formatCurrencyShort(assetInputsData.summary.totalEquity) : 'Loading...'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
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
        </div>
      </div>

      {/* Portfolio Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Portfolio Revenue</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <BarChart3 className="w-4 h-4" />
              <span>Stacked by Asset</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '300px' }}>
            {revenueChartData ? (
              <Bar data={revenueChartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No revenue data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Net Income Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Portfolio Net Income</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span>Stacked by Asset</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '300px' }}>
            {netIncomeChartData ? (
              <Bar data={netIncomeChartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No net income data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Bottom Section: Asset Table and Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Details Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Asset Portfolio Summary</h3>
            <p className="text-sm text-gray-600">Key financial metrics from ASSET_Output_Summary</p>
          </div>
          
          <div className="overflow-x-auto">
            {assetInputsData && assetInputsData.assets ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Name</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CAPEX ($M)</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debt ($M)</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equity ($M)</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gearing (%)</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IRR (%)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assetInputsData.assets.map((asset) => (
                    <tr key={asset.asset_id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full mr-2 bg-green-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{asset.asset_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {asset.total_capex ? asset.total_capex.toFixed(1) : 'N/A'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                        {asset.total_debt ? asset.total_debt.toFixed(1) : 'N/A'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                        {asset.total_equity ? asset.total_equity.toFixed(1) : 'N/A'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                        {asset.gearing ? (asset.gearing * 100).toFixed(1) : 'N/A'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {asset.equity_irr ? (asset.equity_irr * 100).toFixed(1) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No asset data available</p>
              </div>
            )}
          </div>
          
          {assetInputsData && assetInputsData.assets && assetInputsData.assets.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
              Showing all {assetInputsData.assets.length} assets
            </div>
          )}
        </div>

        {/* Placeholder Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Placeholder</h3>
              <p className="text-gray-600 max-w-sm">
                This space is reserved for additional portfolio insights and analytics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}