import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const AssetOutputPage = () => {
  const [assetIds, setAssetIds] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState('1');
  const [assetData, setAssetData] = useState([]); // Now an array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedField, setSelectedField] = useState('revenue'); // New state for selected field
  const [selectedPeriod, setSelectedPeriod] = useState('yearly'); // New state for selected period, default to yearly

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
        const response = await fetch('/api/asset-output-data');
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
    // Fetch asset data when selectedAssetId or selectedPeriod changes
    const fetchAssetData = async () => {
      if (selectedAssetId) {
        setLoading(true);
        setAssetData([]); // Clear previous data
        try {
          const url = `/api/asset-output-data?asset_id=${selectedAssetId}${selectedPeriod ? `&period=${selectedPeriod}` : ''}`;
          const response = await fetch(url);
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
  }, [selectedAssetId, selectedPeriod]);

  const handleAssetIdChange = (event) => {
    setSelectedAssetId(event.target.value);
  };

  const handleFieldChange = (event) => {
    setSelectedField(event.target.value);
  };

  const handlePeriodChange = (event) => {
    setSelectedPeriod(event.target.value);
  };

  const handleExportCsv = () => {
    if (!assetData || assetData.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = ["Period", selectedField];
    const rows = chartData.labels.map((label, index) => [
      label,
      chartData.datasets[0].data[index],
    ]);

    let csvContent = headers.join(",") + "\n";
    rows.forEach((row) => {
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `asset_${selectedAssetId}_${selectedField}_${selectedPeriod || 'raw'}_data.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Prepare chart data
  const chartData = {
    labels: assetData.map(item => {
      if (selectedPeriod === 'monthly') {
        return `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      } else if (selectedPeriod === 'quarterly') {
        return `${item._id.year}-Q${item._id.quarter}`;
      } else if (selectedPeriod === 'yearly') {
        return `${item._id.year}`;
      } else if (selectedPeriod === 'fiscal_yearly') {
        return `FY${item._id.fiscalYear}`;
      } else {
        return new Date(item.date).toLocaleDateString();
      }
    }),
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
          text: selectedPeriod ? 'Period' : 'Date',
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
      <h1 className="text-2xl font-bold mb-4">Asset Output - Asset Cash Flows</h1>

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

        <div className="flex-1">
          <label htmlFor="period-select" className="block text-sm font-medium text-gray-700">Aggregate By:</label>
          <select
            id="period-select"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={selectedPeriod}
            onChange={handlePeriodChange}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
            <option value="fiscal_yearly">Fiscal Year</option>
          </select>
        </div>
      </div>

      {loading && <p>Loading data...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {assetData.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Time Series Chart (Selected Asset)</h2>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <Line data={chartData} options={chartOptions} />
            <button
              onClick={handleExportCsv}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Export Chart Data to CSV
            </button>
          </div>
        </div>
      )}

      {!selectedAssetId && !loading && !error && (
        <p>Please select an Asset ID to view its cash flow data and chart.</p>
      )}
    </div>
  );
};

export default AssetOutputPage;