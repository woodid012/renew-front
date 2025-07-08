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
  DollarSign
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
        // Set default selected asset if available
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

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '-';
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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

  const renderTable = (title, fields) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <Table className="w-5 h-5 mr-2 text-green-600" />{title}
      </h3>
      {forecastData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                {forecastData.map((item, index) => (
                  <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getPeriodLabel(item)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.map((field, fieldIndex) => (
                <tr key={fieldIndex}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{field.label}</td>
                  {forecastData.map((item, itemIndex) => (
                    <td key={itemIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatCurrency(item[field.key])}
                    </td>
                  ))}
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

  const profitAndLossFields = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'opex', label: 'Operating Expenses' },
    { key: 'd_and_a', label: 'Depreciation & Amortization' },
    { key: 'ebit', label: 'EBIT' },
    { key: 'interest', label: 'Interest Expense' },
    { key: 'ebt', label: 'EBT' },
    { key: 'tax_expense', label: 'Tax Expense' },
    { key: 'net_income', label: 'Net Income' },
  ];

  const balanceSheetFields = [
    { key: 'cash', label: 'Cash' },
    { key: 'fixed_assets', label: 'Fixed Assets' },
    { key: 'total_assets', label: 'Total Assets' },
    { key: 'debt', label: 'Debt' },
    { key: 'total_liabilities', label: 'Total Liabilities' },
    { key: 'equity', label: 'Equity' },
    { key: 'share_capital', label: 'Share Capital' },
    { key: 'retained_earnings', label: 'Retained Earnings' },
  ];

  const cashFlowStatementFields = [
    { key: 'net_income', label: 'Net Income (from P&L)' },
    { key: 'd_and_a', label: 'Depreciation & Amortization (Non-cash)' },
    { key: 'capex', label: 'Capital Expenditure' },
    { key: 'equity_injection', label: 'Equity Injection' },
    { key: 'distributions', label: 'Distributions' },
    { key: 'dividends', label: 'Dividends' },
    { key: 'debt_service', label: 'Debt Service' },
    { key: 'drawdowns', label: 'Debt Drawdowns' },
    { key: 'principal', label: 'Principal Repayments' },
    { key: 'cfads', label: 'CFADS' },
    { key: 'equity_cash_flow', label: 'Equity Cash Flow' },
  ];

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
            <p className="text-gray-600 mt-2">View integrated Profit & Loss, Balance Sheet, and Cash Flow statements</p>
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
          {renderTable('Profit & Loss Statement', profitAndLossFields)}
          {renderTable('Balance Sheet', balanceSheetFields)}
          {renderTable('Cash Flow Statement', cashFlowStatementFields)}
        </>
      )}
    </div>
  );
};

export default ThreeWayForecastPage;