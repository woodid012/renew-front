// app/pages/price-curves/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
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
  Info
} from 'lucide-react'

export default function PriceCurvesPage() {
  const [priceCurves, setPriceCurves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRegions, setSelectedRegions] = useState(['ALL'])
  const [selectedProfile, setSelectedProfile] = useState('baseload')
  const [selectedTypes, setSelectedTypes] = useState(['ENERGY'])
  const [chartData, setChartData] = useState([])
  const [availableRegions, setAvailableRegions] = useState([])
  const [availableProfiles, setAvailableProfiles] = useState([])
  const [availableTypes, setAvailableTypes] = useState([])
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const [showSpreads, setShowSpreads] = useState(false)
  const [selectedSpreadDurations, setSelectedSpreadDurations] = useState(['1', '2'])

  useEffect(() => {
    fetchPriceCurves()
  }, [])

  useEffect(() => {
    if (priceCurves.length > 0) {
      processChartData()
    }
  }, [priceCurves, selectedRegions, selectedProfile, selectedTypes, showSpreads, selectedSpreadDurations])

  const fetchPriceCurves = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/price-curves')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setPriceCurves(data)
      
      // Extract unique values for filters
      const regions = [...new Set(data.map(item => item.REGION).filter(Boolean))].sort()
      const profiles = [...new Set(data.map(item => item.PROFILE).filter(Boolean))].sort()
      const types = [...new Set(data.map(item => item.TYPE).filter(Boolean))].sort()
      
      setAvailableRegions(['ALL', ...regions])
      setAvailableProfiles(profiles)
      setAvailableTypes(types)
      
      // Set date range
      const dates = data.map(item => new Date(item.TIME)).filter(d => !isNaN(d))
      if (dates.length > 0) {
        setDateRange({
          start: new Date(Math.min(...dates)),
          end: new Date(Math.max(...dates))
        })
      }
      
      // Default to showing Green as well if it exists
      if (types.includes('GREEN') && !selectedTypes.includes('GREEN')) {
        setSelectedTypes(['ENERGY', 'GREEN'])
      }
      
    } catch (err) {
      console.error('Error fetching price curves:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const processChartData = () => {
    if (!priceCurves.length) return

    // Group data by time period
    const timeGroups = {}
    
    priceCurves.forEach(item => {
      const date = new Date(item.TIME)
      const timeKey = item.TIME // Use the original TIME format (YYYY-MM-DD)
      
      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = { TIME: timeKey, date: date }
      }
      
      // Filter by profile
      if (item.PROFILE !== selectedProfile) return
      
      // Filter by region
      const regionMatch = selectedRegions.includes('ALL') || selectedRegions.includes(item.REGION)
      if (!regionMatch) return
      
      // Process regular price types (ENERGY, GREEN, etc.)
      if (selectedTypes.includes(item.TYPE)) {
        const seriesKey = selectedRegions.includes('ALL') ? 
          `${item.REGION}_${item.TYPE}` : 
          item.TYPE
        
        timeGroups[timeKey][seriesKey] = item.PRICE
      }
      
      // Process spreads if enabled and TYPE is ENERGY (assuming spreads are on energy records)
      if (showSpreads && item.TYPE === 'ENERGY' && item.SPREAD) {
        selectedSpreadDurations.forEach(duration => {
          if (item.SPREAD[duration] !== undefined) {
            const spreadKey = selectedRegions.includes('ALL') ? 
              `${item.REGION}_SPREAD_${duration}H` : 
              `SPREAD_${duration}H`
            
            timeGroups[timeKey][spreadKey] = item.SPREAD[duration]
          }
        })
      }
    })
    
    // Convert to array and sort by date
    const processedData = Object.values(timeGroups)
      .sort((a, b) => a.date - b.date)
      .map(item => ({
        ...item,
        TIME: new Date(item.date).toLocaleDateString('en-AU', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })
      }))
    
    setChartData(processedData)
  }

  const handleRegionChange = (region) => {
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
  }

  const handleProfileChange = (profile) => {
    setSelectedProfile(profile)
  }

  const handleTypeChange = (type) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const handleSpreadDurationChange = (duration) => {
    setSelectedSpreadDurations(prev => 
      prev.includes(duration) 
        ? prev.filter(d => d !== duration)
        : [...prev, duration]
    )
  }

  const getSeriesKeys = () => {
    if (!chartData.length) return []
    
    const sampleData = chartData[0]
    return Object.keys(sampleData).filter(key => 
      key !== 'TIME' && key !== 'date' && typeof sampleData[key] === 'number'
    )
  }

  const getLineColor = (index) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', 
      '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
    ]
    return colors[index % colors.length]
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const getAvailableSpreadDurations = () => {
    // Get spread durations from the first record that has spreads
    const recordWithSpreads = priceCurves.find(item => 
      item.SPREAD && 
      item.PROFILE === selectedProfile &&
      (selectedRegions.includes('ALL') || selectedRegions.includes(item.REGION))
    )
    
    if (recordWithSpreads && recordWithSpreads.SPREAD) {
      return Object.keys(recordWithSpreads.SPREAD).sort((a, b) => parseFloat(a) - parseFloat(b))
    }
    
    return []
  }

  if (loading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <span className="text-gray-600">Loading price curves...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Price Curves</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchPriceCurves}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
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
            <h1 className="text-3xl font-bold text-gray-900">Price Curves</h1>
            <p className="text-gray-600 mt-2">
              Analyze electricity price trends across regions and profiles
            </p>
            {dateRange.start && dateRange.end && (
              <p className="text-sm text-gray-500 mt-1">
                Data range: {dateRange.start.toLocaleDateString('en-AU')} to {dateRange.end.toLocaleDateString('en-AU')}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  {priceCurves.length} data points
                </span>
              </div>
            </div>
            <button
              onClick={fetchPriceCurves}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Region Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <MapPin className="w-4 h-4 inline mr-1" />
              Regions
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {availableRegions.map(region => (
                <label key={region} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedRegions.includes(region)}
                    onChange={() => handleRegionChange(region)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">{region}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Profile Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Zap className="w-4 h-4 inline mr-1" />
              Profile
            </label>
            <div className="space-y-2">
              {availableProfiles.map(profile => (
                <label key={profile} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="profile"
                    value={profile}
                    checked={selectedProfile === profile}
                    onChange={() => handleProfileChange(profile)}
                    className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{profile}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Price Types
            </label>
            <div className="space-y-2">
              {availableTypes.map(type => (
                <label key={type} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => handleTypeChange(type)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Spreads Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <BarChart3 className="w-4 h-4 inline mr-1" />
              Storage Spreads
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showSpreads}
                  onChange={(e) => setShowSpreads(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Show Spreads</span>
              </label>
              
              {showSpreads && (
                <div className="ml-6 space-y-2">
                  {getAvailableSpreadDurations().map(duration => (
                    <label key={duration} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedSpreadDurations.includes(duration)}
                        onChange={() => handleSpreadDurationChange(duration)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-xs text-gray-600">{duration} hour{duration !== '1' ? 's' : ''}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedProfile.charAt(0).toUpperCase() + selectedProfile.slice(1)} Price Trends
            {selectedRegions.includes('ALL') ? ' - All Regions' : ` - ${selectedRegions.join(', ')}`}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{chartData.length} data points</span>
          </div>
        </div>
        
        <div style={{ width: '100%', height: 500 }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="TIME"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(value), name]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                {getSeriesKeys().map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={getLineColor(index)}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name={key.replace(/_/g, ' ')}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No data available for selected filters</p>
                <p className="text-sm text-gray-500 mt-2">Try adjusting your region, profile, or type selections</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {chartData.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Active Series</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {getSeriesKeys().length}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Data Points</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {chartData.length}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Regions</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {selectedRegions.includes('ALL') ? availableRegions.length - 1 : selectedRegions.length}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Profile</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {selectedProfile.charAt(0).toUpperCase() + selectedProfile.slice(1)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}