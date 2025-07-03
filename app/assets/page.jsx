// app/results/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Building2,
  Download,
  Filter,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function ResultsPage() {
  const [cashFlowData, setCashFlowData] = useState([])
  const [assetList, setAssetList] = useState([])
  const [scenarioList, setScenarioList] = useState([])
  const [selectedAssets, setSelectedAssets] = useState([])
  const [selectedScenario, setSelectedScenario] = useState('base_case')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartType, setChartType] = useState('line')
  const [dateRange, setDateRange] = useState('all')
  const [showAssetSelector, setShowAssetSelector] = useState(false)
  const [showScenarioSelector, setShowScenarioSelector] = useState(false)
  const [summaryStats, setSummaryStats] = useState({})

  useEffect(() => {
    fetchResultsData()
  }, [])

  useEffect(() => {
    if (selectedAssets.length > 0) {
      fetchCashFlowData()
    }
  }, [selectedAssets, selectedScenario, dateRange])

  const fetchResultsData = async () => {
    try {
      setLoading(true)
      
      const [assetsResponse, scenariosResponse] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/scenarios')
      ])

      if (!assetsResponse.ok || !scenariosResponse.ok) {
        throw new Error('Failed to fetch results data')
      }

      const assetsData = await assetsResponse.json()
      const scenariosData = await scenariosResponse.json()

      setAssetList(assetsData.assets || [])
      setScenarioList(scenariosData.scenarios || [])
      
      // Auto-select first few assets
      const initialSelection = assetsData.assets.slice(0, 3).map(a => a.asset_id)
      setSelectedAssets(initialSelection)
      
      // Set default scenario to base case
      const baseScenario = scenariosData.scenarios.find(s => s.type === 'base') || scenariosData.scenarios[0]
      if (baseScenario) {
        setSelectedScenario(baseScenario.scenarioId)
      }
      
    } catch (err) {
      console.error('Results data fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCashFlowData = async () => {
    if (selectedAssets.length === 0) return

    try {
      // Build query parameters
      const params = new URLSearchParams({
        assets: selectedAssets.join(','),
        limit: '2000'
      })

      if (selectedScenario && selectedScenario !== 'base_case') {
        params.append('scenarioId', selectedScenario)
      }

      if (dateRange !== 'all') {
        const now = new Date()
        let startDate = new Date()
        
        switch (dateRange) {
          case '12months':
            startDate.setFullYear(now.getFullYear() - 1)
            break
          case '6months':
            startDate.setMonth(now.getMonth() - 6)
            break
          case '3months':
            startDate.setMonth(now.getMonth() - 3)
            break
        }
        
        params.append('startDate', startDate.toISOString())
        params.append('endDate', now.toISOString())
      }

      const response = await fetch(`/api/results/cashflows?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch cash flow data')
      }

      const data = await response.json()
      setCashFlowData(data.data || [])
      setSummaryStats(data.summary || {})
      
    } catch (err) {
      console.error('Cash flow fetch error:', err)
      setError(err.message)
    }
  }

  const getChartData = () => {
    if (!cashFlowData.length) return []

    // Group by date and sum across selected assets
    const groupedData = cashFlowData.reduce((acc, item) => {
      const dateKey = new Date(item.date).toISOString().slice(0, 7) // YYYY-MM format
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          revenue: 0,
          contractedRevenue: 0,
          merchantRevenue: 0,
          opex: 0,
          capex: 0,
          equity_cash_flow: 0,
          cfads: 0
        }
      }

      acc[dateKey].revenue += item.revenue || 0
      acc[dateKey].contractedRevenue += (item.contractedGreenRevenue || 0) + (item.contractedEnergyRevenue || 0)
      acc[dateKey].merchantRevenue += (item.merchantGreenRevenue || 0) + (item.merchantEnergyRevenue || 0)
      acc[dateKey].opex += item.opex || 0
      acc[dateKey].capex += item.capex || 0
      acc[dateKey].equity_cash_flow += item.equity_cash_flow || 0
      acc[dateKey].cfads += item.cfads || 0

      return acc
    }, {})

    // Convert to array and sort by date
    return Object.values(groupedData)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({
        ...item,
        date: new Date(item.date + '-01').toLocaleDateString('en-AU', { 
          year: 'numeric', 
          month: 'short' 
        })
      }))
  }

  const toggleAssetSelection = (assetId) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    )
  }

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '$0'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value * 1000000) // Convert from millions to actual dollars
  }

  const formatCurrencyShort = (value) => {
    if (!value && value !== 0) return '$0M'
    return `$${value.toFixed(1)}M`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <span className="text-gray-600">Loading results...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Results</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchResultsData}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const chartData = getChartData()

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Portfolio Results</h1>
        <p className="text-gray-600 mt-2">Analyze monthly cash flow performance by asset and scenario</p>
      </div>

      {/* Summary Stats */}
      {summaryStats.totalRevenue !== undefined && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(summaryStats.totalRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total OPEX</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(summaryStats.totalOpex)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Equity Cash Flow</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(summaryStats.totalEquityCashFlow)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <Calendar className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Assets/Records</p>
                <p className="text-xl font-bold text-gray-900">
                  {summaryStats.uniqueAssetCount || 0} / {summaryStats.totalRecords || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Scenario Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scenario</label>
            <div className="relative">
              <button
                onClick={() => setShowScenarioSelector(!showScenarioSelector)}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-left focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <span className="text-sm truncate">
                  {scenarioList.find(s => s.scenarioId === selectedScenario)?.name || 'Select scenario...'}
                </span>
                {showScenarioSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showScenarioSelector && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {scenarioList.map(scenario => (
                    <button
                      key={scenario.scenarioId}
                      onClick={() => {
                        setSelectedScenario(scenario.scenarioId)
                        setShowScenarioSelector(false)
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                        selectedScenario === scenario.scenarioId ? 'bg-green-50 text-green-900' : ''
                      }`}
                    >
                      <div className="text-sm font-medium">{scenario.name}</div>
                      <div className="text-xs text-gray-500">{scenario.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Asset Selector */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Selected Assets</label>
            <div className="relative">
              <button
                onClick={() => setShowAssetSelector(!showAssetSelector)}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-left focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <span className="text-sm">
                  {selectedAssets.length === 0 ? 'Select assets...' : `${selectedAssets.length} assets selected`}
                </span>
                {showAssetSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showAssetSelector && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 border-b border-gray-200">
                    <button
                      onClick={() => setSelectedAssets(assetList.map(a => a.asset_id))}
                      className="w-full text-left px-2 py-1 text-sm text-green-600 hover:bg-green-50 rounded"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedAssets([])}
                      className="w-full text-left px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      Clear All
                    </button>
                  </div>
                  <div>
                    {assetList.map(asset => (
                      <label key={asset.asset_id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAssets.includes(asset.asset_id)}
                          onChange={() => toggleAssetSelection(asset.asset_id)}
                          className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {asset.name || `Asset ${asset.asset_id}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {asset.type} • {asset.region}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chart Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Time</option>
              <option value="12months">Last 12 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="3months">Last 3 Months</option>
            </select>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={fetchCashFlowData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Cash Flow Analysis</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {chartData.length} periods • {selectedAssets.length} assets
            </span>
            <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatCurrencyShort}
                  />
                  <Tooltip 
                    formatter={(value, name) => [formatCurrencyShort(value), name]}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Total Revenue"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="contractedRevenue" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    name="Contracted Revenue"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="merchantRevenue" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Merchant Revenue"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="opex" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="OPEX"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="equity_cash_flow" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Equity Cash Flow"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatCurrencyShort}
                  />
                  <Tooltip 
                    formatter={(value, name) => [formatCurrencyShort(value), name]}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Total Revenue" />
                  <Bar dataKey="opex" fill="#ef4444" name="OPEX" />
                  <Bar dataKey="equity_cash_flow" fill="#3b82f6" name="Equity Cash Flow" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
            <p className="text-gray-600">Select assets and scenario to view cash flow analysis</p>
          </div>
        )}
      </div>

      {/* Asset Performance Table */}
      {selectedAssets.length > 0 && cashFlowData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Asset Performance Summary</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contracted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total OPEX</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equity Cash Flow</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedAssets.map(assetId => {
                  const asset = assetList.find(a => a.asset_id === assetId)
                  const assetData = cashFlowData.filter(d => d.asset_id === assetId)
                  
                  const totals = assetData.reduce((acc, item) => ({
                    revenue: acc.revenue + (item.revenue || 0),
                    contracted: acc.contracted + (item.contractedGreenRevenue || 0) + (item.contractedEnergyRevenue || 0),
                    merchant: acc.merchant + (item.merchantGreenRevenue || 0) + (item.merchantEnergyRevenue || 0),
                    opex: acc.opex + (item.opex || 0),
                    equity_cash_flow: acc.equity_cash_flow + (item.equity_cash_flow || 0)
                  }), { revenue: 0, contracted: 0, merchant: 0, opex: 0, equity_cash_flow: 0 })

                  return (
                    <tr key={assetId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {asset?.name || `Asset ${assetId}`}
                            </div>
                            <div className="text-sm text-gray-500">ID: {assetId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(totals.revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(totals.contracted)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(totals.merchant)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(totals.opex)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(totals.equity_cash_flow)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}