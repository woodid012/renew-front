// app/pages/price-curves/page.jsx
'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import {
  Filter,
  BarChart3,
  TrendingUp,
  Calendar,
  MapPin,
  Zap,
  RefreshCw,
  AlertCircle,
  Loader2,
  Info,
  Download,
  Maximize2,
  X,
  Search,
  Save,
  CheckCircle
} from 'lucide-react'
import { useDisplaySettings } from '../../context/DisplaySettingsContext'
import { formatCurrency } from '../../utils/currencyFormatter'

// Constants
const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'fiscal_yearly', label: 'Fiscal Year' }
]

export default function PriceCurves2Page() {
  const { currencyUnit } = useDisplaySettings()
  const [priceCurves, setPriceCurves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRegions, setSelectedRegions] = useState(['ALL'])
  const [selectedProfile, setSelectedProfile] = useState('baseload')
  const [selectedTypes, setSelectedTypes] = useState(['ENERGY'])
  const [availableRegions, setAvailableRegions] = useState([])
  const [availableProfiles, setAvailableProfiles] = useState([])
  const [availableTypes, setAvailableTypes] = useState([])
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const [selectedPeriod, setSelectedPeriod] = useState('yearly')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showZeroLine, setShowZeroLine] = useState(false)
  const [modelSettings, setModelSettings] = useState(null)
  const [merchantEscalationRate, setMerchantEscalationRate] = useState(0.025)
  const [merchantRefDate, setMerchantRefDate] = useState('2025-01-01')
  const [savingSettings, setSavingSettings] = useState(false)
  const [saveStatus, setSaveStatus] = useState({ type: null, message: '' })

  // Format period label helper function
  const formatPeriodLabel = useCallback((timeKey, period) => {
    if (!timeKey) return timeKey || '';

    if (period === 'monthly') {
      const [year, month] = timeKey.split('-')
      if (!year || !month) return timeKey;
      return new Date(year, parseInt(month) - 1, 1).toLocaleDateString('en-AU', { year: 'numeric', month: 'short' })
    } else if (period === 'quarterly') {
      const [year, quarter] = timeKey.split('-Q')
      if (!year || !quarter) return timeKey;
      return `${year} Q${quarter}`
    } else if (period === 'yearly') {
      return timeKey
    } else if (period === 'fiscal_yearly') {
      return timeKey
    } else {
      try {
        return new Date(timeKey).toLocaleDateString('en-AU', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      } catch (e) {
        return timeKey;
      }
    }
  }, [])

  // Fetch model settings on mount
  useEffect(() => {
    fetchModelSettings()
  }, [])

  // Fetch price curves when period changes
  useEffect(() => {
    fetchPriceCurves()
  }, [selectedPeriod])

  // Process chart data when filters change
  const chartData = useMemo(() => {
    if (!priceCurves.length) return []

    const timeGroups = {}

    priceCurves.forEach(item => {
      let timeKey, displayDate

      if (selectedPeriod === 'monthly') {
        timeKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`
        displayDate = new Date(item._id.year, item._id.month - 1, 1)
      } else if (selectedPeriod === 'quarterly') {
        timeKey = `${item._id.year}-Q${item._id.quarter}`
        displayDate = new Date(item._id.year, (item._id.quarter - 1) * 3, 1)
      } else if (selectedPeriod === 'yearly') {
        timeKey = `${item._id.year}`
        displayDate = new Date(item._id.year, 0, 1)
      } else if (selectedPeriod === 'fiscal_yearly') {
        timeKey = `FY${item._id.fiscalYear}`
        displayDate = new Date(item._id.fiscalYear, 6, 1)
      } else {
        timeKey = item.TIME
        displayDate = new Date(item.TIME)
      }

      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = { TIME: timeKey, date: displayDate }
      }

      const regionMatch = selectedRegions.includes('ALL') || selectedRegions.includes(item._id.REGION)
      if (!regionMatch) return

      if (selectedProfile === 'storage') {
        if (item._id.TYPE && item._id.TYPE.startsWith('SPREAD_') && selectedTypes.includes(item._id.TYPE)) {
          const seriesKey = selectedRegions.includes('ALL') ?
            `${item._id.REGION}_${item._id.TYPE}` :
            item._id.TYPE
          timeGroups[timeKey][seriesKey] = item.PRICE
        }
      } else {
        if (item._id.PROFILE === selectedProfile && selectedTypes.includes(item._id.TYPE)) {
          const seriesKey = selectedRegions.includes('ALL') ?
            `${item._id.REGION}_${item._id.TYPE}` :
            item._id.TYPE
          timeGroups[timeKey][seriesKey] = item.PRICE
        }
      }
    })

    return Object.values(timeGroups)
      .sort((a, b) => a.date - b.date)
      .map(item => ({
        ...item,
        TIME: item.TIME ? formatPeriodLabel(item.TIME, selectedPeriod) : item.TIME
      }))
  }, [priceCurves, selectedRegions, selectedProfile, selectedTypes, selectedPeriod, formatPeriodLabel])

  // Get series keys from chart data
  const seriesKeys = useMemo(() => {
    if (!chartData.length) return []
    const sampleData = chartData[0]
    return Object.keys(sampleData).filter(key =>
      key !== 'TIME' && key !== 'date' && typeof sampleData[key] === 'number' && !key.includes('TAS')
    )
  }, [chartData])

  // Get relevant types for current profile
  const relevantTypes = useMemo(() => {
    if (selectedProfile === 'storage') {
      return availableTypes.filter(type => type.startsWith('SPREAD_'))
    }
    return availableTypes.filter(type => !type.startsWith('SPREAD_'))
  }, [selectedProfile, availableTypes])

  // Filter regions by search term
  const filteredRegions = useMemo(() => {
    if (!searchTerm) return availableRegions
    return availableRegions.filter(region =>
      region.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [availableRegions, searchTerm])

  const fetchModelSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/model-settings')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setModelSettings(data.settings)
          // Set local state for editable fields
          if (data.settings.merchantPriceEscalationRate !== undefined) {
            setMerchantEscalationRate(data.settings.merchantPriceEscalationRate)
          }
          if (data.settings.merchantPriceEscalationReferenceDate) {
            setMerchantRefDate(data.settings.merchantPriceEscalationReferenceDate)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching model settings:', err)
    }
  }, [])

  const saveMerchantSettings = useCallback(async () => {
    setSavingSettings(true)
    setSaveStatus({ type: null, message: '' })

    try {
      // Fetch current settings first to preserve other fields
      const currentResponse = await fetch('/api/model-settings')
      let currentSettings = {}
      if (currentResponse.ok) {
        const currentData = await currentResponse.json()
        if (currentData.settings) {
          currentSettings = currentData.settings
        }
      }

      // Update only the merchant escalation fields
      const updatedSettings = {
        ...currentSettings,
        merchantPriceEscalationRate: merchantEscalationRate,
        merchantPriceEscalationReferenceDate: merchantRefDate
      }

      const response = await fetch('/api/model-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      // Update local modelSettings state
      setModelSettings(prev => ({
        ...prev,
        ...updatedSettings
      }))

      setSaveStatus({ type: 'success', message: 'Merchant escalation settings saved successfully!' })

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus({ type: null, message: '' })
      }, 3000)
    } catch (err) {
      console.error('Error saving merchant settings:', err)
      setSaveStatus({ type: 'error', message: `Failed to save: ${err.message}` })
    } finally {
      setSavingSettings(false)
    }
  }, [merchantEscalationRate, merchantRefDate])

  const fetchPriceCurves = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const url = `/api/price-curves${selectedPeriod ? `?period=${selectedPeriod}` : ''}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setPriceCurves(data)

      // Extract unique values for filters
      const regions = [...new Set(data.map(item => item._id.REGION).filter(Boolean))].sort()
      const profiles = [...new Set(data.map(item => item._id.PROFILE).filter(Boolean))].sort()
      const types = [...new Set(data.map(item => item._id.TYPE).filter(Boolean))].sort()

      setAvailableRegions(['ALL', ...regions])

      const hasSpreadTypes = types.some(type => type.startsWith('SPREAD_'))
      if (hasSpreadTypes && !profiles.includes('storage')) {
        setAvailableProfiles([...profiles, 'storage'])
      } else {
        setAvailableProfiles(profiles)
      }
      setAvailableTypes(types)

      // Set date range
      if (data.length > 0) {
        const dates = data.map(item => {
          if (selectedPeriod === 'monthly') {
            return new Date(item._id.year, item._id.month - 1, 1)
          } else if (selectedPeriod === 'quarterly') {
            return new Date(item._id.year, (item._id.quarter - 1) * 3, 1)
          } else if (selectedPeriod === 'yearly') {
            return new Date(item._id.year, 0, 1)
          } else if (selectedPeriod === 'fiscal_yearly') {
            return new Date(item._id.fiscalYear, 6, 1)
          } else {
            return new Date(item.TIME)
          }
        }).filter(d => !isNaN(d))

        if (dates.length > 0) {
          setDateRange({
            start: new Date(Math.min(...dates)),
            end: new Date(Math.max(...dates))
          })
        }
      }

      // Default to showing Energy and Green if they exist
      const defaultTypes = ['ENERGY']
      if (types.includes('GREEN')) {
        defaultTypes.push('GREEN')
      }
      setSelectedTypes(defaultTypes)

    } catch (err) {
      console.error('Error fetching price curves:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod])

  const handleRegionChange = useCallback((region) => {
    if (region === 'ALL') {
      setSelectedRegions(['ALL'])
    } else {
      setSelectedRegions(prev => {
        if (prev.includes('ALL')) {
          return [region]
        } else {
          return prev.includes(region)
            ? prev.filter(r => r !== region)
            : [...prev, region]
        }
      })
    }
  }, [])

  const handleProfileChange = useCallback((profile) => {
    setSelectedProfile(profile)
    if (profile === 'storage') {
      const spreadTypes = availableTypes.filter(type => type.startsWith('SPREAD_'))
      setSelectedTypes(spreadTypes.length > 0 ? [spreadTypes[0]] : [])
    } else {
      const defaultTypes = ['ENERGY']
      if (availableTypes.includes('GREEN')) {
        defaultTypes.push('GREEN')
      }
      setSelectedTypes(defaultTypes)
    }
  }, [availableTypes])

  const handleTypeChange = useCallback((type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }, [])

  const handlePeriodChange = useCallback((event) => {
    setSelectedPeriod(event.target.value)
  }, [])

  const exportToCsv = useCallback(() => {
    if (!chartData.length) return

    const headers = ['TIME', ...seriesKeys]
    const csvRows = []

    csvRows.push(headers.map(header => `"${header.replace(/_/g, ' ')}"`).join(','))

    chartData.forEach(row => {
      const values = headers.map(header => {
        const value = row[header]
        if (typeof value === 'number') {
          return value.toFixed(2)
        } else if (value === null || value === undefined) {
          return ''
        } else {
          return `"${String(value).replace(/"/g, '""')}"`
        }
      })
      csvRows.push(values.join(','))
    })

    const csvString = csvRows.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `price_curves_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [chartData, seriesKeys, selectedPeriod])

  const formatCurrencyValue = useCallback((value) => {
    // Price values are in dollars per MWh - always format as dollars, not millions/thousands
    if (value === undefined || value === null || isNaN(value)) {
      return '-'
    }
    const isNegative = value < 0
    const absValue = Math.abs(value)
    const formattedValue = absValue.toFixed(2)
    const sign = isNegative ? '-' : ''
    return `${sign}$${formattedValue}`
  }, [])

  const getLineColor = useCallback((index) => {
    return CHART_COLORS[index % CHART_COLORS.length]
  }, [])



  if (loading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <span className="text-gray-600">Loading price curves...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Price Curves</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchPriceCurves}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center mx-auto"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  const chartHeight = isFullscreen ? 'calc(100vh - 300px)' : 500

  return (
    <div className={`p-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white overflow-auto' : ''}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">Price Curves</h1>
            <p className="text-gray-600 mt-1">
              Analyze electricity price trends across regions and profiles
            </p>
            {dateRange.start && dateRange.end && (
              <p className="text-sm text-gray-500 mt-1">
                Data range: {dateRange.start.toLocaleDateString('en-AU')} to {dateRange.end.toLocaleDateString('en-AU')}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  {priceCurves.length} data points
                </span>
              </div>
            </div>
            {isFullscreen && (
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Exit fullscreen"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Merchant Escalation Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Merchant Price Escalation</h2>
          </div>
          <button
            onClick={saveMerchantSettings}
            disabled={savingSettings}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingSettings ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>

        {saveStatus.type && (
          <div className={`mb-4 p-3 rounded-lg border flex items-center space-x-2 ${saveStatus.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
            }`}>
            {saveStatus.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="text-sm">{saveStatus.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Escalation Rate (% per year)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              max="100"
              value={merchantEscalationRate * 100}
              onChange={(e) => setMerchantEscalationRate(parseFloat(e.target.value) / 100 || 0)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current: {(merchantEscalationRate * 100).toFixed(3)}%
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference Year
            </label>
            <input
              type="date"
              value={merchantRefDate}
              onChange={(e) => setMerchantRefDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Reference year: {new Date(merchantRefDate).getFullYear()}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          <button
            onClick={() => {
              setSelectedRegions(['ALL'])
              setSelectedProfile('baseload')
              setSelectedTypes(['ENERGY'])
              setSearchTerm('')
            }}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Region Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <MapPin className="w-4 h-4 inline mr-1" />
              Regions ({selectedRegions.includes('ALL') ? 'All' : selectedRegions.length})
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search regions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
              {filteredRegions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">No regions found</p>
              ) : (
                filteredRegions.map(region => (
                  <label key={region} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedRegions.includes(region)}
                      onChange={() => handleRegionChange(region)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{region}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Profile Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Zap className="w-4 h-4 inline mr-1" />
              Profile
            </label>
            <div className="space-y-2 border border-gray-200 rounded-md p-2 max-h-48 overflow-y-auto">
              {availableProfiles.map(profile => (
                <label key={profile} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="radio"
                    name="profile"
                    value={profile}
                    checked={selectedProfile === profile}
                    onChange={() => handleProfileChange(profile)}
                    className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 capitalize flex-1">{profile}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              {selectedProfile === 'storage' ? 'Spread Types' : 'Price Types'} ({selectedTypes.length})
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
              {relevantTypes.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-2">
                  <Info className="w-4 h-4 inline mr-1" />
                  No {selectedProfile === 'storage' ? 'spread' : 'price'} types available
                </div>
              ) : (
                relevantTypes.map(type => (
                  <label key={type} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => handleTypeChange(type)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{type}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Aggregation Period Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Calendar className="w-4 h-4 inline mr-1" />
              Aggregate By
            </label>
            <select
              className="w-full pl-3 pr-10 py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              value={selectedPeriod}
              onChange={handlePeriodChange}
            >
              {PERIOD_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedProfile.charAt(0).toUpperCase() + selectedProfile.slice(1)}
              {selectedProfile === 'storage' ? ' Spread' : ' Price'} Trends
              {selectedRegions.includes('ALL') ? ' - All Regions' : ` - ${selectedRegions.join(', ')}`}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {chartData.length} data points • {seriesKeys.length} series
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showZeroLine}
                onChange={(e) => setShowZeroLine(e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span>Show zero line</span>
            </label>
            {!isFullscreen && (
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Fullscreen"
                title="Fullscreen"
              >
                <Maximize2 className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <button
              onClick={exportToCsv}
              disabled={chartData.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div style={{ width: '100%', height: chartHeight }}>
          {chartData.length > 0 && seriesKeys.length > 0 ? (
            <ResponsiveContainer>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="TIME"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tickFormatter={formatCurrencyValue}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  label={{ value: `Price (${currencyUnit}/MWh)`, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#374151' } }}
                />
                <Tooltip
                  formatter={(value, name) => [formatCurrencyValue(value), name.replace(/_/g, ' ')]}
                  labelFormatter={(label) => `Period: ${label}`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '8px'
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                {showZeroLine && (
                  <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
                )}
                {seriesKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={getLineColor(index)}
                    strokeWidth={2}
                    dot={{ r: 3, fill: getLineColor(index) }}
                    activeDot={{ r: 5, stroke: getLineColor(index), strokeWidth: 2 }}
                    name={key.replace(/_/g, ' ')}
                    connectNulls
                  />
                ))}

              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No data available</p>
                <p className="text-sm text-gray-500 mt-2">Try adjusting your region, profile, or type selections</p>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  )
}
