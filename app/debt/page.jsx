"use client";

import React, { useEffect, useState } from 'react';

const DebtPage = () => {
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
    return <div className="p-6 text-center">Loading debt data...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Debt Analysis</h1>
      {cashflows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Period</th>
                <th className="py-2 px-4 border-b">Debt Service</th>
                <th className="py-2 px-4 border-b">Principal Repayment</th>
                <th className="py-2 px-4 border-b">Interest Payment</th>
                {/* Add more debt-related columns as needed */}
              </tr>
            </thead>
            <tbody>
              {cashflows.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{item.period}</td>
                  <td className="py-2 px-4 border-b">{item.debt_service || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{item.principal_repayment || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{item.interest_payment || 'N/A'}</td>
                  {/* Render more debt-related data */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-700">No debt data available.</p>
      )}
    </div>
  );
};

export default DebtPage;