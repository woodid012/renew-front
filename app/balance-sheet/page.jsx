"use client";

import React, { useEffect, useState } from 'react';

const BalanceSheetPage = () => {
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
    return <div className="p-6 text-center">Loading Balance Sheet data...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Balance Sheet</h1>
      {cashflows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Period</th>
                <th className="py-2 px-4 border-b">Assets</th>
                <th className="py-2 px-4 border-b">Liabilities</th>
                <th className="py-2 px-4 border-b">Equity</th>
                {/* Add more balance sheet-related columns as needed */}
              </tr>
            </thead>
            <tbody>
              {cashflows.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{item.period}</td>
                  <td className="py-2 px-4 border-b">{item.assets || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{item.liabilities || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{item.equity || 'N/A'}</td>
                  {/* Render more balance sheet-related data */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-700">No Balance Sheet data available.</p>
      )}
    </div>
  );
};

export default BalanceSheetPage;