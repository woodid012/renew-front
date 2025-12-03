// app/pages/asset_3/components/BulkEdit.jsx
'use client'

import { useState } from 'react';
import { Table, Edit, Save, X } from 'lucide-react';

const BulkEdit = ({ 
  assets, 
  setAssets, 
  constants, 
  setConstants, 
  setHasUnsavedChanges 
}) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  const assetArray = Object.values(assets);
  
  const handleCellEdit = (assetId, field, value) => {
    setAssets(prev => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleCostEdit = (assetName, field, value) => {
    setConstants(prev => ({
      ...prev,
      assetCosts: {
        ...prev.assetCosts,
        [assetName]: {
          ...prev.assetCosts[assetName],
          [field]: parseFloat(value) || 0
        }
      }
    }));
    setHasUnsavedChanges(true);
  };

  const startEdit = (assetId, field, currentValue) => {
    setEditingCell(`${assetId}-${field}`);
    setEditValue(currentValue || '');
  };

  const saveEdit = (assetId, field) => {
    handleCellEdit(assetId, field, editValue);
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const renderEditableCell = (asset, field, value) => {
    const cellKey = `${asset.id}-${field}`;
    const isEditing = editingCell === cellKey;

    if (isEditing) {
      return (
        <div className="flex items-center space-x-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full p-1 text-xs border border-gray-300 rounded"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') saveEdit(asset.id, field);
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <button onClick={() => saveEdit(asset.id, field)} className="text-green-600 hover:text-green-800">
            <Save className="w-3 h-3" />
          </button>
          <button onClick={cancelEdit} className="text-red-600 hover:text-red-800">
            <X className="w-3 h-3" />
          </button>
        </div>
      );
    }

    return (
      <div 
        className="cursor-pointer hover:bg-gray-100 p-1 rounded"
        onClick={() => startEdit(asset.id, field, value)}
      >
        {value || '-'}
      </div>
    );
  };

  const renderEditableCostCell = (assetName, field, value, displayValue) => {
    const cellKey = `cost-${assetName}-${field}`;
    const isEditing = editingCell === cellKey;

    if (isEditing) {
      return (
        <div className="flex items-center space-x-1">
          <input
            type="number"
            step="0.1"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full p-1 text-xs border border-gray-300 rounded"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCostEdit(assetName, field, editValue);
                setEditingCell(null);
                setEditValue('');
              }
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <button 
            onClick={() => {
              handleCostEdit(assetName, field, editValue);
              setEditingCell(null);
              setEditValue('');
            }} 
            className="text-green-600 hover:text-green-800"
          >
            <Save className="w-3 h-3" />
          </button>
          <button onClick={cancelEdit} className="text-red-600 hover:text-red-800">
            <X className="w-3 h-3" />
          </button>
        </div>
      );
    }

    return (
      <div 
        className="cursor-pointer hover:bg-gray-100 p-1 rounded"
        onClick={() => {
          setEditingCell(cellKey);
          setEditValue(value || '');
        }}
      >
        {displayValue || '-'}
      </div>
    );
  };

  if (assetArray.length === 0) {
    return (
      <div className="text-center py-12">
        <Table className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No assets to edit</h3>
        <p className="text-gray-600">Add some assets first to use bulk editing features</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Bulk Edit Mode</h3>
        <p className="text-sm text-blue-700">
          Click on any cell to edit values directly. Changes are saved automatically to your local working copy.
          Remember to use the "Save Changes" button to persist to the database.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operating Start</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Life</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume Loss %</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Annual Degradation</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assetArray.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                    {renderEditableCell(asset, 'name', asset.name)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                    {renderEditableCell(asset, 'region', asset.region || asset.state)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                    {renderEditableCell(asset, 'type', asset.type)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                    {renderEditableCell(asset, 'capacity', asset.capacity)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                    {asset.type === 'storage' ? renderEditableCell(asset, 'volume', asset.volume) : '-'}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                    {renderEditableCell(asset, 'OperatingStartDate', asset.OperatingStartDate || asset.assetStartDate)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                    {renderEditableCell(asset, 'assetLife', asset.assetLife)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                    {renderEditableCell(asset, 'volumeLossAdjustment', asset.volumeLossAdjustment)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                    {renderEditableCell(asset, 'annualDegradation', asset.annualDegradation)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Assumptions Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Cost Assumptions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CAPEX ($M)</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OPEX ($M)</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Gearing</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Rate</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenor (years)</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Terminal Value</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DSCR - Contracted</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DSCR - Merchant</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assetArray.map((asset) => {
                const costs = constants.assetCosts?.[asset.name] || {};
                return (
                  <tr key={`costs-${asset.id}`} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">{asset.name}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      {renderEditableCostCell(asset.name, 'capex', costs.capex, costs.capex || '-')}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      {renderEditableCostCell(asset.name, 'operatingCosts', costs.operatingCosts, costs.operatingCosts || '-')}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      {renderEditableCostCell(asset.name, 'maxGearing', costs.maxGearing, costs.maxGearing ? (costs.maxGearing * 100).toFixed(0) + '%' : '-')}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      {renderEditableCostCell(asset.name, 'interestRate', costs.interestRate, costs.interestRate ? (costs.interestRate * 100).toFixed(1) + '%' : '-')}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      {renderEditableCostCell(asset.name, 'tenorYears', costs.tenorYears, costs.tenorYears || '-')}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      {renderEditableCostCell(asset.name, 'terminalValue', costs.terminalValue, costs.terminalValue || '-')}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      {renderEditableCostCell(asset.name, 'targetDSCRContract', costs.targetDSCRContract, costs.targetDSCRContract ? `${costs.targetDSCRContract}x` : '-')}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      {renderEditableCostCell(asset.name, 'targetDSCRMerchant', costs.targetDSCRMerchant, costs.targetDSCRMerchant ? `${costs.targetDSCRMerchant}x` : '-')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BulkEdit;