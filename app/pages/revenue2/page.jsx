import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const Revenue2Page = () => {
  const [assetIds, setAssetIds] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [assetData, setAssetData] = useState([]); // Now an array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedField, setSelectedField] = useState('revenue'); // New state for selected field

  const fieldsToPlot = [
    'revenue',
    'contractedGreenRevenue',
    'contractedEnergyRevenue',
    'merchantGreenRevenue',
    'merchantEnergyRevenue',
    'monthlyGeneration',
    'avgGreenPrice',
    'avgEnergyPrice',
    'opex',
    'capex',
    'equity_capex',
    'debt_capex',
    'beginning_balance',
    'drawdowns',
    'interest',
    'principal',
    'ending_balance',
    'd_and_a',
    'cfads',
    'debt_service',
    'ebit',
    'ebt',
    'tax_expense',
    'net_income',
    'terminal_value',
    'equity_cash_flow',
    'equity_injection',
    'cumulative_capex',
    'cumulative_d_and_a',
    'fixed_assets',
    'debt',
    'share_capital',
    'retained_earnings',
    'cash',
    'total_assets',
    'total_liabilities',
    'net_assets',
    'equity',
    'distributions',
    'dividends',
    'redistributed_capital',
  ];

  useEffect(() => {
    // Fetch unique asset IDs on component mount
    const fetchAssetIds = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/revenue2-data');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAssetIds(data.uniqueAssetIds);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAssetIds();
  }, []);

  useEffect(() => {
    // Fetch asset data when selectedAssetId changes
    const fetchAssetData = async () => {
      if (selectedAssetId) {
        setLoading(true);
        setAssetData([]); // Clear previous data
        try {
          const response = await fetch(`/api/revenue2-data?asset_id=${selectedAssetId}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setAssetData(data.data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchAssetData();
  }, [selectedAssetId]);

  const handleAssetIdChange = (event) => {
    setSelectedAssetId(event.target.value);
  };

  const handleFieldChange = (event) => {
    setSelectedField(event.target.value);
  };

  // Prepare chart data
  const chartData = {
    labels: assetData.map(item => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: selectedField,
        data: assetData.map(item => item[selectedField]),
        fill: false,
        backgroundColor: 'rgb(75, 192, 192)',
        borderColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Time Series for ${selectedField}`,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        title: {
          display: true,
          text: selectedField,
        },
      },
    },
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Revenue2 Page - Asset Cash Flows</h1>

      <div className="mb-4 flex space-x-4">
        <div className="flex-1">
          <label htmlFor="asset-select" className="block text-sm font-medium text-gray-700">Select Asset ID:</label>
          <select
            id="asset-select"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={selectedAssetId}
            onChange={handleAssetIdChange}
          >
            <option value="">-- Select an Asset ID --</option>
            {assetIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label htmlFor="field-select" className="block text-sm font-medium text-gray-700">Select Field to Plot:</label>
          <select
            id="field-select"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={selectedField}
            onChange={handleFieldChange}
          >
            {fieldsToPlot.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p>Loading data...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {assetData.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Time Series Chart</h2>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {assetData.length > 0 && (
        <div className="mt-8 overflow-x-auto">
          <h2 className="text-xl font-bold mb-4">Raw Data</h2>
          <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                {Object.keys(assetData[0]).map((key) => (
                  <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assetData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Object.values(row).map((value, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{JSON.stringify(value)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!selectedAssetId && !loading && !error && (
        <p>Please select an Asset ID to view its cash flow data and chart.</p>
      )}
    </div>
  );
};

export default Revenue2Page;