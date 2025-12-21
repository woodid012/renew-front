'use client'

// OpenElectricity API Reference Documentation:
// - Overview: https://docs.openelectricity.org.au/api-reference/overview
// - Data Limits: https://docs.openelectricity.org.au/api-reference/data-limits
// - Market Data: https://docs.openelectricity.org.au/api-reference/market-data
// - Generation Data: https://docs.openelectricity.org.au/api-reference/generation-data
//
// If the API/code is getting confused, refer to the above documentation to see what options are available.

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
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
    TrendingUp,
    RefreshCw,
    AlertCircle,
    Loader2,
    Calendar,
    MapPin,
    Download,
    BarChart3,
    ExternalLink
} from 'lucide-react'

// Chart colors for each region
const REGION_COLORS = {
    NSW1: '#3b82f6', // Blue
    VIC1: '#10b981', // Green
    QLD1: '#f59e0b', // Amber
    SA1: '#ef4444',  // Red
    TAS1: '#8b5cf6'  // Purple
}

// Display names for regions
const REGION_NAMES = {
    NSW1: 'New South Wales',
    VIC1: 'Victoria',
    QLD1: 'Queensland',
    SA1: 'South Australia',
    TAS1: 'Tasmania'
}

export default function HistoricalPricesPage() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedRegions, setSelectedRegions] = useState(['NSW1', 'VIC1', 'QLD1', 'SA1'])
    const [monthsRange, setMonthsRange] = useState(12) // Default to 12 months
    const [interval, setInterval] = useState('1M') // Default to monthly interval
    const [activeTab, setActiveTab] = useState('market') // 'market', 'solar_utility', 'wind'

    // Fetch data from our API proxy
    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            let typeParam = 'market'
            if (activeTab === 'solar_utility' || activeTab === 'wind') {
                typeParam = 'fueltech'
            }

            const url = `/api/historical-actuals?type=${typeParam}&months=${monthsRange}&interval=${interval}`

            const response = await fetch(url)

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || `HTTP error: ${response.status}`)
            }

            const result = await response.json()
            setData(result)
        } catch (err) {
            console.error('Error fetching historical data:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [monthsRange, activeTab, interval])

    // Automatically adjust months range based on interval selection
    // API limits reference: https://docs.openelectricity.org.au/api-reference/data-limits
    // If confused about available intervals or limits, refer to the API documentation above
    useEffect(() => {
        const maxDaysForInterval = {
            '5m': 8,      // 8 days maximum
            '1h': 32,     // 32 days maximum
            '1d': 366,    // 366 days maximum
            '7d': 366,    // 366 days maximum
            '1M': 732,    // 732 days (~2 years) maximum
            '3M': 1830,   // 1830 days (~5 years) maximum
            'season': 1830, // 1830 days (~5 years) maximum
            '1y': 3700,   // 3700 days (~10 years) maximum
            'fy': 3700    // 3700 days (~10 years) maximum
        }

        const getDefaultMonths = (interval) => {
            // Get the first option from the dropdown for this interval
            const getOptions = () => {
                if (interval === '5m') {
                    return [{ value: 0, label: 'Last 8 days' }]
                } else if (interval === '1h') {
                    return [
                        { value: 1, label: 'Last month' }
                    ]
                } else if (interval === '1d') {
                    return [
                        { value: 3, label: 'Last 3 months' },
                        { value: 6, label: 'Last 6 months' },
                        { value: 12, label: 'Last 12 months' }
                    ]
                } else if (interval === '7d') {
                    return [
                        { value: 3, label: 'Last 3 months' },
                        { value: 6, label: 'Last 6 months' },
                        { value: 12, label: 'Last 12 months' }
                    ]
                } else if (interval === '1M') {
                    return [
                        { value: 6, label: 'Last 6 months' },
                        { value: 12, label: 'Last 12 months' },
                        { value: 24, label: 'Last 24 months' }
                    ]
                } else if (interval === '3M' || interval === 'season') {
                    return [
                        { value: 12, label: 'Last 12 months' },
                        { value: 24, label: 'Last 24 months' },
                        { value: 36, label: 'Last 3 years' },
                        { value: 60, label: 'Last 5 years' }
                    ]
                } else {
                    // '1y' and 'fy'
                    return [
                        { value: 12, label: 'Last 12 months' },
                        { value: 24, label: 'Last 24 months' },
                        { value: 36, label: 'Last 3 years' },
                        { value: 60, label: 'Last 5 years' },
                        { value: 120, label: 'Last 10 years' }
                    ]
                }
            }
            
            const options = getOptions()
            // Return the first option's value, but prefer 12 months if available
            const twelveMonthOption = options.find(opt => opt.value === 12)
            return twelveMonthOption ? 12 : options[0].value
        }

        const maxDays = maxDaysForInterval[interval]
        if (maxDays) {
            // For 5m, we use 0 to represent 8 days
            if (interval === '5m') {
                setMonthsRange(0)
            } else {
                // Always set to default for this interval when interval changes
                // This ensures the chart shows the appropriate default range
                const defaultMonths = getDefaultMonths(interval)
                setMonthsRange(defaultMonths)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interval]) // Only run when interval changes

    useEffect(() => {
        fetchData()
    }, [fetchData, activeTab])

    // Transform data for the chart
    const chartData = useMemo(() => {
        if (!data?.regions) return []

        // Get all unique data points using date as unique key
        const dataMap = {}
        const currentInterval = data.interval || '1M' // Get interval from data

        if (data.type === 'fueltech') {
            // Handle fueltech data structure: { region: { fueltech: [...] } }
            // Use activeTab to determine which fueltech to show
            const fueltechToShow = activeTab === 'solar_utility' ? 'solar_utility' : 'wind'
            Object.entries(data.regions).forEach(([region, fueltechs]) => {
                if (!selectedRegions.includes(region)) return
                if (!fueltechs[fueltechToShow]) return

                fueltechs[fueltechToShow].forEach(item => {
                    // Use ISO date string as unique key to prevent collapsing multiple points
                    const key = item.date
                    const dateObj = new Date(item.date)
                    
                    if (!dataMap[key]) {
                        // Create sortKey based on interval type for proper sorting
                        let sortKey
                        if (currentInterval === '1M' || currentInterval === '3M' || currentInterval === 'season' || currentInterval === '1y' || currentInterval === 'fy') {
                            // Monthly/quarterly/yearly: use YYYY-MM
                            sortKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
                        } else if (currentInterval === '7d' || currentInterval === '1d') {
                            // Daily/weekly: use YYYY-MM-DD
                            sortKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
                        } else {
                            // Hourly/5-minute: use full ISO timestamp
                            sortKey = item.date
                        }
                        
                        dataMap[key] = {
                            month: item.label || item.month, // Use label for display (formatted per interval)
                            date: dateObj,
                            sortKey: sortKey
                        }
                    }
                    dataMap[key][region] = item.price
                    // Store percentage for table display (average price as % of baseload price)
                    if (item.percentageOfBaseload !== null && item.percentageOfBaseload !== undefined) {
                        dataMap[key][`${region}_percentage`] = item.percentageOfBaseload
                    }
                })
            })
        } else {
            // Handle market data structure: { region: [...] }
            Object.entries(data.regions).forEach(([region, regionData]) => {
                if (!selectedRegions.includes(region)) return

                regionData.forEach(item => {
                    // Use ISO date string as unique key to prevent collapsing multiple points
                    const key = item.date
                    const dateObj = new Date(item.date)
                    
                    if (!dataMap[key]) {
                        // Create sortKey based on interval type for proper sorting
                        let sortKey
                        if (currentInterval === '1M' || currentInterval === '3M' || currentInterval === 'season' || currentInterval === '1y' || currentInterval === 'fy') {
                            // Monthly/quarterly/yearly: use YYYY-MM
                            sortKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
                        } else if (currentInterval === '7d' || currentInterval === '1d') {
                            // Daily/weekly: use YYYY-MM-DD
                            sortKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
                        } else {
                            // Hourly/5-minute: use full ISO timestamp
                            sortKey = item.date
                        }
                        
                        dataMap[key] = {
                            month: item.label || item.month, // Use label for display (formatted per interval)
                            date: dateObj,
                            sortKey: sortKey
                        }
                    }
                    dataMap[key][region] = item.price
                })
            })
        }

        return Object.values(dataMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    }, [data, selectedRegions, activeTab])

    // Get available regions
    const availableRegions = useMemo(() => {
        if (!data?.regions) return []
        return Object.keys(data.regions).sort()
    }, [data])

    // Handle region toggle
    const handleRegionToggle = useCallback((region) => {
        setSelectedRegions(prev =>
            prev.includes(region)
                ? prev.filter(r => r !== region)
                : [...prev, region]
        )
    }, [])

    // Export to CSV
    const exportToCsv = useCallback(() => {
        if (!chartData.length) return

        const typeLabel = activeTab === 'market' ? 'market_prices' : `${activeTab}_prices`
        const headers = ['Month', ...selectedRegions.map(r => REGION_NAMES[r] || r)]
        const rows = chartData.map(row => {
            return [row.month, ...selectedRegions.map(r => row[r]?.toFixed(2) || '')]
        })

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `historical_${typeLabel}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }, [chartData, selectedRegions, activeTab])

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null

        return (
            <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                <p className="font-semibold text-gray-900 mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {REGION_NAMES[entry.dataKey] || entry.dataKey}: ${entry.value?.toFixed(2)}/MWh
                    </p>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6 min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={fetchData}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center mx-auto"
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
            <div className="mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl font-bold text-gray-900">Historical Prices</h1>
                        <p className="text-gray-600 mt-1">
                            {activeTab === 'market' 
                                ? 'Actual monthly wholesale electricity prices from the NEM'
                                : activeTab === 'solar_utility'
                                ? 'Average prices for solar utility generation by region'
                                : 'Average prices for wind generation by region'
                            }
                        </p>
                        {data?.dateRange && (
                            <p className="text-sm text-gray-500 mt-1">
                                Data from {data.dateRange.start} to {data.dateRange.end}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        <a
                            href="https://explore.openelectricity.org.au/energy/nsw1/?range=1y&interval=1M&view=discrete-time&group=Detailed"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Open Electricity Explorer
                        </a>
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="p-2 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
                            title="Refresh data"
                        >
                            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={exportToCsv}
                            disabled={!chartData.length}
                            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            <Download className="w-4 h-4 mr-1" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex space-x-4 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('market')}
                        className={`px-4 py-2 font-medium text-sm transition-colors ${
                            activeTab === 'market'
                                ? 'text-green-600 border-b-2 border-green-600'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Market Prices
                    </button>
                    <button
                        onClick={() => setActiveTab('solar_utility')}
                        className={`px-4 py-2 font-medium text-sm transition-colors ${
                            activeTab === 'solar_utility'
                                ? 'text-green-600 border-b-2 border-green-600'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Solar Utility Prices
                    </button>
                    <button
                        onClick={() => setActiveTab('wind')}
                        className={`px-4 py-2 font-medium text-sm transition-colors ${
                            activeTab === 'wind'
                                ? 'text-green-600 border-b-2 border-green-600'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Wind Prices
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-gray-600" />
                        Filters
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Region Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Regions ({selectedRegions.length} selected)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {availableRegions.map(region => (
                                <button
                                    key={region}
                                    onClick={() => handleRegionToggle(region)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedRegions.includes(region)
                                            ? 'text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    style={selectedRegions.includes(region) ? { backgroundColor: REGION_COLORS[region] } : {}}
                                >
                                    {region.replace('1', '')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Interval Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Interval
                        </label>
                        <select
                            value={interval}
                            onChange={(e) => setInterval(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                            <option value="5m">5 minutes</option>
                            <option value="1h">1 hour</option>
                            <option value="1d">1 day</option>
                            <option value="7d">7 days</option>
                            <option value="1M">1 month</option>
                            <option value="3M">3 months</option>
                            <option value="season">Season</option>
                            <option value="1y">1 year</option>
                            <option value="fy">Financial year</option>
                        </select>
                    </div>

                    {/* Time Range */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Time Range
                        </label>
                        {(() => {
                            // API limits from: https://docs.openelectricity.org.au/api-reference/data-limits
                            const maxDaysForInterval = {
                                '5m': 8,
                                '1h': 32,
                                '1d': 366,
                                '7d': 366,
                                '1M': 732,
                                '3M': 1830,
                                'season': 1830,
                                '1y': 3700,
                                'fy': 3700
                            }
                            const maxDays = maxDaysForInterval[interval] || 3700
                            const maxMonths = Math.floor(maxDays / 30)
                            
                            // Generate options based on interval limits
                            const getOptions = () => {
                                if (interval === '5m') {
                                    return [
                                        { value: 0, label: 'Last 8 days' }
                                    ]
                                } else if (interval === '1h') {
                                    return [
                                        { value: 1, label: 'Last month' }
                                    ]
                                } else if (interval === '1d') {
                                    return [
                                        { value: 3, label: 'Last 3 months' },
                                        { value: 6, label: 'Last 6 months' },
                                        { value: 12, label: 'Last 12 months' }
                                    ]
                                } else if (interval === '7d') {
                                    return [
                                        { value: 3, label: 'Last 3 months' },
                                        { value: 6, label: 'Last 6 months' },
                                        { value: 12, label: 'Last 12 months' }
                                    ]
                                } else if (interval === '1M') {
                                    return [
                                        { value: 6, label: 'Last 6 months' },
                                        { value: 12, label: 'Last 12 months' },
                                        { value: 24, label: 'Last 24 months' }
                                    ]
                                } else if (interval === '3M' || interval === 'season') {
                                    return [
                                        { value: 12, label: 'Last 12 months' },
                                        { value: 24, label: 'Last 24 months' },
                                        { value: 36, label: 'Last 3 years' },
                                        { value: 60, label: 'Last 5 years' }
                                    ]
                                } else {
                                    // '1y' and 'fy'
                                    return [
                                        { value: 12, label: 'Last 12 months' },
                                        { value: 24, label: 'Last 24 months' },
                                        { value: 36, label: 'Last 3 years' },
                                        { value: 60, label: 'Last 5 years' },
                                        { value: 120, label: 'Last 10 years' }
                                    ]
                                }
                            }
                            
                            const options = getOptions()
                            // Use monthsRange if it's in the options, otherwise use the first option
                            const isValidOption = options.some(opt => opt.value === monthsRange)
                            const currentValue = isValidOption ? monthsRange : options[0].value
                            
                            return (
                                <>
                                    <select
                                        value={currentValue}
                                        onChange={(e) => setMonthsRange(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    >
                                        {options.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    {interval === '5m' && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            Note: 5-minute interval limited to 8 days maximum
                                        </p>
                                    )}
                                    {interval === '1h' && monthsRange > 1 && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            Note: 1-hour interval limited to 32 days (1 month) maximum
                                        </p>
                                    )}
                                    {interval === '1d' && monthsRange > 12 && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            Note: 1-day interval limited to 366 days (12 months) maximum
                                        </p>
                                    )}
                                    {interval === '7d' && monthsRange > 12 && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            Note: 7-day interval limited to 366 days (12 months) maximum
                                        </p>
                                    )}
                                    {interval === '1M' && monthsRange > 24 && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            Note: 1-month interval limited to 732 days (24 months) maximum
                                        </p>
                                    )}
                                    {(interval === '3M' || interval === 'season') && monthsRange > 60 && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            Note: {interval === '3M' ? 'Quarterly' : 'Seasonal'} interval limited to 1830 days (60 months) maximum
                                        </p>
                                    )}
                                    {(interval === '1y' || interval === 'fy') && monthsRange > 120 && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            Note: {interval === '1y' ? 'Yearly' : 'Financial year'} interval limited to 3700 days (120 months) maximum
                                        </p>
                                    )}
                                </>
                            )
                        })()}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg backdrop-blur-[1px]">
                        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                    </div>
                )}

                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                        {activeTab === 'market' 
                            ? 'Monthly Wholesale Prices ($/MWh)'
                            : activeTab === 'solar_utility'
                            ? 'Solar Utility Average Prices ($/MWh)'
                            : 'Wind Average Prices ($/MWh)'
                        }
                    </h3>
                    <div className="bg-gray-100 rounded-lg px-3 py-1 text-sm text-gray-600">
                        <BarChart3 className="w-4 h-4 inline mr-1" />
                        {chartData.length} data points
                    </div>
                </div>

                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                axisLine={false}
                                tickLine={false}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => `$${value}`}
                                label={{ value: '$/MWh', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#9CA3AF' } }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => REGION_NAMES[value] || value}
                            />
                            {selectedRegions.map(region => (
                                <Line
                                    key={region}
                                    type="monotone"
                                    dataKey={region}
                                    stroke={REGION_COLORS[region]}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {activeTab === 'market' 
                        ? 'Monthly Data Table'
                        : activeTab === 'solar_utility'
                        ? 'Solar Utility Average Prices Table'
                        : 'Wind Average Prices Table'
                    }
                </h3>

                {chartData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        {loading ? 'Loading data...' : 'No data available'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Month</th>
                                    {selectedRegions.map(region => (
                                        <Fragment key={region}>
                                            <th
                                                className="text-right py-3 px-4 font-semibold"
                                                style={{ color: REGION_COLORS[region] }}
                                            >
                                                {region.replace('1', '')} ($/MWh)
                                            </th>
                                            {(activeTab === 'solar_utility' || activeTab === 'wind') && (
                                                <th
                                                    className="text-right py-3 px-4 font-semibold text-gray-600"
                                                >
                                                    {region.replace('1', '')} (%)
                                                </th>
                                            )}
                                        </Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {chartData.map((row, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium text-gray-900">{row.month}</td>
                                        {selectedRegions.map(region => (
                                            <Fragment key={region}>
                                                <td className="py-3 px-4 text-right text-gray-700">
                                                    {row[region] != null ? `$${row[region].toFixed(2)}` : '-'}
                                                </td>
                                                {(activeTab === 'solar_utility' || activeTab === 'wind') && (
                                                    <td className="py-3 px-4 text-right text-gray-600">
                                                        {row[`${region}_percentage`] != null 
                                                            ? `${row[`${region}_percentage`].toFixed(1)}%` 
                                                            : '-'
                                                        }
                                                    </td>
                                                )}
                                            </Fragment>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Source Attribution */}
            <div className="mt-6 text-center text-sm text-gray-500">
                Data source: <a href="https://openelectricity.org.au" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenElectricity.org.au</a>
                {' '}• Licensed under CC BY 4.0
            </div>
        </div>
    )
}

