"use client";

import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const PriceCurvesPage = () => { // Added comment to force re-compilation
  const [priceCurves, setPriceCurves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPriceCurves = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/price-curves');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        // Transform data for Recharts
        const transformedData = result.map(item => {
          const rawDate = item.date && item.date.$date ? item.date.$date : item.date;
          return {
            date: new Date(rawDate).toLocaleDateString(), // Format date for display
            price: item.price, // Assuming 'price' is the key for the price value
          };
        });
        setPriceCurves(transformedData);
        console.log("Price Curves Data:", transformedData); // Debug log
      } catch (e) {
        console.error("Error fetching price curves:", e);
        setError("Failed to load price curve data.");
      } finally {
        setLoading(false);
      }
    };

    fetchPriceCurves();
  }, []);

  if (loading) {
    return <div className="p-6 text-center">Loading Price Curve data...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Price Curves</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Merchant Prices Over Time</h2>
        <div className="shadow-md sm:rounded-lg p-4 bg-white" style={{ width: '100%', height: 400 }}>
          {priceCurves.length > 0 ? (
            <ResponsiveContainer>
              <LineChart
                data={priceCurves}
                margin={{
                  top: 20, right: 30, left: 20, bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="TIME" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Array.isArray(uniqueRegions) && uniqueRegions.length > 0 && uniqueRegions.map((region, index) => (
                  <Line
                    key={region}
                    type="monotone"
                    dataKey={region}
                    stroke={`hsl(${index * 60}, 70%, 50%)`} // Dynamic color for each region
                    activeDot={{ r: 8 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-700">No price curve data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceCurvesPage;
