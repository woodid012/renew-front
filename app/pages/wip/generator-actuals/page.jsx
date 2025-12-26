'use client'

// OpenElectricity API Reference Documentation:
// - Overview: https://docs.openelectricity.org.au/api-reference/overview
// - Data Limits: https://docs.openelectricity.org.au/api-reference/data-limits
// - Generation Data: https://docs.openelectricity.org.au/api-reference/generation-data
// - Facilities: https://docs.openelectricity.org.au/api-reference/facilities
// - TypeScript Examples: https://github.com/opennem/openelectricity-typescript/tree/main/examples
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

export default function GeneratorActualsPage() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [monthsRange, setMonthsRange] = useState(12) // Default: 12 months duration
    const [interval, setInterval] = useState('1M') // Default: monthly interval ('5m', '1h', '1d', '7d', '1M', '3M', 'season', '1y', 'fy')
    const [facilities, setFacilities] = useState([])
    const [selectedFacility, setSelectedFacility] = useState('WAUBRAWF') // Single facility selection, default to WAUBRAWF
    const [facilitiesLoading, setFacilitiesLoading] = useState(false)

    // Filters for secondary categories (from API documentation: https://docs.openelectricity.org.au/api-reference/data/get-network-data)
    const [filterFueltech, setFilterFueltech] = useState('')
    const [filterFueltechGroup, setFilterFueltechGroup] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterRenewable, setFilterRenewable] = useState('')

    // Fetch facilities list with retry logic for cold start
    const fetchFacilities = useCallback(async (retryCount = 0) => {
        setFacilitiesLoading(true)
        try {
            const response = await fetch('/api/facilities?network_id=NEM&status_id=operating')
            if (response.ok) {
                const result = await response.json()
                console.log('Facilities response:', result)
                console.log('Facilities count:', result.facilities?.length || 0)
                if (result.facilities && result.facilities.length > 0) {
                    console.log('Sample facility:', result.facilities[0])
                }
                setFacilities(result.facilities || [])
            } else {
                const errorData = await response.json()
                console.error('Facilities API error:', errorData)
                // Retry on 500 errors (likely cold start compilation)
                if (response.status >= 500 && retryCount < 2) {
                    console.log(`Retrying facilities fetch (attempt ${retryCount + 2})...`)
                    setTimeout(() => fetchFacilities(retryCount + 1), 1000)
                    return
                }
                setFacilities([])
            }
        } catch (err) {
            console.error('Error fetching facilities:', err)
            // Retry on network errors (likely cold start compilation)
            if (retryCount < 2) {
                console.log(`Retrying facilities fetch after error (attempt ${retryCount + 2})...`)
                setTimeout(() => fetchFacilities(retryCount + 1), 1000)
                return
            }
            setFacilities([])
        } finally {
            setFacilitiesLoading(false)
        }
    }, [])

    // Fetch data from our API proxy with retry logic for cold start
    const fetchData = useCallback(async (retryCount = 0) => {
        if (!selectedFacility) return // Don't fetch if no facility selected

        setLoading(true)
        if (retryCount === 0) {
            setError(null)
        }

        try {
            const url = `/api/historical-actuals?type=generator&months=${monthsRange}&interval=${interval}&facility_codes=${selectedFacility}`

            const response = await fetch(url)

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                // Retry on 500 errors (likely cold start compilation)
                if (response.status >= 500 && retryCount < 2) {
                    console.log(`Retrying historical data fetch (attempt ${retryCount + 2})...`)
                    setTimeout(() => fetchData(retryCount + 1), 1000)
                    return
                }
                throw new Error(errorData.error || `HTTP error: ${response.status}`)
            }

            const result = await response.json()
            setData(result)
            setError(null)
        } catch (err) {
            console.error('Error fetching historical data:', err)
            // Retry on network errors (likely cold start compilation)
            if (retryCount < 2) {
                console.log(`Retrying historical data fetch after error (attempt ${retryCount + 2})...`)
                setTimeout(() => fetchData(retryCount + 1), 1000)
                return
            }
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [monthsRange, interval, selectedFacility])

    useEffect(() => {
        fetchFacilities()
    }, [fetchFacilities])

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
    }, [fetchData])

    // Transform data for the chart
    const chartData = useMemo(() => {
        if (!data?.regions || !selectedFacility) return []

        // Get all unique data points using date as unique key
        const dataMap = {}
        const currentInterval = data.interval || '1M' // Get interval from data

        // Handle generator data structure: { facilityCode: [...] }
        // Use selected facility for charts
        // Display energy, market_value, average power, and emissions
        Object.entries(data.regions).forEach(([facilityCode, facilityData]) => {
            // Only process the selected facility for charts
            if (facilityCode !== selectedFacility) return

            facilityData.forEach(item => {
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
                // Store all 4 metrics with facility code prefix
                if (item.energy != null) dataMap[key][`${facilityCode}_energy`] = item.energy
                if (item.market_value != null) dataMap[key][`${facilityCode}_market_value`] = item.market_value
                if (item.power != null) dataMap[key][`${facilityCode}_power`] = item.power
                if (item.emissions != null) dataMap[key][`${facilityCode}_emissions`] = item.emissions

                // Calculate average DWP (Dollar per MWh) = Market Value / Energy
                if (item.energy != null && item.market_value != null && item.energy > 0) {
                    dataMap[key][`${facilityCode}_dwp`] = item.market_value / item.energy
                }
            })
        })

        return Object.values(dataMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    }, [data, selectedFacility])

    // Export to CSV
    const exportToCsv = useCallback(() => {
        if (!chartData.length || !selectedFacility) return

        const formatNumber = (num) => num != null ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
        const headers = ['Month', 'Energy (MWh)', 'Market Value ($)', 'Ave. Power (MW)', 'Emissions', 'Average DWP ($/MWh)']
        const rows = chartData.map(row => {
            return [
                row.month,
                formatNumber(row[`${selectedFacility}_energy`]),
                formatNumber(row[`${selectedFacility}_market_value`]),
                formatNumber(row[`${selectedFacility}_power`]),
                formatNumber(row[`${selectedFacility}_emissions`]),
                formatNumber(row[`${selectedFacility}_dwp`])
            ]
        })

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `generator_actuals_${selectedFacility}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }, [chartData, selectedFacility])

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null

        const formatValue = (dataKey, value) => {
            const formatNumber = (num) => num != null ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0'
            if (dataKey.includes('_energy')) return `${formatNumber(value)} MWh`
            if (dataKey.includes('_market_value')) return `$${formatNumber(value)}`
            if (dataKey.includes('_power')) return `${formatNumber(value)} MW`
            if (dataKey.includes('_emissions')) return `${formatNumber(value)}`
            if (dataKey.includes('_dwp')) return `$${formatNumber(value)}/MWh`
            return `${formatNumber(value)}`
        }

        const formatLabel = (dataKey) => {
            if (dataKey.includes('_energy')) return 'Energy'
            if (dataKey.includes('_market_value')) return 'Market Value'
            if (dataKey.includes('_power')) return 'Ave. Power'
            if (dataKey.includes('_emissions')) return 'Emissions'
            if (dataKey.includes('_dwp')) return 'Average DWP'
            return dataKey
        }

        return (
            <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                <p className="font-semibold text-gray-900 mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {formatLabel(entry.dataKey)}: {formatValue(entry.dataKey, entry.value)}
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
                        <h1 className="text-3xl font-bold text-gray-900">Generator Actuals</h1>
                        <p className="text-gray-600 mt-1">
                            Generator-specific time series data for {selectedFacility || 'selected facility'}
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

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-gray-600" />
                        Filters
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Facility Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Generator Facility
                        </label>

                        {/* Facility Dropdown */}
                        {facilitiesLoading ? (
                            <div className="text-sm text-gray-500">Loading facilities...</div>
                        ) : facilities.length === 0 ? (
                            <div className="text-sm text-gray-500">
                                No facilities list available. The dropdown will populate once facilities are loaded.
                            </div>
                        ) : (
                            <div>
                                <select
                                    value={selectedFacility}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        if (value) setSelectedFacility(value)
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm min-h-[120px]"
                                    size="5"
                                >
                                    {(() => {
                                        // Remove duplicates and sort facilities
                                        const filteredFacilities = facilities
                                            .filter((facility, index, self) =>
                                                index === self.findIndex(f => f.code === facility.code)
                                            )
                                            .sort((a, b) => {
                                                // Sort by name, then by code
                                                const nameA = (a.name || a.code || '').toLowerCase()
                                                const nameB = (b.name || b.code || '').toLowerCase()
                                                if (nameA !== nameB) return nameA.localeCompare(nameB)
                                                return (a.code || '').localeCompare(b.code || '')
                                            })

                                        return filteredFacilities.map((facility) => (
                                            <option
                                                key={facility.code}
                                                value={facility.code}
                                            >
                                                {facility.name || facility.code} ({facility.networkRegion || facility.region || '?'}, {facility.fueltech || '?'})
                                            </option>
                                        ))
                                    })()}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Select a facility to view its data (Default: WAUBRAWF)
                                </p>
                            </div>
                        )}
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

            {/* Selected Facility Details Table */}
            {selectedFacility && facilities.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-gray-600" />
                        Selected Facility Details
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fueltech</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity (MW)</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {(() => {
                                    const facility = facilities.find(f => f.code === selectedFacility)
                                    if (!facility) return null
                                    return (
                                        <tr key={selectedFacility} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{facility.code}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{facility.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{facility.networkRegion || facility.region || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{(facility.fueltech || '').replace(/_/g, ' ')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{facility.capacity ? facility.capacity.toLocaleString() : '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${facility.status === 'operating' ? 'bg-green-100 text-green-800' :
                                                    facility.status === 'committed' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {facility.status || '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
                        {selectedFacility} Generator Data
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
                                tickFormatter={(value) => value.toLocaleString()}
                                label={{
                                    value: 'Value',
                                    angle: -90,
                                    position: 'insideLeft',
                                    style: { fontSize: 12, fill: '#9CA3AF' }
                                }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => {
                                    if (value.includes('_energy')) return 'Energy (MWh)'
                                    if (value.includes('_market_value')) return 'Market Value ($)'
                                    if (value.includes('_power')) return 'Ave. Power (MW)'
                                    if (value.includes('_emissions')) return 'Emissions'
                                    if (value.includes('_dwp')) return 'Average DWP ($/MWh)'
                                    return value
                                }}
                            />
                            {(() => {
                                // Use selected facility for charts
                                // Display 5 metrics: energy, market_value, average power, emissions, and average DWP
                                if (!selectedFacility) return null
                                const metrics = [
                                    { key: `${selectedFacility}_energy`, label: 'Energy', color: '#3b82f6' },
                                    { key: `${selectedFacility}_market_value`, label: 'Market Value', color: '#10b981' },
                                    { key: `${selectedFacility}_power`, label: 'Ave. Power', color: '#f59e0b' },
                                    { key: `${selectedFacility}_emissions`, label: 'Emissions', color: '#ef4444' },
                                    { key: `${selectedFacility}_dwp`, label: 'Average DWP', color: '#8b5cf6' }
                                ]
                                return metrics.map(metric => (
                                    <Line
                                        key={`line-${metric.key}`}
                                        type="monotone"
                                        dataKey={metric.key}
                                        name={metric.label}
                                        stroke={metric.color}
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                ))
                            })()}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {selectedFacility} Generator Data Table
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
                                    {(() => {
                                        const metrics = [
                                            { key: 'energy', label: 'Energy (MWh)' },
                                            { key: 'market_value', label: 'Market Value ($)' },
                                            { key: 'power', label: 'Ave. Power (MW)' },
                                            { key: 'emissions', label: 'Emissions' },
                                            { key: 'dwp', label: 'Average DWP ($/MWh)' }
                                        ]
                                        return metrics.map(metric => (
                                            <th key={`header-${metric.key}`} className="text-right py-3 px-4 font-semibold text-gray-900">
                                                {metric.label}
                                            </th>
                                        ))
                                    })()}
                                </tr>
                            </thead>
                            <tbody>
                                {chartData.map((row, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium text-gray-900">{row.month}</td>
                                        {(() => {
                                            const formatNumber = (num) => num != null ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
                                            const metrics = [
                                                { key: `${selectedFacility}_energy`, format: (v) => formatNumber(v) },
                                                { key: `${selectedFacility}_market_value`, format: (v) => v != null ? `$${formatNumber(v)}` : '-' },
                                                { key: `${selectedFacility}_power`, format: (v) => formatNumber(v) },
                                                { key: `${selectedFacility}_emissions`, format: (v) => formatNumber(v) },
                                                { key: `${selectedFacility}_dwp`, format: (v) => v != null ? `$${formatNumber(v)}` : '-' }
                                            ]
                                            return metrics.map((metric, colIdx) => (
                                                <td key={`cell-${metric.key}-${idx}`} className="py-3 px-4 text-right text-gray-700">
                                                    {metric.format(row[metric.key])}
                                                </td>
                                            ))
                                        })()}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Facilities Table with Secondary Categories */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 flex items-center mb-2">
                            <MapPin className="w-6 h-6 mr-2 text-green-600" />
                            Generator Facilities List
                        </h3>
                        <p className="text-sm text-gray-600">
                            Complete list of facilities with secondary categories. Reference: <a href="https://docs.openelectricity.org.au/api-reference/data/get-network-data" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">API Documentation</a>
                        </p>
                    </div>
                    <div className="text-sm text-gray-600">
                        {(() => {
                            const filteredFacilities = facilities.filter(f => {
                                if (filterFueltech && f.fueltech !== filterFueltech) return false
                                if (filterFueltechGroup && f.fueltechGroup !== filterFueltechGroup) return false
                                if (filterStatus && f.status !== filterStatus) return false
                                if (filterRenewable && f.renewable !== filterRenewable) return false
                                return true
                            })
                            return `${filteredFacilities.length} of ${facilities.length} facilities`
                        })()}
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 pb-6 border-b border-gray-200">
                    {/* Fueltech Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fuel Technology
                        </label>
                        <select
                            value={filterFueltech}
                            onChange={(e) => setFilterFueltech(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        >
                            <option value="">All Fuel Technologies</option>
                            {(() => {
                                const fueltechs = [...new Set(facilities.map(f => f.fueltech).filter(Boolean))].sort()
                                return fueltechs.map(ft => (
                                    <option key={ft} value={ft}>{ft}</option>
                                ))
                            })()}
                        </select>
                    </div>

                    {/* Fueltech Group Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fueltech Group
                        </label>
                        <select
                            value={filterFueltechGroup}
                            onChange={(e) => setFilterFueltechGroup(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        >
                            <option value="">All Groups</option>
                            {(() => {
                                const groups = [...new Set(facilities.map(f => f.fueltechGroup).filter(Boolean))].sort()
                                return groups.map(fg => (
                                    <option key={fg} value={fg}>{fg}</option>
                                ))
                            })()}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                        </label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        >
                            <option value="">All Statuses</option>
                            {(() => {
                                const statuses = [...new Set(facilities.map(f => f.status).filter(Boolean))].sort()
                                return statuses.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))
                            })()}
                        </select>
                    </div>

                    {/* Renewable Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Renewable
                        </label>
                        <select
                            value={filterRenewable}
                            onChange={(e) => setFilterRenewable(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        >
                            <option value="">All</option>
                            <option value="renewable">Renewable</option>
                            <option value="non-renewable">Non-Renewable</option>
                        </select>
                    </div>
                </div>

                {/* Facilities Table */}
                {facilitiesLoading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
                        <p className="text-gray-600">Loading facilities...</p>
                    </div>
                ) : facilities.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No facilities available
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-gray-300 bg-gray-50">
                                    <th className="text-left py-4 px-4 font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10">Code</th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Name</th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Network</th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Region</th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Fuel Technology</th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Fueltech Group</th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Status</th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Renewable</th>
                                    <th className="text-right py-4 px-4 font-semibold text-gray-900">Capacity (MW)</th>
                                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const filteredFacilities = facilities.filter(f => {
                                        if (filterFueltech && f.fueltech !== filterFueltech) return false
                                        if (filterFueltechGroup && f.fueltechGroup !== filterFueltechGroup) return false
                                        if (filterStatus && f.status !== filterStatus) return false
                                        if (filterRenewable && f.renewable !== filterRenewable) return false
                                        return true
                                    }).sort((a, b) => {
                                        // Sort by name, then by code
                                        const nameA = (a.name || a.code || '').toLowerCase()
                                        const nameB = (b.name || b.code || '').toLowerCase()
                                        if (nameA !== nameB) return nameA.localeCompare(nameB)
                                        return (a.code || '').localeCompare(b.code || '')
                                    })

                                    return filteredFacilities.map((facility, idx) => (
                                        <tr key={facility.code || idx} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-white z-10">{facility.code || '-'}</td>
                                            <td className="py-3 px-4 text-gray-700">{facility.name || '-'}</td>
                                            <td className="py-3 px-4 text-gray-700">{facility.network || '-'}</td>
                                            <td className="py-3 px-4 text-gray-700">{facility.networkRegion || '-'}</td>
                                            <td className="py-3 px-4 text-gray-700">{facility.fueltech || '-'}</td>
                                            <td className="py-3 px-4 text-gray-700">{facility.fueltechGroup || '-'}</td>
                                            <td className="py-3 px-4 text-gray-700">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${facility.status === 'operating' ? 'bg-green-100 text-green-800' :
                                                    facility.status === 'retired' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {facility.status || '-'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-700">
                                                {facility.renewable ? (
                                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                        Renewable
                                                    </span>
                                                ) : facility.renewable === false ? (
                                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                                        Non-Renewable
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-right text-gray-700">
                                                {facility.capacity ? facility.capacity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-gray-700">{facility.location || '-'}</td>
                                        </tr>
                                    ))
                                })()}
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

