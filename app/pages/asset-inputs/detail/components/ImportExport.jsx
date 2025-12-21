// app/pages/asset-inputs/detail/components/ImportExport.jsx
'use client'

import { useState } from 'react';
import { 
  Download, 
  Upload, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Database
} from 'lucide-react';
import { useDisplaySettings } from '@/app/context/DisplaySettingsContext';
import { formatCurrencyFromMillions } from '@/app/utils/currencyFormatter';

const ImportExport = ({ 
  assets, 
  setAssets, 
  constants, 
  setConstants,
  platformName,
  setPlatformName,
  setHasUnsavedChanges 
}) => {
  const { currencyUnit } = useDisplaySettings();
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  const exportToJson = () => {
    const exportData = {
      version: "3.0",
      exportDate: new Date().toISOString(),
      platformName: platformName,
      dataSource: "MongoDB Asset Management",
      assets: assets,
      constants: constants,
      metadata: {
        totalAssets: Object.keys(assets).length,
        totalCapacity: Object.values(assets).reduce((sum, asset) => sum + (parseFloat(asset.capacity) || 0), 0),
        lastModified: new Date().toISOString()
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${platformName.replace(/\s+/g, '_').toLowerCase()}_assets_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportStatus(null);

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate the import data structure
      if (!importData.assets || typeof importData.assets !== 'object') {
        throw new Error('Invalid file format: missing or invalid assets data');
      }

      // Import the data
      setAssets(importData.assets);
      
      if (importData.constants) {
        setConstants(importData.constants);
      }
      
      if (importData.platformName) {
        setPlatformName(importData.platformName);
      }

      setHasUnsavedChanges(true);
      setImportStatus({
        type: 'success',
        message: `Successfully imported ${Object.keys(importData.assets).length} assets`,
        details: importData.metadata || {}
      });

    } catch (error) {
      setImportStatus({
        type: 'error',
        message: 'Failed to import file',
        details: { error: error.message }
      });
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const exportToCsv = () => {
    const assetArray = Object.values(assets);
    if (assetArray.length === 0) {
      alert('No assets to export');
      return;
    }

    // Define CSV headers
    const headers = [
      'id', 'name', 'region', 'type', 'capacity', 'volume', 'durationHours', 'assetLife',
      'volumeLossAdjustment', 'annualDegradation', 'constructionStartDate',
      'constructionDuration', 'OperatingStartDate', 'qtrCapacityFactor_q1',
      'qtrCapacityFactor_q2', 'qtrCapacityFactor_q3', 'qtrCapacityFactor_q4',
      'contractsCount'
    ];

    // Convert assets to CSV format
    const csvData = assetArray.map(asset => {
      return headers.map(header => {
        if (header === 'contractsCount') {
          return asset.contracts?.length || 0;
        }
        const value = asset[header];
        // Handle commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',');
    });

    // Create CSV content
    const csvContent = [headers.join(','), ...csvData].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${platformName.replace(/\s+/g, '_').toLowerCase()}_assets_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateStats = () => {
    const assetArray = Object.values(assets);
    return {
      totalAssets: assetArray.length,
      totalCapacity: assetArray.reduce((sum, asset) => sum + (parseFloat(asset.capacity) || 0), 0),
      totalContracts: assetArray.reduce((sum, asset) => sum + (asset.contracts?.length || 0), 0),
      byType: assetArray.reduce((acc, asset) => {
        acc[asset.type] = (acc[asset.type] || 0) + 1;
        return acc;
      }, {}),
      totalValue: Object.values(constants.assetCosts || {}).reduce((sum, costs) => sum + (costs.capex || 0), 0)
    };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Current Portfolio Summary */}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Current Portfolio Summary</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{stats.totalAssets}</div>
            <div className="text-sm text-gray-600">Total Assets</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{stats.totalCapacity.toFixed(1)} MW</div>
            <div className="text-sm text-gray-600">Total Capacity</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{stats.totalContracts}</div>
            <div className="text-sm text-gray-600">Total Contracts</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrencyFromMillions(stats.totalValue, currencyUnit)}
            </div>
            <div className="text-sm text-gray-600">Total CAPEX</div>
          </div>
        </div>

        {Object.keys(stats.byType).length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Asset Types:</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byType).map(([type, count]) => (
                <span key={type} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {type}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Download className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Export Portfolio</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Export as JSON</h4>
            <p className="text-sm text-gray-600 mb-4">
              Export complete portfolio data including assets, cost assumptions, and contracts in JSON format.
            </p>
            <button
              onClick={exportToJson}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Export as CSV</h4>
            <p className="text-sm text-gray-600 mb-4">
              Export asset data in CSV format for use in spreadsheet applications.
            </p>
            <button
              onClick={exportToCsv}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Upload className="w-6 h-6 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Import Portfolio</h3>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Important Notes</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• Importing will replace all current assets in your working copy</li>
                <li>• Only JSON files exported from this system are supported</li>
                <li>• Remember to save changes after importing to persist to MongoDB</li>
                <li>• Consider exporting your current data first as a backup</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Import from JSON</h4>
          <p className="text-sm text-gray-600 mb-4">
            Import portfolio data from a previously exported JSON file.
          </p>
          
          <div className="space-y-4">
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              disabled={importing}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            />
            
            {importing && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Importing data...</span>
              </div>
            )}
          </div>
        </div>

        {/* Import Status */}
        {importStatus && (
          <div className={`mt-4 p-4 rounded-lg border ${
            importStatus.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start space-x-3">
              {importStatus.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className={`font-medium ${
                  importStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {importStatus.message}
                </h4>
                {importStatus.details && (
                  <div className={`text-sm mt-1 ${
                    importStatus.type === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {importStatus.type === 'success' ? (
                      <div>
                        {importStatus.details.totalAssets && (
                          <p>Total Assets: {importStatus.details.totalAssets}</p>
                        )}
                        {importStatus.details.totalCapacity && (
                          <p>Total Capacity: {importStatus.details.totalCapacity} MW</p>
                        )}
                      </div>
                    ) : (
                      <p>{importStatus.details.error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportExport;











