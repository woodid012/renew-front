// app/pages/output-asset/page.jsx
'use client'

import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { 
  TrendingUp, 
  Download, 
  Calendar, 
  Building2, 
  BarChart3,
  Filter,
  Loader2,
  AlertCircle,
  Eye,
  DollarSign,
  Activity
} from 'lucide-react';

Chart.register(...registerables);

const AssetOutputPage = () => {
  const [assetIds, setAssetIds] = useState([]);
  const [assetIdToNameMap, setAssetIdToNameMap] = useState({});
  const [selectedAssetId, setSelectedAssetId] = useState('1');
  const [assetData, setAssetData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedField, setSelectedField] = useState('revenue');
  const [selectedPeriod, setSelectedPeriod] = useState('yearly');

  const fieldsToPlot = [
    { key: 'revenue', label: 'Total Revenue', category: 'Revenue', color: '#10b981' },
    { key: 'contractedGreenRevenue', label: 'Contracted Green Revenue', category: 'Revenue', color: '#22c55e' },
    { key: 'contractedEnergyRevenue', label: 'Contracted Energy Revenue', category: 'Revenue', color: '#06b6d4' },
    { key: 'merchantGreenRevenue', label: 'Merchant Green Revenue', category: 'Revenue', color: '#84cc16' },
    { key: 'merchantEnergyRevenue', label: 'Merchant Energy Revenue', category: 'Revenue', color: '#06b6d4' },
    { key: 'monthlyGeneration', label: 'Monthly Generation', category: 'Generation', color: '#f59e0b' },
    { key: 'avgGreenPrice', label: 'Avg Green Price', category: 'Pricing', color: '#22c55e' },
    { key: 'avgEnergyPrice', label: 'Avg Energy Price', category: 'Pricing', color: '#06b6d4' },
    { key: 'opex', label: 'Operating Expenses', category: 'Costs', color: '#ef4444' },
    { key: 'capex', label: 'Capital Expenditure', category: 'Costs', color: '#dc2626' },
    { key: 'equity_capex', label: 'Equity CAPEX', category: 'Finance', color: '#8b5cf6' },
    { key: 'debt_capex', label: 'Debt CAPEX', category: 'Finance', color: '#6366f1' },
    { key: 'cfads', label: 'CFADS', category: 'Cash Flow', color: '#10b981' },
    { key: 'debt_service', label: 'Debt Service', category: 'Finance', color: '#ef4444' },
    { key: 'equity_cash_flow', label: 'Equity Cash Flow', category: 'Cash Flow', color: '#8b5cf6' },
    { key: 'net_income', label: 'Net Income', category: 'Profitability', color: '#059669' }
  ];

  const periods = [
    { key: 'monthly', label: 'Monthly', icon: Calendar },
    { key: 'quarterly', label: 'Quarterly', icon: Calendar },
    { key: 'yearly', label: 'Yearly', icon: Calendar },
    { key: 'fiscal_yearly', label: 'Fiscal Year', icon: Calendar }
  ];

  useEffect(() => {
    const fetchAssetIds = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/output-asset-data');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAssetIds(data.uniqueAssetIds.map(asset => ({ id: asset._id, name: asset.name })));
        const newMap = {};
        data.uniqueAssetIds.forEach(asset => {
          newMap[asset._id] = asset.name;
        });
        setAssetIdToNameMap(newMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAssetIds();
  }, []);

  useEffect(() => {
    const fetchAssetData = async () => {
      if (selectedAssetId) {
        setLoading(true);
        setAssetData([]);
        try {
          const url = `/api/output-asset-data?asset_id=${selectedAssetId}${selectedPeriod ? `&period=${selectedPeriod}` : ''}`;
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

  const selectedFieldData = fieldsToPlot.find(f => f.key === selectedField);

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
        label: selectedFieldData?.label || selectedField,
        data: assetData.map(item => item[selectedField]),
        fill: false,
        backgroundColor: selectedFieldData?.color || '#10b981',
        borderColor: selectedFieldData?.color || '#10b981',
        borderWidth: 3,
        pointBackgroundColor: selectedFieldData?.color || '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: selectedFieldData?.color || '#10b981',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(context) {
            return `Period: ${context[0].label}`;
          },
          label: function(context) {
            const value = context.parsed.y;
            if (selectedField.includes('Price')) {
              return `${selectedFieldData?.label}: $${value.toLocaleString()}`;
            } else if (selectedField.includes('Generation')) {
              return `${selectedFieldData?.label}: ${value.toLocaleString()} MWh`;
            } else {
              return `${selectedFieldData?.label}: $${(value / 1000000).toFixed(2)}M`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Period',
          font: {
            size: 14,
            weight: 'bold'
          },
          color: '#374151'
        },
        grid: {
          color: '#f3f4f6',
          borderColor: '#e5e7eb'
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12
          }
        }
      },
      y: {
        title: {
          display: true,
          text: selectedFieldData?.label || selectedField,
          font: {
            size: 14,
            weight: 'bold'
          },
          color: '#374151'
        },
        grid: {
          color: '#f9fafb',
          borderColor: '#e5e7eb'
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12
          },
          callback: function(value) {
            if (selectedField.includes('Price')) {
              return `$${value.toLocaleString()}`;
            } else if (selectedField.includes('Generation')) {
              return `${(value / 1000).toFixed(0)}k`;
            } else {
              return `$${(value / 1000000).toFixed(1)}M`;
            }
          }
        }
      },
    },
  };

  // Calculate summary metrics
  const summaryMetrics = assetData.length > 0 ? {
    total: assetData.reduce((sum, item) => sum + (item[selectedField] || 0), 0),
    average: assetData.reduce((sum, item) => sum + (item[selectedField] || 0), 0) / assetData.length,
    max: Math.max(...assetData.map(item => item[selectedField] || 0)),
    min: Math.min(...assetData.map(item => item[selectedField] || 0))
  } : null;

  const formatMetricValue = (value) => {
    if (selectedField.includes('Price')) {
      return `$${value.toLocaleString()}`;
    } else if (selectedField.includes('Generation')) {
      return `${(value / 1000).toFixed(1)}k MWh`;
    } else {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
  };

  // Group fields by category
  const fieldsByCategory = fieldsToPlot.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {});

  if (loading && assetIds.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <span className="text-gray-600">Loading asset data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Asset Cash Flow Analysis</h1>
            <p className="text-gray-600 mt-2">Detailed financial performance analysis by asset and time period</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  {assetData.length} data points
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Analysis Configuration</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Building2 className="w-4 h-4 inline mr-1" />
              Select Asset
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
            >
              <option value="">-- Select an Asset --</option>
              {assetIds.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {assetIdToNameMap[asset.id]} ({asset.id})
                </option>
              ))}
            </select>
          </div>

          {/* Period Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Calendar className="w-4 h-4 inline mr-1" />
              Time Period
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              {periods.map((period) => (
                <option key={period.key} value={period.key}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>

          {/* Metric Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <BarChart3 className="w-4 h-4 inline mr-1" />
              Financial Metric
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
            >
              {Object.entries(fieldsByCategory).map(([category, fields]) => (
                <optgroup key={category} label={category}>
                  {fields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">Error: {error}</span>
          </div>
        </div>
      )}

      {loading && selectedAssetId && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-blue-800">Loading asset data...</span>
          </div>
        </div>
      )}

      {/* Chart */}
      {assetData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: selectedFieldData?.color || '#10b981' }}
              ></div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedFieldData?.label || selectedField} - {assetIdToNameMap[selectedAssetId]}
              </h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {selectedFieldData?.category}
              </span>
            </div>
            <button
              onClick={handleExportCsv}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
          
          <div style={{ width: '100%', height: '400px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {!selectedAssetId && !loading && !error && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Asset to Begin</h3>
          <p className="text-gray-600">Choose an asset from the dropdown above to view its cash flow analysis</p>
        </div>
      )}
    </div>
  );
};

export default AssetOutputPage;