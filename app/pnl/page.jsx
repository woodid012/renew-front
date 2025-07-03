"use client";

import React, { useEffect, useState } from 'react';

const PnLPage = () => {
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
    return <div className="p-6 text-center">Loading P&L data...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Profit & Loss</h1>
      {cashflows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Period</th>
                <th className="py-2 px-4 border-b">Revenue</th>
                <th className="py-2 px-4 border-b">Operating Expenses</th>
                <th className="py-2 px-4 border-b">Depreciation</th>
                <th className="py-2 px-4 border-b">EBIT</th>
                <th className="py-2 px-4 border-b">Interest Expense</th>
                <th className="py-2 px-4 border-b">Taxable Income</th>
                <th className="py-2 px-4 border-b">Tax</th>
                <th className="py-2 px-4 border-b">Net Income</th>
              </tr>
            </thead>
            <tbody>
              {cashflows.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{item.period}</td>
                  <td className="py-2 px-4 border-b">{item.revenue || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{item.operating_expenses || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{item.depreciation || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{item.ebit || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{item.interest_expense || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{item.taxable_income || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{item.tax || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{item.net_income || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-700">No P&L data available.</p>
      )}
    </div>
  );
};

export default PnLPage;