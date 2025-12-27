'use client'

// Asset Analysis Page - Compare PPA performance against market conditions
// Fetches generator data, market prices, demand/supply, and curtailment

import { useState, useEffect, useCallback } from 'react'
import {
    RefreshCw,
    AlertCircle,
    Loader2,
    Calendar,
    Download,
    TrendingUp,
    Activity,
    Zap
} from 'lucide-react'

export default function AssetAnalysePage() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [facilities, setFacilities] = useState([])
    const [facilitiesLoading, setFacilitiesLoading] = useState(true)
    const [selectedFacility, setSelectedFacility] = useState('WAUBRAWF')
    const [selectedDate, setSelectedDate] = useState(() => {
        // Default to yesterday
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        return yesterday.toISOString().split('T')[0]
    })

    // Fetch facilities list
    const fetchFacilities = useCallback(async () => {
        setFacilitiesLoading(true)
        try {
            const response = await fetch('/api/facilities?network_id=NEM&status_id=operating')
            if (response.ok) {
                const result = await response.json()
                setFacilities(result.facilities || [])
            }
        } catch (err) {
            console.error('Error fetching facilities:', err)
        } finally {
            setFacilitiesLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchFacilities()
    }, [fetchFacilities])

    // Fetch analysis data
    const fetchAnalysis = useCallback(async () => {
        if (!selectedFacility || !selectedDate) return

        setLoading(true)
        setError(null)

        try {
            const url = `/api/asset-analysis?facility_code=${selectedFacility}&date=${selectedDate}&interval=5m`
            const response = await fetch(url)

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || `HTTP error: ${response.status}`)
            }

            const result = await response.json()
            setData(result)
        } catch (err) {
            console.error('Error fetching analysis:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [selectedFacility, selectedDate])

    // Export to JSON
    const exportToJson = useCallback(() => {
        if (!data) return

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `asset_analysis_${selectedFacility}_${selectedDate}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }, [data, selectedFacility, selectedDate])

    // Calculate summary stats from data points
    const summaryStats = data?.dataPoints ? (() => {
        const points = data.dataPoints.filter(p => p.generator?.energy != null)
        if (points.length === 0) return null

        const totalEnergy = points.reduce((sum, p) => sum + (p.generator?.energy || 0), 0)
        const totalRevenue = points.reduce((sum, p) => sum + (p.generator?.market_value || 0), 0)
        const avgPrice = points.filter(p => p.market?.price != null).reduce((sum, p) => sum + p.market.price, 0) / points.filter(p => p.market?.price != null).length
        const assetAvgPrice = totalEnergy > 0 ? totalRevenue / totalEnergy : 0
        const windCurtailment = points.reduce((sum, p) => sum + (p.curtailment?.wind || 0), 0)

        return {
            totalEnergy: totalEnergy.toFixed(2),
            totalRevenue: totalRevenue.toFixed(2),
            avgMarketPrice: avgPrice.toFixed(2),
            avgAssetPrice: assetAvgPrice.toFixed(2),
            priceCapture: avgPrice > 0 ? ((assetAvgPrice / avgPrice) * 100).toFixed(1) : 'N/A',
            windCurtailment: windCurtailment.toFixed(2)
        }
    })() : null

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl font-bold text-gray-900">Asset Analysis</h1>
                        <p className="text-gray-600 mt-1">
                            Compare PPA performance against market conditions
                        </p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Facility Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Activity className="w-4 h-4 inline mr-1" />
                            Facility
                        </label>
                        {facilitiesLoading ? (
                            <div className="text-sm text-gray-500">Loading facilities...</div>
                        ) : (
                            <select
                                value={selectedFacility}
                                onChange={(e) => setSelectedFacility(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                                {facilities
                                    .filter((f, i, self) => i === self.findIndex(x => x.code === f.code))
                                    .sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code))
                                    .map(f => (
                                        <option key={f.code} value={f.code}>
                                            {f.name || f.code} ({f.networkRegion || f.region || '?'})
                                        </option>
                                    ))
                                }
                            </select>
                        )}
                    </div>

                    {/* Date Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Date (5-min data, last 8 days only)
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            min={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                    </div>

                    {/* Run Button */}
                    <div className="flex items-end">
                        <button
                            onClick={fetchAnalysis}
                            disabled={loading || !selectedFacility}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <TrendingUp className="w-5 h-5 mr-2" />
                            )}
                            {loading ? 'Fetching...' : 'Run Analysis'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                        <span className="text-red-700">{error}</span>
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            {summaryStats && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                        Day Summary - {data.facility} ({data.region})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Total Energy</div>
                            <div className="text-xl font-bold text-gray-900">{summaryStats.totalEnergy} MWh</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Total Revenue</div>
                            <div className="text-xl font-bold text-green-600">${Number(summaryStats.totalRevenue).toLocaleString()}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Avg Market Price</div>
                            <div className="text-xl font-bold text-gray-900">${summaryStats.avgMarketPrice}/MWh</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Asset Avg Price</div>
                            <div className="text-xl font-bold text-blue-600">${summaryStats.avgAssetPrice}/MWh</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Price Capture</div>
                            <div className={`text-xl font-bold ${parseFloat(summaryStats.priceCapture) >= 100 ? 'text-green-600' : 'text-orange-500'}`}>
                                {summaryStats.priceCapture}%
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500">Regional Wind Curtailed</div>
                            <div className="text-xl font-bold text-red-500">{summaryStats.windCurtailment} MWh</div>
                        </div>
                    </div>
                </div>
            )}

            {/* JSON Output */}
            {data && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Analysis Data ({data.summary?.totalDataPoints || 0} intervals)
                        </h3>
                        <button
                            onClick={exportToJson}
                            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            <Download className="w-4 h-4 mr-1" />
                            Download JSON
                        </button>
                    </div>

                    <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                        <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    )
}
