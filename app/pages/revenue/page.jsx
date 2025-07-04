// app/pages/revenue/page.jsx
"use client"

import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'

export default function RevenuePage() {
  const [cashflows, setCashflows] = useState([])
  const [summaryData, setSummaryData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedAssetId, setSelectedAssetId] = useState('1') // Default to asset ID 1

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch summary data for stacked bar chart
        const summaryResponse = await fetch('/api/revenue-summary')
        if (!summaryResponse.ok) {
          throw new Error(`HTTP error! status: ${summaryResponse.status}`)
        }
        const summaryResult = await summaryResponse.json()
        setSummaryData(summaryResult)
        console.log("Summary Data:", summaryResult) // Debug log

      } catch (e) {
        console.error("Error fetching initial data:", e)
        setError("Failed to load initial data.")
      } finally {
        setLoading(false)
        console.log("Loading after initial fetch:", false) // Debug log
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (selectedAssetId) {
      const fetchCashflowsForAsset = async () => {
        setLoading(true)
        setError(null)
        try {
          const response = await fetch(`/api/asset-cashflows?asset_id=${selectedAssetId}`)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const result = await response.json()
          setCashflows(result.data)
          console.log("Cashflows Data:", result.data) // Debug log
        } catch (e) {
          setError(e.message)
          console.error("Error fetching cashflows:", e) // Debug log
        } finally {
          setLoading(false)
          console.log("Loading after cashflows fetch:", false) // Debug log
        }
      }

      fetchCashflowsForAsset()
    }
  }, [selectedAssetId])

  // Data for Stacked Bar Chart (Total Revenue by Asset Over Time)
  // Recharts expects an array of objects, where each object represents a data point
  // and keys within the object correspond to data keys for the bars.
  const transformedSummaryData = Array.isArray(summaryData) ? summaryData.map(item => {
    const newItem = { period: item.period }
    Object.keys(item).filter(key => key !== 'period').forEach(assetId => {
      newItem[`asset_${assetId}`] = item[assetId] || 0
    })
    return newItem
  }) : []

  const uniqueAssetIdsInSummary = Array.isArray(summaryData) ? Array.from(new Set(summaryData.flatMap(item => Object.keys(item).filter(key => key !== 'period')))).sort() : []

  // Data for Individual Asset Breakdown Charts
  // Recharts expects an array of objects, where each object represents a data point
  // and keys within the object correspond to data keys for the lines.
  const transformedCashflows = Array.isArray(cashflows) ? cashflows.map(item => ({
    date: new Date(item.date.$date || item.date).toLocaleDateString(), // Format date for display
    contracted_revenue: (item.contractedEnergyRevenue || 0) + (item.contractedGreenRevenue || 0),
    uncontracted_revenue: (item.merchantEnergyRevenue || 0) + (item.merchantGreenRevenue || 0),
    green_revenue: (item.merchantGreenRevenue || 0) + (item.contractedGreenRevenue || 0),
    black_revenue: (item.merchantEnergyRevenue || 0) + (item.contractedEnergyRevenue || 0),
  })) : []

  const refreshData = () => {
    setLoading(true)
    setError(null)
    // Trigger refetch
    const event = new Event('refreshData')
    window.dispatchEvent(event)
  }

  if (loading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <span className="text-gray-600">Loading revenue data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Revenue Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={refreshData}
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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Revenue Analysis</h1>
            <p className="text-gray-600 mt-2">
              Analyze revenue performance across your asset portfolio
            </p>
          </div>
          <button
            onClick={refreshData}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Asset Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Asset for Detailed Analysis
        </label>
        <select
          value={selectedAssetId}
          onChange={(e) => setSelectedAssetId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          <option value="1">Asset 1</option>
          <option value="2">Asset 2</option>
          <option value="3">Asset 3</option>
          <option value="4">Asset 4</option>
          <option value="5">Asset 5</option>
        </select>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Total Revenue by Asset (Stacked Bar Chart)</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ width: '100%', height: 400 }}>
          {transformedSummaryData.length > 0 ? (
            <ResponsiveContainer>
              <BarChart
                data={transformedSummaryData}
                margin={{
                  top: 20, right: 30, left: 20, bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                {uniqueAssetIdsInSummary.map((assetId, index) => (
                  <Bar
                    key={`asset_bar_${assetId}`}
                    dataKey={`asset_${assetId}`}
                    stackId="a"
                    fill={`hsl(${index * 60}, 70%, 60%)`}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">No summary revenue data available.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Contracted Revenue for Asset {selectedAssetId}</h2>
          {transformedCashflows.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={transformedCashflows}
                margin={{
                  top: 5, right: 30, left: 20, bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="contracted_revenue" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-75 flex items-center justify-center">
              <p className="text-gray-500">No detailed revenue data available for selected asset ID.</p>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Uncontracted Revenue for Asset {selectedAssetId}</h2>
          {transformedCashflows.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={transformedCashflows}
                margin={{
                  top: 5, right: 30, left: 20, bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="uncontracted_revenue" stroke="#82ca9d" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-75 flex items-center justify-center">
              <p className="text-gray-500">No detailed revenue data available for selected asset ID.</p>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Green Revenue for Asset {selectedAssetId}</h2>
          {transformedCashflows.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={transformedCashflows}
                margin={{
                  top: 5, right: 30, left: 20, bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="green_revenue" stroke="#ffc658" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-75 flex items-center justify-center">
              <p className="text-gray-500">No detailed revenue data available for selected asset ID.</p>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Black Revenue for Asset {selectedAssetId}</h2>
          {transformedCashflows.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={transformedCashflows}
                margin={{
                  top: 5, right: 30, left: 20, bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="black_revenue" stroke="#ff7300" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-75 flex items-center justify-center">
              <p className="text-gray-500">No detailed revenue data available for selected asset ID.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}