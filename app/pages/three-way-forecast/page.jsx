// app/pages/three-way-forecast/page.jsx
'use client'

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Building2, 
  Filter,
  Loader2,
  AlertCircle,
  Eye,
  Table,
  DollarSign,
  TrendingUp,
  PieChart,
  BarChart3
} from 'lucide-react';

const ThreeWayForecastPage = () => {
  const [assetIds, setAssetIds] = useState([]);
  const [assetIdToNameMap, setAssetIdToNameMap] = useState({});
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('yearly');

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
        const response = await fetch('/api/three-way-forecast');
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
        if (data.uniqueAssetIds.length > 0) {
          setSelectedAssetId(data.uniqueAssetIds[0]._id.toString());
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAssetIds();
  }, []);

  useEffect(() => {
    const fetchForecastData = async () => {
      if (selectedAssetId) {
        setLoading(true);
        setForecastData([]);
        try {
          const url = `/api/three-way-forecast?asset_id=${selectedAssetId}${selectedPeriod ? `&period=${selectedPeriod}` : ''}`;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setForecastData(data.data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchForecastData();
  }, [selectedAssetId, selectedPeriod]);

  const formatCurrency = (value, fieldKey = '') => {
    if (value === undefined || value === null || value === 0) return { display: '-', isNegative: false };
    
    // Fields that should be displayed as negative (expenses/outflows) even if stored as positive
    const expenseFields = [
      'opex', 'interest', 'tax_expense', 'capex', 'principal', 'distributions', 
      'dividends', 'redistributed_capital', 'd_and_a'
    ];
    
    let displayValue = value;
    
    // Convert expense fields to negative for display if they're positive in data
    if (expenseFields.includes(fieldKey) && value > 0) {
      displayValue = -value;
    }
    
    const isNegative = displayValue < 0;
    const formattedValue = Math.abs(displayValue).toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
    
    const display = isNegative ? `(${formattedValue})` : formattedValue;
    
    return { display, isNegative };
  };

  const getPeriodLabel = (item) => {
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
  };

  const renderTable = (title, fields, icon) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        {icon}
        {title}
      </h3>
      {forecastData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Metric
                </th>
                {forecastData.map((item, index) => (
                  <th key={index} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    {getPeriodLabel(item)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.map((field, fieldIndex) => (
                <tr key={fieldIndex} className={field.isSubtotal ? 'bg-gray-50 font-semibold' : ''}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${field.isSubtotal ? 'font-semibold' : 'font-medium'} text-gray-900 sticky left-0 bg-white z-10 border-r`}>
                    {field.indent && <span className="ml-4" />}
                    {field.label}
                  </td>
                  {forecastData.map((item, itemIndex) => {
                    const { display, isNegative } = formatCurrency(item[field.key], field.key);
                    return (
                      <td key={itemIndex} className={`px-6 py-4 whitespace-nowrap text-sm text-center ${
                        isNegative ? 'text-red-600' : 'text-gray-700'
                      } ${field.isSubtotal ? 'font-semibold bg-gray-50' : ''}`}>
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-600">No data available for this selection.</p>
      )}
    </div>
  );

  // Enhanced field definitions with proper expense formatting
  const profitAndLossFields = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'opex', label: 'Operating Expenses', indent: true }, // Will show as negative
    { key: 'ebitda', label: 'EBITDA', isSubtotal: true },
    { key: 'd_and_a', label: 'Depreciation & Amortization', indent: true }, // Will show as negative
    { key: 'ebit', label: 'EBIT', isSubtotal: true },
    { key: 'interest', label: 'Interest Expense', indent: true }, // Will show as negative
    { key: 'ebt', label: 'Earnings Before Tax', isSubtotal: true },
    { key: 'tax_expense', label: 'Tax Expense', indent: true }, // Will show as negative
    { key: 'net_income', label: 'Net Income', isSubtotal: true },
  ];

  const balanceSheetFields = [
    // Assets
    { key: 'cash', label: 'Cash & Cash Equivalents' },
    { key: 'fixed_assets', label: 'Property, Plant & Equipment (net)' },
    { key: 'total_assets', label: 'Total Assets', isSubtotal: true },
    // Liabilities
    { key: 'debt', label: 'Long-term Debt' },
    { key: 'total_liabilities', label: 'Total Liabilities', isSubtotal: true },
    // Equity
    { key: 'share_capital', label: 'Share Capital' },
    { key: 'retained_earnings', label: 'Retained Earnings' },
    { key: 'equity', label: 'Total Equity', isSubtotal: true },
  ];

  const cashFlowStatementFields = [
    // Operating Activities
    { key: 'net_income', label: 'Net Income' },
    { key: 'd_and_a', label: 'Add: Depreciation & Amortization', indent: true }, // Will show as negative but added back
    { key: 'operating_cash_flow', label: 'Cash Flow from Operating Activities', isSubtotal: true },
    
    // Investing Activities
    { key: 'capex', label: 'Capital Expenditures', indent: true }, // Will show as negative (cash outflow)
    { key: 'terminal_value', label: 'Terminal Value Proceeds', indent: true },
    { key: 'investing_cash_flow', label: 'Cash Flow from Investing Activities', isSubtotal: true },
    
    // Financing Activities
    { key: 'drawdowns', label: 'Debt Drawdowns', indent: true }, // Positive (cash inflow)
    { key: 'interest', label: 'Interest Payments', indent: true }, // Will show as negative (cash outflow)
    { key: 'principal', label: 'Principal Repayments', indent: true }, // Will show as negative (cash outflow)
    { key: 'equity_injection', label: 'Equity Contributions', indent: true }, // Positive (cash inflow)
    { key: 'distributions', label: 'Distributions to Equity', indent: true }, // Will show as negative (cash outflow)
    { key: 'dividends', label: '  - Dividends', indent: true }, // Will show as negative (cash outflow)
    { key: 'redistributed_capital', label: '  - Capital Returns', indent: true }, // Will show as negative (cash outflow)
    { key: 'financing_cash_flow', label: 'Cash Flow from Financing Activities', isSubtotal: true },
    
    // Net Cash Flow
    { key: 'net_cash_flow', label: 'Net Change in Cash', isSubtotal: true },
    
    // CRITICAL FIX: Show both pre and post distribution equity cash flows
    { key: 'equity_cash_flow_pre_distributions', label: 'Equity Cash Flow (Pre-Distributions)', isSubtotal: true },
    { key: 'equity_cash_flow', label: 'Equity Cash Flow (Post-Distributions)', isSubtotal: true },
  ];

  const handleExportCsv = () => {
    if (forecastData.length === 0) return;

    const allKeys = new Set();
    forecastData.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys).sort();

    const rows = forecastData.map(item => {
      return headers.map(header => {
        const value = item[header];
        if (typeof value === 'number') {
          return value;
        }
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return value;
      }).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_forecast_${selectedAssetId}_${selectedPeriod}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

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
            <h1 className="text-3xl font-bold text-gray-900">3-Way Financial Forecast</h1>
            <p className="text-gray-600 mt-2">Integrated Profit & Loss, Balance Sheet, and Cash Flow statements</p>
            {selectedAssetId && (
              <div className="mt-2 text-sm text-gray-500">
                Asset: <span className="font-medium">{assetIdToNameMap[selectedAssetId]} ({selectedAssetId})</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  {forecastData.length} periods
                </span>
              </div>
            </div>
            <button
              onClick={handleExportCsv}
              disabled={forecastData.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Analysis Configuration</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <span className="text-blue-800">Loading financial data...</span>
          </div>
        </div>
      )}

      {!selectedAssetId && !loading && !error && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Asset to Begin</h3>
          <p className="text-gray-600">Choose an asset from the dropdown above to view its 3-way financial forecast</p>
        </div>
      )}

      {selectedAssetId && forecastData.length > 0 && (
        <>
          {renderTable('Profit & Loss Statement', profitAndLossFields, <TrendingUp className="w-5 h-5 mr-2 text-green-600" />)}
          {renderTable('Balance Sheet', balanceSheetFields, <PieChart className="w-5 h-5 mr-2 text-blue-600" />)}
          {renderTable('Cash Flow Statement', cashFlowStatementFields, <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />)}
        </>
      )}
    </div>
  );
};

export default ThreeWayForecastPage;