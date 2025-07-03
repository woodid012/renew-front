"use client";

import React, { useEffect, useState } from 'react';

const CashflowPage = () => {
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
    return <div className="p-6 text-center">Loading Cashflow data...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Cashflow</h1>
      {cashflows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Period</th>
                <th className="py-2 px-4 border-b">Operating Cashflow</th>
                <th className="py-2 px-4 border-b">Investing Cashflow</th>
                <th className="py-2 px-4 border-b">Financing Cashflow</th>
                <th className="py-2 px-4 border-b">Net Cashflow</th>
                {/* Add more cashflow-related columns as needed */}
              </tr>
            </thead>
            <tbody>
              {cashflows.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{item.period}</td>
                  <td className="py-2 px-4 border-b">{item.operating_cashflow || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{item.investing_cashflow || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{item.financing_cashflow || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{item.net_cashflow || 'N/A'}</td>
                  {/* Render more cashflow-related data */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-700">No Cashflow data available.</p>
      )}
    </div>
  );
};

export default CashflowPage;