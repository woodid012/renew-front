'use client'

import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const PortfolioOutputPage = () => {
  const [assetIds, setAssetIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedField, setSelectedField] = useState('revenue');
  const [selectedPeriod, setSelectedPeriod] = useState('yearly');

  const [allAssetsSummaryData, setAllAssetsSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [errorSummary, setErrorSummary] = useState(null);

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
        const response = await fetch('/api/asset-output-data'); // Using the new API for asset IDs
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
    // Fetch all assets summary data when selectedField or selectedPeriod changes
    const fetchAllAssetsSummary = async () => {
      if (selectedField && selectedPeriod) {
        setLoadingSummary(true);
        setAllAssetsSummaryData(null);
        try {
          const url = `/api/all-assets-summary?period=${selectedPeriod}&field=${selectedField}`;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setAllAssetsSummaryData(data.data);
        } catch (err) {
          setErrorSummary(err.message);
        } finally {
          setLoadingSummary(false);
        }
      }
    };
    fetchAllAssetsSummary();
  }, [selectedField, selectedPeriod]);

  const handleFieldChange = (event) => {
    setSelectedField(event.target.value);
  };

  const handlePeriodChange = (event) => {
    setSelectedPeriod(event.target.value);
  };

  // Prepare summary chart data
  const summaryChartLabels = allAssetsSummaryData ? Object.keys(allAssetsSummaryData) : [];
  const summaryChartDatasets = assetIds.map(assetId => ({
    label: `Asset ${assetId}`,
    data: summaryChartLabels.map(label => allAssetsSummaryData[label][assetId] || 0),
    backgroundColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`,
  }));

  const summaryChartData = {
    labels: summaryChartLabels,
    datasets: summaryChartDatasets,
  };

  const summaryChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Total ${selectedField} by Asset and Period`,
      },
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: selectedPeriod ? 'Period' : 'Date',
        },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: selectedField,
        },
      },
    },
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Portfolio Output - Summary Across Assets</h1>

      <div className="mb-4 flex space-x-4">
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

      {loadingSummary && <p>Loading summary data...</p>}
      {errorSummary && <p className="text-red-500">Error: {errorSummary}</p>}

      {allAssetsSummaryData && Object.keys(allAssetsSummaryData).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Summary Chart (All Assets)</h2>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <Bar data={summaryChartData} options={summaryChartOptions} />
          </div>
        </div>
      )}

      {!allAssetsSummaryData && !loadingSummary && !errorSummary && (
        <p>Select a field and period to view the portfolio summary.</p>
      )}
    </div>
  );
};

export default PortfolioOutputPage;