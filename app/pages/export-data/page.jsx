'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const ExportDataPage = () => {
  const [assetIds, setAssetIds] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedGranularity, setSelectedGranularity] = useState('monthly');
  const [selectedVariables, setSelectedVariables] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);

  const availableCashflowVariables = [
    'revenue',
    'opex',
    'net_income',
    'cfads',
    'debt_service',
    'equity_cash_flow',
    'capex',
    'debt_drawdown',
    'debt_repayment',
    'interest_expense',
    'depreciation',
    'taxable_income',
    'tax_paid',
  ];

  useEffect(() => {
    const fetchAssetIds = async () => {
      try {
        const response = await fetch('/api/asset-ids');
        if (!response.ok) {
          throw new Error('Failed to fetch asset IDs');
        }
        const data = await response.json();
        const mappedAssetIds = data.map(asset => ({ id: asset._id, name: asset.name }));
        setAssetIds(['all', ...mappedAssetIds]); // Add 'all' option
        setSelectedAssetId('all'); // Default to 'all'
      } catch (error) {
        console.error('Error fetching asset IDs:', error);
        setExportStatus({ type: 'error', message: `Failed to load asset IDs: ${error.message}` });
      }
    };
    fetchAssetIds();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    setExportStatus(null);

    try {
      const params = new URLSearchParams({
        granularity: selectedGranularity,
        variables: selectedVariables.join(','),
      });

      if (selectedAssetId !== 'all') {
        params.append('assetId', selectedAssetId);
      }

      const response = await fetch(`/api/export-data?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.length === 0) {
        setExportStatus({
          type: 'warning',
          message: 'No data found for the selected criteria.',
        });
        return;
      }

      // Convert JSON to CSV
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => {
          const value = row[fieldName];
          // Handle commas and quotes in values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `cashflows_${selectedAssetId !== 'all' ? selectedAssetId + '_' : ''}${selectedGranularity}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportStatus({
        type: 'success',
        message: 'Data exported successfully!',
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      setExportStatus({
        type: 'error',
        message: `Failed to export data: ${error.message}`,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Export Cash Flow Data</h1>
      <p className="text-gray-600">Select criteria to export cash flow data from the database.</p>

      <div className="bg-white rounded-lg shadow border p-6 space-y-4">
        <div>
          <label htmlFor="asset-id" className="block text-sm font-medium text-gray-700 mb-1">
            Select Asset ID:
          </label>
          <select
            id="asset-id"
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
          >
            {assetIds.map((asset) => (
              <option key={typeof asset === 'string' ? asset : asset.id} value={typeof asset === 'string' ? asset : asset.id}>
                {typeof asset === 'string' ? 'All Assets' : `${asset.name} (${asset.id})`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="granularity" className="block text-sm font-medium text-gray-700 mb-1">
            Time Granularity:
          </label>
          <select
            id="granularity"
            value={selectedGranularity}
            onChange={(e) => setSelectedGranularity(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Variables:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {availableCashflowVariables.map((variable) => (
              <div key={variable} className="flex items-center">
                <input
                  id={variable}
                  type="checkbox"
                  checked={selectedVariables.includes(variable)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedVariables([...selectedVariables, variable]);
                    } else {
                      setSelectedVariables(selectedVariables.filter((v) => v !== variable));
                    }
                  }}
                  className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
                />
                <label htmlFor={variable} className="ml-2 block text-sm text-gray-900 capitalize">
                  {variable.replace(/_/g, ' ')}
                </label>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting || selectedVariables.length === 0}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>{exporting ? 'Exporting...' : 'Export Data'}</span>
        </button>

        {exportStatus && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            exportStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            exportStatus.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
            'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {exportStatus.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportDataPage;
