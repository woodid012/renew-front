
'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TimeSeriesPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedVariable, setSelectedVariable] = useState('');
  const [summaryPeriod, setSummaryPeriod] = useState('annual');
  const [aggregationType, setAggregationType] = useState('sum');

  const balanceSheetItems = [
    'fixed_assets', 'debt', 'share_capital', 'retained_earnings', 'cash',
    'total_assets', 'total_liabilities', 'net_assets', 'equity', 'cumulative_d_and_a'
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/wip-timeseries');
        const result = await res.json();
        if (res.ok) {
          setData(result.data);
          if (result.data.length > 0) {
            const assetIds = [...new Set(result.data.map(item => item.asset_id))];
            setSelectedAssetId(assetIds[0]);
            const variables = Object.keys(result.data[0] || {}).filter(key => typeof result.data[0][key] === 'number' && key !== 'asset_id');
            setSelectedVariable(variables[0]);
          }
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Failed to fetch data');
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const assetIds = [...new Set(data.map(item => item.asset_id))];
  const variables = data.length > 0 ? Object.keys(data[0] || {}).filter(key => typeof data[0][key] === 'number' && key !== 'asset_id') : [];

  const filteredData = selectedAssetId ? data.filter(item => item.asset_id == selectedAssetId) : [];

  const getFiscalYear = (date) => {
    return date.getMonth() >= 3 ? date.getFullYear() + 1 : date.getFullYear();
  };

  const getQuarter = (date) => {
    return Math.floor(date.getMonth() / 3) + 1;
  }

  const summaryData = filteredData.reduce((acc, item) => {
    const date = new Date(item.date);
    let key;
    switch (summaryPeriod) {
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarterly':
        key = `${date.getFullYear()}-Q${getQuarter(date)}`;
        break;
      case 'fiscal_year':
        key = `FY${getFiscalYear(date)}`;
        break;
      case 'annual':
      default:
        key = date.getFullYear().toString();
        break;
    }

    if (!acc[key]) {
      acc[key] = { ...item, date: key, [selectedVariable]: 0, count: 0 };
    }
    acc[key][selectedVariable] += item[selectedVariable];
    acc[key].count++;
    return acc;
  }, {});

  const isBalanceSheetItem = balanceSheetItems.includes(selectedVariable);
  const finalAggregationType = isBalanceSheetItem ? 'average' : aggregationType;

  const chartData = Object.values(summaryData).map(item => {
    if (finalAggregationType === 'average') {
      return { ...item, [selectedVariable]: item[selectedVariable] / item.count };
    }
    return item;
  });

  const tableData = chartData.reduce((acc, item) => {
    acc[item.date] = item[selectedVariable];
    return acc;
  }, {});

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">WIP Time Series</h1>

      <div className="flex space-x-4 mb-4">
        <div>
          <label htmlFor="asset-select" className="block text-sm font-medium text-gray-700">Asset ID</label>
          <select
            id="asset-select"
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {assetIds.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="variable-select" className="block text-sm font-medium text-gray-700">Variable</label>
          <select
            id="variable-select"
            value={selectedVariable}
            onChange={(e) => setSelectedVariable(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {variables.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="period-select" className="block text-sm font-medium text-gray-700">Summary Period</label>
          <select
            id="period-select"
            value={summaryPeriod}
            onChange={(e) => setSummaryPeriod(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Calendar Year</option>
            <option value="fiscal_year">Fiscal Year</option>
          </select>
        </div>
        <div>
          <label htmlFor="agg-select" className="block text-sm font-medium text-gray-700">Aggregation</label>
          <select
            id="agg-select"
            value={aggregationType}
            onChange={(e) => setAggregationType(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            disabled={isBalanceSheetItem}
          >
            <option value="sum">Sum</option>
            <option value="average">Average</option>
          </select>
        </div>
      </div>

      {isBalanceSheetItem && (
        <p className="text-sm text-gray-500 mb-4">Note: Balance sheet items are always averaged.</p>
      )}

      {selectedAssetId && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Asset ID: {selectedAssetId} - {selectedVariable}</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={selectedVariable} stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-2">Summary Table</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{selectedVariable}</th>
                {Object.keys(tableData).map(period => (
                  <th key={period} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{period}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{selectedVariable}</td>
                {Object.values(tableData).map((value, index) => (
                  <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{value.toLocaleString()}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TimeSeriesPage;
