// app/pages/dashboard/page.jsx

// WIP NOTES:
// - check table duplicates on capex (base sens)

'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { usePortfolio } from '../../context/PortfolioContext'
import { useDisplaySettings } from '../../context/DisplaySettingsContext'
import { formatCurrencyFromMillions } from '../../utils/currencyFormatter'

Chart.register(...registerables)

export default function DashboardPage() {
  const { selectedPortfolio, portfolios } = usePortfolio()
  const { currencyUnit } = useDisplaySettings()
  const [dashboardData, setDashboardData] = useState(null)
  const [assetInputsData, setAssetInputsData] = useState(null)
  const [portfolioData, setPortfolioData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [expandedAsset, setExpandedAsset] = useState(null)
  const [hasInitialFetch, setHasInitialFetch] = useState(false)
  const [sensitivityData, setSensitivityData] = useState([])

  // Initial fetch - read directly from localStorage to avoid race condition with context initialization
  useEffect(() => {
    // Read from localStorage directly (synchronous, available immediately)
    // This runs only once on mount, before context has initialized
    const initialPortfolio = typeof window !== 'undefined'
      ? localStorage.getItem('selectedPortfolio')
      : null

    if (initialPortfolio) {
      console.log('Dashboard - Initial fetch for portfolio (from localStorage):', initialPortfolio)
      fetchAllDashboardData(initialPortfolio)
    } else {
      console.log('Dashboard - No portfolio selected, skipping initial fetch')
      setLoading(false)
    }
    setHasInitialFetch(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only run once on mount

  // Listen for portfolio changes from context or events
  useEffect(() => {
    // Skip if this is the initial mount (handled by the first useEffect)
    if (!hasInitialFetch) return

    // Only fetch if a portfolio is selected
    if (selectedPortfolio) {
      console.log('Dashboard - Portfolio changed (from context):', selectedPortfolio)
      fetchAllDashboardData(selectedPortfolio)
    } else {
      console.log('Dashboard - No portfolio selected, clearing data')
      setAssetInputsData(null)
      setPortfolioData(null)
      setSensitivityData([])
      setError(null)
      setLoading(false)
    }
  }, [selectedPortfolio, hasInitialFetch])

  // Listen for portfolio change events
  useEffect(() => {
    const handlePortfolioChange = (event) => {
      // Use the portfolio from the event detail (most reliable) or context
      const portfolio = event?.detail?.portfolio || selectedPortfolio
      if (portfolio) {
        console.log('Dashboard - Portfolio changed event received:', portfolio)
        fetchAllDashboardData(portfolio)
      } else {
        console.log('Dashboard - No portfolio in event, clearing data')
        setAssetInputsData(null)
        setPortfolioData(null)
        setSensitivityData([])
        setError(null)
        setLoading(false)
      }
    }

    window.addEventListener('portfolioChanged', handlePortfolioChange)
    return () => window.removeEventListener('portfolioChanged', handlePortfolioChange)
  }, [selectedPortfolio])

  const fetchAllDashboardData = async (portfolioOverride) => {
    try {
      setLoading(true)

      // Use the portfolio from the parameter or context
      // Ensure portfolioOverride is a string (it might be an event object if called from a button)
      // Both portfolioOverride and selectedPortfolio should be unique_ids
      let portfolioToUse = (typeof portfolioOverride === 'string' ? portfolioOverride : null)
        || selectedPortfolio

      if (!portfolioToUse) {
        console.warn('Dashboard - No portfolio provided, cannot fetch data');
        setError('No portfolio selected');
        setLoading(false);
        return;
      }

      console.log('Dashboard - Fetching data for portfolio:', portfolioToUse)

      // portfolioToUse is already the unique_id (from context or parameter)
      const uniqueId = portfolioToUse;
      console.log('Dashboard - Using unique_id:', uniqueId)

      // Fetch asset output summary data, portfolio revenue/net income data, and sensitivity data
      const [assetOutputResponse, revenueResponse, netIncomeResponse, sensitivityResponse] = await Promise.all([
        fetch(`/api/dashboard/asset-output-summary?unique_id=${encodeURIComponent(uniqueId)}`),
        fetch(`/api/all-assets-summary?period=yearly&field=revenue&unique_id=${encodeURIComponent(uniqueId)}`).catch(err => {
          console.warn('Revenue data API not available:', err)
          return { ok: false, status: 404 }
        }),
        fetch(`/api/all-assets-summary?period=yearly&field=net_income&unique_id=${encodeURIComponent(uniqueId)}`).catch(err => {
          console.warn('Net income data API not available:', err)
          return { ok: false, status: 404 }
        }),
        fetch(`/api/get-sensitivity-output?unique_id=${encodeURIComponent(uniqueId)}`).catch(err => {
          console.warn('Sensitivity data API not available:', err)
          return { ok: false, status: 404 }
        })
      ])

      if (!assetOutputResponse.ok) {
        throw new Error('Failed to fetch asset output summary data')
      }

      const assetOutputData = await assetOutputResponse.json()
      console.log('Dashboard - Asset output data:', {
        assetCount: assetOutputData.assets?.length || 0,
        assetIds: assetOutputData.assets?.map(a => a.asset_id) || [],
        assetNames: assetOutputData.assets?.map(a => a.asset_name) || []
      })
      setAssetInputsData(assetOutputData)

      // Handle portfolio data responses
      let portfolioChartData = { revenue: null, netIncome: null }

      if (revenueResponse.ok) {
        const revenueData = await revenueResponse.json()
        portfolioChartData.revenue = revenueData.data
        console.log('Dashboard - Revenue data:', {
          hasData: !!revenueData.data,
          periods: revenueData.data ? Object.keys(revenueData.data) : [],
          assetIdsInData: revenueData.data ? Object.values(revenueData.data).flatMap(p => Object.keys(p)) : []
        })
      } else {
        console.warn('Dashboard - Revenue response not OK:', revenueResponse.status)
      }

      if (netIncomeResponse.ok) {
        const netIncomeData = await netIncomeResponse.json()
        portfolioChartData.netIncome = netIncomeData.data
        console.log('Dashboard - Net income data:', {
          hasData: !!netIncomeData.data,
          periods: netIncomeData.data ? Object.keys(netIncomeData.data) : [],
          assetIdsInData: netIncomeData.data ? Object.values(netIncomeData.data).flatMap(p => Object.keys(p)) : []
        })
      } else {
        console.warn('Dashboard - Net income response not OK:', netIncomeResponse.status)
      }

      setPortfolioData(portfolioChartData)

      // Handle sensitivity data response
      if (sensitivityResponse.ok) {
        const sensitivityResult = await sensitivityResponse.json()
        setSensitivityData(sensitivityResult.data || [])
        console.log('Dashboard - Sensitivity data:', {
          hasData: !!sensitivityResult.data,
          rowCount: sensitivityResult.data?.length || 0
        })
      } else {
        console.warn('Dashboard - Sensitivity response not OK:', sensitivityResponse.status)
        setSensitivityData([])
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

  const formatCurrencyShort = (value) => {
    if (!value && value !== 0) return 'N/A'
    return formatCurrencyFromMillions(value, currencyUnit)
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

  // Format number to 2 significant figures
  const formatToTwoSigFigs = (value) => {
    if (value === 0) return '0'
    // Use toPrecision to get 2 significant figures, then remove trailing zeros after decimal
    const formatted = parseFloat(value.toPrecision(2)).toString()
    return formatted.replace(/\.0+$/, '')
  }

  // Generate portfolio chart data
  const generateChartData = (data, assetInputsData, fieldName) => {
    if (!data || !assetInputsData) {
      console.log(`Dashboard - generateChartData: Missing data for ${fieldName}`, {
        hasData: !!data,
        hasAssetInputsData: !!assetInputsData
      })
      return null
    }

    // Build asset name map from assetInputsData
    const assetNames = {}
    assetInputsData.assets.forEach(asset => {
      assetNames[asset.asset_id] = asset.asset_name
    })

    const periods = Object.keys(data).sort()

    // Get unique asset IDs that actually appear in the data (not just from summary)
    const assetIdsInData = new Set()
    periods.forEach(period => {
      Object.keys(data[period] || {}).forEach(assetId => {
        assetIdsInData.add(parseInt(assetId))
      })
    })
    const assetIds = Array.from(assetIdsInData).sort()

    console.log(`Dashboard - generateChartData for ${fieldName}:`, {
      periods: periods.length,
      assetIds: assetIds,
      assetNames: assetIds.map(id => assetNames[id] || `Asset ${id}`),
      dataKeys: periods.map(p => ({ period: p, assetIds: Object.keys(data[p] || {}) }))
    })

    const colors = [
      '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ]

    const datasets = assetIds.map((assetId, index) => {
      const values = periods.map(period => {
        const value = data[period]?.[assetId] || 0
        return value
      })
      console.log(`Dashboard - Dataset for asset ${assetId} (${assetNames[assetId] || 'Unknown'}):`, {
        values: values,
        hasNonZero: values.some(v => v !== 0)
      })
      return {
        label: assetNames[assetId] || `Asset ${assetId}`,
        data: values,
        backgroundColor: colors[index % colors.length],
        borderColor: colors[index % colors.length],
        borderWidth: 0,
      }
    })

    return {
      labels: periods,
      datasets: datasets
    }
  }

  const chartOptions = useMemo(() => ({
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
          label: function (context) {
            const value = context.parsed.y
            const assetName = context.dataset.label
            // Value is in millions, format using display settings
            return `${assetName}: ${formatCurrencyFromMillions(value, currencyUnit)}`
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
          text: `Amount (${currencyUnit})`,
          font: { size: 12, weight: 'bold' }
        },
        ticks: {
          callback: function (value) {
            // Value is in millions, format using display settings
            return formatCurrencyFromMillions(value, currencyUnit)
          }
        }
      }
    }
  }), [currencyUnit])

  const revenueChartData = generateChartData(portfolioData?.revenue, assetInputsData, 'revenue')
  const netIncomeChartData = generateChartData(portfolioData?.netIncome, assetInputsData, 'net_income')

  // Process tornado chart data for Platform (Portfolio level)
  const processPlatformTornadoData = () => {
    if (!sensitivityData.length) return { labels: [], datasets: [], processedData: [] }

    const parameterGroups = {}
    
    sensitivityData.forEach(item => {
      const paramName = item.parameter_name || item.parameter || 'Unknown Parameter'
      
      if (!parameterGroups[paramName]) {
        parameterGroups[paramName] = {
          scenarios: [],
          parameter: paramName,
          parameter_units: item.parameter_units || ''
        }
      }
      
      // Use portfolio-level IRR difference for Platform
      const metricDiff = item.portfolio_irr_diff_bps || 0
      
      parameterGroups[paramName].scenarios.push({
        scenario_id: item.scenario_id,
        parameter_value: item.input_value,
        parameter_units: item.parameter_units || '',
        metric_diff: metricDiff / 100, // Convert bps to percentage points for IRR
        raw_value: item.portfolio_irr_pct
      })
    })

    const processedData = Object.entries(parameterGroups).map(([param, group]) => {
      const impacts = group.scenarios.map(s => s.metric_diff)
      
      const maxImpact = Math.max(...impacts)
      const minImpact = Math.min(...impacts)
      const totalRange = Math.abs(maxImpact) + Math.abs(minImpact)
      
      const maxIndex = impacts.indexOf(maxImpact)
      const minIndex = impacts.indexOf(minImpact)
      const maxScenario = group.scenarios[maxIndex]
      const minScenario = group.scenarios[minIndex]
      
      return {
        parameter: param,
        upside: Math.max(maxImpact, 0),
        downside: Math.min(minImpact, 0),
        totalRange: totalRange,
        scenarios: group.scenarios,
        impacts: impacts,
        units: group.parameter_units,
        maxScenario: maxScenario,
        minScenario: minScenario,
        maxInputValue: maxScenario?.parameter_value,
        minInputValue: minScenario?.parameter_value
      }
    })

    const filteredData = processedData
      .filter(item => item.totalRange > 0)
      .sort((a, b) => b.totalRange - a.totalRange)

    const labels = filteredData.map(item => {
      const maxVal = item.maxInputValue
      const minVal = item.minInputValue
      const units = item.units || ''
      
      if (maxVal !== undefined && minVal !== undefined) {
        return `${item.parameter}\n(${minVal}${units} to ${maxVal}${units})`
      }
      return item.parameter
    })

    const upsideData = filteredData.map(item => item.upside)
    const downsideData = filteredData.map(item => item.downside)

    return {
      labels,
      datasets: [
        {
          label: 'Upside Impact (%)',
          data: upsideData,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
        },
        {
          label: 'Downside Impact (%)',
          data: downsideData,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
        }
      ],
      processedData: filteredData
    }
  }

  const platformTornadoData = processPlatformTornadoData()

  const tornadoChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Platform Sensitivity Analysis - Equity IRR',
        font: {
          size: 14,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            const fullLabel = context[0].label
            return fullLabel.split('\n')[0]
          },
          afterTitle: function(context) {
            const dataIndex = context[0].dataIndex
            const item = platformTornadoData.processedData[dataIndex]
            if (item && item.maxInputValue !== undefined && item.minInputValue !== undefined) {
              const units = item.units || ''
              return `Range: ${item.minInputValue}${units} to ${item.maxInputValue}${units}`
            }
            return ''
          },
          label: function(context) {
            const value = Math.abs(context.parsed.x)
            const dataIndex = context.dataIndex
            const item = platformTornadoData.processedData[dataIndex]
            
            if (!item) return `${context.dataset.label}: ${value.toFixed(2)}%`
            
            const isUpside = context.dataset.label.includes('Upside')
            const inputValue = isUpside ? item.maxInputValue : item.minInputValue
            const units = item.units || ''
            
            const impactText = `${value.toFixed(2)}%`
            
            return `${context.dataset.label}: ${impactText} (at ${inputValue}${units})`
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'Impact on Equity IRR (%)',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          callback: function(value) {
            return Math.abs(value).toFixed(1) + '%'
          }
        }
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Sensitivity Parameters',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      }
    },
  }

  // Show message if no portfolio is selected
  if (!selectedPortfolio && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Portfolio Selected</h2>
          <p className="text-gray-600 mb-4">Please select a portfolio from the dropdown above to view the dashboard.</p>
        </div>
      </div>
    )
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
          {selectedPortfolio && (
            <button
              onClick={() => fetchAllDashboardData(selectedPortfolio)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Retry
            </button>
          )}
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
                {assetInputsData?.summary ? formatCurrencyShort(assetInputsData.summary.totalCapex) : 'Loading...'}
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
                {assetInputsData?.summary ? formatCurrencyShort(assetInputsData.summary.totalDebt) : 'Loading...'}
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
                {assetInputsData?.summary ? formatCurrencyShort(assetInputsData.summary.totalEquity) : 'Loading...'}
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
                {assetInputsData?.summary ? formatPercentage(assetInputsData.summary.portfolioGearing) : 'Loading...'}
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
                {assetInputsData?.summary ? formatPercentage(assetInputsData.summary.avgIRR) : 'Loading...'}
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
              revenueChartData.datasets.some(ds => ds.data.some(v => v !== 0)) ? (
                <Bar key={currencyUnit} data={revenueChartData} options={chartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium mb-2">No revenue data available</p>
                    <p className="text-sm text-gray-500">
                      {assetInputsData && assetInputsData.assets && assetInputsData.assets.length > 0
                        ? 'Run the model to generate revenue data for your assets'
                        : 'No assets found in this portfolio'}
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-2">No revenue data available</p>
                  <p className="text-sm text-gray-500">
                    {assetInputsData && assetInputsData.assets && assetInputsData.assets.length > 0
                      ? 'Run the model to generate revenue data for your assets'
                      : 'No assets found in this portfolio'}
                  </p>
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
              netIncomeChartData.datasets.some(ds => ds.data.some(v => v !== 0)) ? (
                <Bar key={currencyUnit} data={netIncomeChartData} options={chartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium mb-2">No net income data available</p>
                    <p className="text-sm text-gray-500">
                      {assetInputsData && assetInputsData.assets && assetInputsData.assets.length > 0
                        ? 'Run the model to generate net income data for your assets'
                        : 'No assets found in this portfolio'}
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-2">No net income data available</p>
                  <p className="text-sm text-gray-500">
                    {assetInputsData && assetInputsData.assets && assetInputsData.assets.length > 0
                      ? 'Run the model to generate net income data for your assets'
                      : 'No assets found in this portfolio'}
                  </p>
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
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CAPEX ({currencyUnit})</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debt ({currencyUnit})</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equity ({currencyUnit})</th>
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
                        {asset.total_capex ? formatCurrencyFromMillions(asset.total_capex, currencyUnit) : 'N/A'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                        {asset.total_debt ? formatCurrencyFromMillions(asset.total_debt, currencyUnit) : 'N/A'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                        {asset.total_equity ? formatCurrencyFromMillions(asset.total_equity, currencyUnit) : 'N/A'}
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

        {/* Platform Sensitivity Tornado Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Platform Sensitivity Analysis</h3>
              <p className="text-sm text-gray-600 mt-1">Tornado chart showing parameter sensitivity for Portfolio IRR</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Activity className="w-4 h-4" />
              <span>Equity IRR</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '400px' }}>
            {platformTornadoData.labels && platformTornadoData.labels.length > 0 ? (
              <Bar data={platformTornadoData} options={tornadoChartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Sensitivity Data Available</h3>
                  <p className="text-gray-600 text-sm">
                    {loading 
                      ? 'Loading sensitivity data...'
                      : 'Run sensitivity analysis to view Platform sensitivity tornado chart'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}