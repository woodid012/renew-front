"use client";

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const RevenuePage = () => {
  const [cashflows, setCashflows] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAssetId, setSelectedAssetId] = useState('1'); // Default to asset ID 1

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch summary data for stacked bar chart
        const summaryResponse = await fetch('/api/revenue-summary');
        if (!summaryResponse.ok) {
          throw new Error(`HTTP error! status: ${summaryResponse.status}`);
        }
        const summaryResult = await summaryResponse.json();
        setSummaryData(summaryResult);
        console.log("Summary Data:", summaryResult); // Debug log

      } catch (e) {
        console.error("Error fetching initial data:", e);
        setError("Failed to load initial data.");
      } finally {
        setLoading(false);
        console.log("Loading after initial fetch:", false); // Debug log
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedAssetId) {
      const fetchCashflowsForAsset = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/asset-cashflows?asset_id=${selectedAssetId}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const result = await response.json();
          setCashflows(result.data);
          console.log("Cashflows Data:", result.data); // Debug log
        } catch (e) {
          setError(e.message);
          console.error("Error fetching cashflows:", e); // Debug log
        } finally {
          setLoading(false);
          console.log("Loading after cashflows fetch:", false); // Debug log
        }
      };

      fetchCashflowsForAsset();
    }
  }, [selectedAssetId]);

  // Data for Stacked Bar Chart (Total Revenue by Asset Over Time)
  // Recharts expects an array of objects, where each object represents a data point
  // and keys within the object correspond to data keys for the bars.
  const transformedSummaryData = Array.isArray(summaryData) ? summaryData.map(item => {
    const newItem = { period: item.period };
    Object.keys(item).filter(key => key !== 'period').forEach(assetId => {
      newItem[`asset_${assetId}`] = item[assetId] || 0;
    });
    return newItem;
  }) : [];

  const uniqueAssetIdsInSummary = Array.isArray(summaryData) ? Array.from(new Set(summaryData.flatMap(item => Object.keys(item).filter(key => key !== 'period')))).sort() : [];

  // Data for Individual Asset Breakdown Charts
  // Recharts expects an array of objects, where each object represents a data point
  // and keys within the object correspond to data keys for the lines.
  const transformedCashflows = Array.isArray(cashflows) ? cashflows.map(item => ({
    date: new Date(item.date.$date).toLocaleDateString(), // Format date for display
    contracted_revenue: item.contractedEnergyRevenue + item.contractedGreenRevenue,
    uncontracted_revenue: item.merchantEnergyRevenue + item.merchantGreenRevenue,
    green_revenue: item.merchantGreenRevenue + item.contractedGreenRevenue,
    black_revenue: item.merchantEnergyRevenue + item.contractedEnergyRevenue,
  })) : [];

  if (loading) {
    return <div className="p-6 text-center">Loading Revenue data...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Revenue Analysis</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Total Revenue by Asset (Stacked Bar Chart)</h2>
        <div className="shadow-md sm:rounded-lg p-4 bg-white" style={{ width: '100%', height: 400 }}>
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
            <p className="text-gray-700">No summary revenue data available.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="shadow-md sm:rounded-lg p-4 bg-white">
          <h2 className="text-2xl font-semibold mb-4">Contracted Revenue for {selectedAssetId}</h2>
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
            <p className="text-gray-700">No detailed revenue data available for selected asset ID.</p>
          )}
        </div>
        <div className="shadow-md sm:rounded-lg p-4 bg-white">
          <h2 className="text-2xl font-semibold mb-4">Uncontracted Revenue for {selectedAssetId}</h2>
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
            <p className="text-gray-700">No detailed revenue data available for selected asset ID.</p>
          )}
        </div>
        <div className="shadow-md sm:rounded-lg p-4 bg-white">
          <h2 className="text-2xl font-semibold mb-4">Green Revenue for {selectedAssetId}</h2>
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
            <p className="text-gray-700">No detailed revenue data available for selected asset ID.</p>
          )}
        </div>
        <div className="shadow-md sm:rounded-lg p-4 bg-white">
          <h2 className="text-2xl font-semibold mb-4">Black Revenue for {selectedAssetId}</h2>
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
            <p className="text-gray-700">No detailed revenue data available for selected asset ID.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RevenuePage;