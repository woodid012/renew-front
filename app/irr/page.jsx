"use client";

import React, { useEffect, useState } from 'react';

const IRRPage = () => {
  const [cashflows, setCashflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCashflows = async () => {
      try {
        const response = await fetch('/api/cashflows');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCashflows(data.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCashflows();
  }, []);

  if (loading) {
    return <div className="p-6 text-center">Loading IRR data...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">IRR Analysis</h1>
      {cashflows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Period</th>
                <th className="py-2 px-4 border-b">Project IRR</th>
                {/* Add more IRR-related columns as needed */}
              </tr>
            </thead>
            <tbody>
              {cashflows.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{item.period}</td>
                  <td className="py-2 px-4 border-b">{item.project_irr || 'N/A'}</td>
                  {/* Render more IRR-related data */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-700">No IRR data available.</p>
      )}
    </div>
  );
};

export default IRRPage;