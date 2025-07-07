// app/pages/portfolio-output/page.jsx
'use client'

import { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
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
  Activity,
  PieChart,
  Grid3X3,
  Users,
  Zap
} from 'lucide-react';

Chart.register(...registerables);

const PortfolioOutputPage = () => {
  const [assetIds, setAssetIds] = useState([]);
  const [assetIdToNameMap, setAssetIdToNameMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedField, setSelectedField] = useState('revenue');
  const [selectedPeriod, setSelectedPeriod] = useState('yearly');
  const [chartType, setChartType] = useState('stacked'); // 'stacked', 'line', 'individual'
  const [allAssetsSummaryData, setAllAssetsSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [errorSummary, setErrorSummary] = useState(null);

  const fieldsToPlot = [
    { key: 'revenue', label: 'Total Revenue', category: 'Revenue', color: '#10b981' },
    { key: 'contractedGreenRevenue', label: 'Contracted Green Revenue', category: 'Revenue', color: '#22c55e' },
    { key: 'contractedEnergyRevenue', label: 'Contracted Energy Revenue', category: 'Revenue', color: '#06b6d4' },
    { key: 'merchantGreenRevenue', label: 'Merchant Green Revenue', category: 'Revenue', color: '#84cc16' },
    { key: 'merchantEnergyRevenue', label: 'Merchant Energy Revenue', category: 'Revenue', color: '#06b6d4' },
    { key: 'monthlyGeneration', label: 'Monthly Generation', category: 'Generation', color: '#f59e0b' },
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

  const chartTypes = [
    { key: 'stacked', label: 'Stacked Bar', icon: BarChart3 },
    { key: 'line', label: 'Line Chart', icon: TrendingUp },
    { key: 'individual', label: 'Individual Bars', icon: Grid3X3 }
  ];

  useEffect(() => {
    const fetchAssetIds = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/asset-output-data');
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
    const fetchAllAssetsSummary = async () => {
      if (selectedField && selectedPeriod) {
        setLoadingSummary(true);
        setAllAssetsSummaryData(null);
        setErrorSummary(null);
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

  const handleExportCsv = () => {
    if (!allAssetsSummaryData || Object.keys(allAssetsSummaryData).length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = ["Period", ...summaryChartData.datasets.map(d => d.label)];
    const rows = summaryChartData.labels.map(label => {
      const rowData = [label];
      summaryChartData.datasets.forEach(dataset => {
        const assetId = dataset.assetId;
        rowData.push(allAssetsSummaryData[label][assetId] || 0);
      });
      return rowData;
    });

    let csvContent = headers.join(",") + "\n";
    rows.forEach((row) => {
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `portfolio_${selectedField}_${selectedPeriod}_data.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Generate colors for assets
  const generateColors = (count) => {
    const baseColors = [
      '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  };

  // Prepare summary chart data
  const summaryChartLabels = allAssetsSummaryData ? Object.keys(allAssetsSummaryData).sort() : [];
  const colors = generateColors(assetIds.length);
  
  const summaryChartDatasets = assetIds.map((asset, index) => ({
    label: assetIdToNameMap[asset.id],
    assetId: asset.id,
    data: summaryChartLabels.map(label => allAssetsSummaryData[label][asset.id] || 0),
    backgroundColor: colors[index],
    borderColor: colors[index],
    borderWidth: chartType === 'line' ? 3 : 0,
    fill: false,
    tension: 0.4,
    pointBackgroundColor: colors[index],
    pointBorderColor: '#ffffff',
    pointBorderWidth: 2,
    pointRadius: chartType === 'line' ? 4 : 0,
  }));

  const summaryChartData = {
    labels: summaryChartLabels,
    datasets: summaryChartDatasets,
  };

  const selectedFieldData = fieldsToPlot.find(f => f.key === selectedField);

  const summaryChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: selectedFieldData?.color || '#10b981',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          title: function(context) {
            return `Period: ${context[0].label}`;
          },
          label: function(context) {
            const value = context.parsed.y;
            const assetName = context.dataset.label;
            if (selectedField.includes('Generation')) {
              return `${assetName}: ${(value / 1000).toFixed(1)}k MWh`;
            } else {
              return `${assetName}: $${(value / 1000000).toFixed(2)}M`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        stacked: chartType === 'stacked',
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
        stacked: chartType === 'stacked',
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
            if (selectedField.includes('Generation')) {
              return `${(value / 1000).toFixed(0)}k`;
            } else {
              return `$${(value / 1000000).toFixed(1)}M`;
            }
          }
        }
      },
    },
  };

  // Calculate portfolio summary metrics
  const portfolioMetrics = allAssetsSummaryData ? {
    totalPeriods: summaryChartLabels.length,
    totalAssets: assetIds.length,
    grandTotal: summaryChartLabels.reduce((total, period) => {
      return total + Object.values(allAssetsSummaryData[period]).reduce((periodTotal, value) => periodTotal + value, 0);
    }, 0),
    averagePerPeriod: summaryChartLabels.length > 0 ? summaryChartLabels.reduce((total, period) => {
      return total + Object.values(allAssetsSummaryData[period]).reduce((periodTotal, value) => periodTotal + value, 0);
    }, 0) / summaryChartLabels.length : 0,
    topPerformingAsset: (() => {
      let maxTotal = 0;
      let topAsset = null;
      assetIds.forEach(asset => {
        const assetTotal = summaryChartLabels.reduce((total, period) => {
          return total + (allAssetsSummaryData[period][asset.id] || 0);
        }, 0);
        if (assetTotal > maxTotal) {
          maxTotal = assetTotal;
          topAsset = { ...asset, total: assetTotal };
        }
      });
      return topAsset;
    })()
  } : null;

  const formatMetricValue = (value) => {
    if (selectedField.includes('Generation')) {
      return `${(value / 1000000).toFixed(1)}M MWh`;
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
          <span className="text-gray-600">Loading portfolio data...</span>
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
            <h1 className="text-3xl font-bold text-gray-900">Portfolio Performance Analysis</h1>
            <p className="text-gray-600 mt-2">Comprehensive portfolio-wide financial performance across all assets</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  {assetIds.length} assets
                </span>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  {summaryChartLabels.length} periods
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
          <h3 className="text-lg font-semibold text-gray-900">Portfolio Analysis Configuration</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

          {/* Chart Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <PieChart className="w-4 h-4 inline mr-1" />
              Chart Type
            </label>
            <div className="space-y-2">
              {chartTypes.map((type) => (
                <button
                  key={type.key}
                  onClick={() => setChartType(type.key)}
                  className={`w-full p-2 text-sm rounded-lg border transition-colors flex items-center space-x-2 ${
                    chartType === type.key
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <type.icon className="w-4 h-4" />
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Export Button */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Download className="w-4 h-4 inline mr-1" />
              Export Data
            </label>
            <button
              onClick={handleExportCsv}
              disabled={!allAssetsSummaryData || Object.keys(allAssetsSummaryData).length === 0}
              className="w-full flex items-center justify-center space-x-2 p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {errorSummary && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">Error: {errorSummary}</span>
          </div>
        </div>
      )}

      {loadingSummary && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-blue-800">Loading portfolio data...</span>
          </div>
        </div>
      )}

      {/* Chart */}
      {allAssetsSummaryData && Object.keys(allAssetsSummaryData).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: selectedFieldData?.color || '#10b981' }}
              ></div>
              <h3 className="text-lg font-semibold text-gray-900">
                Portfolio {selectedFieldData?.label || selectedField} Analysis
              </h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {selectedFieldData?.category}
              </span>
              <span className="text-sm text-blue-500 bg-blue-100 px-2 py-1 rounded">
                {chartTypes.find(t => t.key === chartType)?.label}
              </span>
            </div>
          </div>
          
          <div style={{ width: '100%', height: '500px' }}>
            {chartType === 'line' ? (
              <Line data={summaryChartData} options={summaryChartOptions} />
            ) : (
              <Bar data={summaryChartData} options={summaryChartOptions} />
            )}
          </div>
        </div>
      )}

      {!allAssetsSummaryData && !loadingSummary && !errorSummary && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Portfolio Analysis Ready</h3>
          <p className="text-gray-600">Select a metric and time period to view comprehensive portfolio performance</p>
        </div>
      )}
    </div>
  );
};

export default PortfolioOutputPage;