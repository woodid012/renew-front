// app/pages/price-curves/page.jsx
'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
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
  Save,
  CheckCircle,
  Database
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
  const searchParams = useSearchParams()
  const { currencyUnit } = useDisplaySettings()
  const [priceCurves, setPriceCurves] = useState([])
  const [curveNames, setCurveNames] = useState(['AC Nov 2024'])
  const [selectedCurve, setSelectedCurve] = useState('AC Nov 2024')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [curvesMetadata, setCurvesMetadata] = useState({}) // Store metadata for all curves
  const [selectedRegions, setSelectedRegions] = useState(['NSW', 'QLD', 'SA', 'VIC'])
  const [selectedProfiles, setSelectedProfiles] = useState(['baseload', 'green'])
  const [selectedTypes, setSelectedTypes] = useState(['ENERGY'])
  const [availableRegions, setAvailableRegions] = useState([])
  const [availableProfiles, setAvailableProfiles] = useState([])
  const [availableTypes, setAvailableTypes] = useState([])
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const [selectedPeriod, setSelectedPeriod] = useState('yearly')
  const [isFullscreen, setIsFullscreen] = useState(false)
  // searchTerm state removed - regions search box removed
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

  // Initialize page data
  useEffect(() => {
    const initializePage = async () => {
      try {
        // 1. Fetch Model Settings (to get saved default)
        let savedDefaultCurve = null;
        try {
          const settingsResponse = await fetch('/api/model-settings');
          if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json();
            if (settingsData.settings) {
              setModelSettings(settingsData.settings);
              // Set local state for editable fields
              if (settingsData.settings.merchantPriceEscalationRate !== undefined) {
                setMerchantEscalationRate(settingsData.settings.merchantPriceEscalationRate);
              }
              if (settingsData.settings.merchantPriceEscalationReferenceDate) {
                setMerchantRefDate(settingsData.settings.merchantPriceEscalationReferenceDate);
              }
              savedDefaultCurve = settingsData.settings.defaultPriceCurve;
            }
          }
        } catch (err) {
          console.error('Error fetching model settings:', err);
        }

        // 2. Fetch Curve Names
        const metaResponse = await fetch('/api/price-curves/meta');
        if (metaResponse.ok) {
          const metaData = await metaResponse.json();
          if (metaData.curveNames && metaData.curveNames.length > 0) {
            setCurveNames(metaData.curveNames);
            if (metaData.metadata) {
              setCurvesMetadata(metaData.metadata);
            }

            // 3. Determine Selection Priority:
            //    a. URL Param (?curve_name=...)
            //    b. Saved Default (from settings)
            //    c. "AC Nov 2024" (hardcoded fallback preference)
            //    d. First available curve

            const urlCurve = searchParams.get('curve_name');

            if (urlCurve && metaData.curveNames.includes(urlCurve)) {
              setSelectedCurve(urlCurve);
            } else if (savedDefaultCurve && metaData.curveNames.includes(savedDefaultCurve)) {
              setSelectedCurve(savedDefaultCurve);
            } else if (metaData.curveNames.includes('AC Nov 2024')) {
              setSelectedCurve('AC Nov 2024');
            } else {
              setSelectedCurve(metaData.curveNames[0]);
            }
          }
        }
      } catch (err) {
        console.error('Error initializing page:', err);
      }
    };

    initializePage();
  }, [searchParams]); // Re-run if URL params change, though usually this is just on mount/nav

  // fetchModelSettings is now part of initialization, but we might keep it if needed for re-fetching independently?
  // The 'saveMerchantSettings' refetches it internally before saving, so we don't strictly need it exposed as a standalone function for that purpose.
  // However, let's keep a simplified version if other effects depend on it, OR just remove the independent calls.
  // The previous code had `fetchModelSettings` and `fetchCurveNames` as standalone.
  // Let's remove `fetchCurveNames` as a standalone function to avoid confusion/conflicts, or define it inside the effect?
  // To keep code clean, I will remove the standalone definitions and just have the effect do the work.

  // Fetch price curves when period or curve changes
  useEffect(() => {
    fetchPriceCurves()
  }, [selectedPeriod, selectedCurve])

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

      const regionMatch = selectedRegions.includes(item._id.REGION)
      if (!regionMatch) return

      if (selectedProfiles.includes('storage')) {
        if (item._id.TYPE && item._id.TYPE.startsWith('SPREAD_') && selectedTypes.includes(item._id.TYPE)) {
          const seriesKey = selectedRegions.length > 1 ?
            `${item._id.REGION}_${item._id.TYPE}` :
            item._id.TYPE
          timeGroups[timeKey][seriesKey] = item.PRICE
        }
      }
      if (selectedProfiles.includes(item._id.PROFILE) && selectedTypes.includes(item._id.TYPE)) {
        const seriesKey = selectedRegions.length > 1 ?
          `${item._id.REGION}_${item._id.PROFILE}_${item._id.TYPE}` :
          `${item._id.PROFILE}_${item._id.TYPE}`
        timeGroups[timeKey][seriesKey] = item.PRICE
      }
    })

    return Object.values(timeGroups)
      .sort((a, b) => a.date - b.date)
      .map(item => ({
        ...item,
        TIME: item.TIME ? formatPeriodLabel(item.TIME, selectedPeriod) : item.TIME
      }))
  }, [priceCurves, selectedRegions, selectedProfiles, selectedTypes, selectedPeriod, formatPeriodLabel])

  // Get series keys from chart data
  const seriesKeys = useMemo(() => {
    if (!chartData.length) return []
    const sampleData = chartData[0]
    // Sort, ensuring "AC Nov 2024" is first if it exists
    curveNames.sort((a, b) => {
      if (a === 'AC Nov 2024') return -1;
      if (b === 'AC Nov 2024') return 1;
      return a.localeCompare(b);
    });
    return Object.keys(sampleData).filter(key =>
      key !== 'TIME' && key !== 'date' && typeof sampleData[key] === 'number' && !key.includes('TAS')
    )
  }, [chartData])

  // Get relevant types for current profiles
  const relevantTypes = useMemo(() => {
    if (selectedProfiles.includes('storage')) {
      return availableTypes.filter(type => type.startsWith('SPREAD_'))
    }
    return availableTypes.filter(type => !type.startsWith('SPREAD_'))
  }, [selectedProfiles, availableTypes])

  // fetchModelSettings is now handled in the main initialization effect to ensure correct order
  // Keeping this as a stub or removing it.
  // If 'saveMerchantSettings' previously used it? No, saveMerchantSettings has its own fetch inside.
  // So it is safe to remove.

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

      // Update only the merchant escalation fields AND the default price curve
      const updatedSettings = {
        ...currentSettings,
        merchantPriceEscalationRate: merchantEscalationRate,
        merchantPriceEscalationReferenceDate: merchantRefDate,
        defaultPriceCurve: selectedCurve // Save the currently selected curve as default
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

      setSaveStatus({ type: 'success', message: 'Settings saved successfully! Default curve updated.' })

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
  }, [merchantEscalationRate, merchantRefDate, selectedCurve])

  const fetchPriceCurves = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      setLoading(true)
      setError(null)

      const url = `/api/price-curves?period=${selectedPeriod}&curve_name=${encodeURIComponent(selectedCurve)}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setPriceCurves(data)

      // Extract unique values for filters
      const regions = [...new Set(data.map(item => item._id.REGION).filter(Boolean))].sort()
      const filteredRegions = regions.filter(r => r !== 'TAS')
      const profiles = [...new Set(data.map(item => item._id.PROFILE).filter(Boolean))].sort()
      const types = [...new Set(data.map(item => item._id.TYPE).filter(Boolean))].sort()

      setAvailableRegions(filteredRegions)

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
  }, [selectedPeriod, selectedCurve, searchParams]) // Added searchParams to dependencies

  const handleRegionChange = useCallback((region) => {
    setSelectedRegions(prev => {
      return prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    })
  }, [])

  const handleProfileChange = useCallback((profile) => {
    setSelectedProfiles(prev => {
      if (prev.includes(profile)) {
        return prev.filter(p => p !== profile)
      } else {
        return [...prev, profile]
      }
    })
  }, [])

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
            <h2 className="text-lg font-semibold text-gray-900">Model Assumptions</h2>
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
                <span>Save All Settings</span>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Price Curve
            </label>

            <select
              value={selectedCurve}
              onChange={(e) => setSelectedCurve(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {curveNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select the curve to save as global default.
            </p>
          </div>
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
            {(() => {
              // Logic to check for mismatch
              if (!selectedCurve || !curvesMetadata[selectedCurve]) return null;

              const meta = curvesMetadata[selectedCurve];
              // Try to find year in "Currency" or similar fields
              // Looking for "Real 20XX" or similar pattern
              let curveYear = null;
              const currencyItem = meta.find(m => m.label && m.label.toLowerCase().includes('currency'));
              if (currencyItem && currencyItem.value) {
                const match = currencyItem.value.match(/Real\s+(\d{4})/i);
                if (match) {
                  curveYear = parseInt(match[1]);
                }
              }

              // Fallback: look through all values for "Real 20XX"
              if (!curveYear) {
                for (const m of meta) {
                  if (m.value) {
                    const match = String(m.value).match(/Real\s+(\d{4})/i);
                    if (match) {
                      curveYear = parseInt(match[1]);
                      break;
                    }
                  }
                }
              }

              const selectedYear = new Date(merchantRefDate).getFullYear();

              if (curveYear && curveYear !== selectedYear) {
                return (
                  <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Curve Ref: {curveYear} (Mismatch)
                  </p>
                )
              }
              return null;
            })()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg backdrop-blur-[1px]">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          <button
            onClick={() => {
              setSelectedRegions(['NSW', 'QLD', 'SA', 'VIC'])
              setSelectedProfiles(['baseload', 'green'])
              setSelectedTypes(['ENERGY'])
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
              Regions ({selectedRegions.length})
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
              {availableRegions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">No regions found</p>
              ) : (
                availableRegions.map(region => (
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
              Profiles ({selectedProfiles.length})
            </label>
            <div className="space-y-2 border border-gray-200 rounded-md p-2 max-h-48 overflow-y-auto">
              {availableProfiles.map(profile => (
                <label key={profile} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedProfiles.includes(profile)}
                    onChange={() => handleProfileChange(profile)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
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
              {selectedProfiles.includes('storage') ? 'Spread Types' : 'Price Types'} ({selectedTypes.length})
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
              {relevantTypes.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-2">
                  <Info className="w-4 h-4 inline mr-1" />
                  No {selectedProfiles.includes('storage') ? 'spread' : 'price'} types available
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg backdrop-blur-[1px]">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        )}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedProfiles.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
              {selectedProfiles.includes('storage') ? ' Spread' : ' Price'} Trends
              {selectedRegions.includes('ALL') ? ' - All Regions' : ` - ${selectedRegions.join(', ')}`}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {chartData.length} data points • {seriesKeys.length} series
            </p>
          </div>
          <div className="flex items-center space-x-2">
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


    </div >
  )
}
