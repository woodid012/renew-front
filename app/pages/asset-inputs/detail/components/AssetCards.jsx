// app/pages/asset-inputs/detail/components/AssetCards.jsx
'use client'

import { useState } from 'react';
import { 
  Edit, 
  Trash2, 
  Copy,
  Sun,
  Wind,
  BatteryFull,
  Plus,
  Save,
  X,
  Zap
} from 'lucide-react';
import { useDisplaySettings } from '@/app/context/DisplaySettingsContext';
import { formatCurrencyFromMillions } from '@/app/utils/currencyFormatter';

const AssetCards = ({ 
  assets, 
  constants,
  setConstants,
  setHasUnsavedChanges,
  onEdit, 
  onDelete, 
  onDuplicate,
  onAddNew
}) => {
  const { currencyUnit } = useDisplaySettings();
  const [editingCost, setEditingCost] = useState(null);
  const [editValue, setEditValue] = useState('');
  const getAssetIcon = (type) => {
    switch (type) {
      case 'solar': return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'wind': return <Wind className="w-5 h-5 text-blue-500" />;
      case 'storage': return <BatteryFull className="w-5 h-5 text-green-500" />;
      default: return <Zap className="w-5 h-5 text-gray-500" />;
    }
  };

  const calculateTotalCapacity = () => {
    return Object.values(assets).reduce((sum, asset) => sum + (parseFloat(asset.capacity) || 0), 0);
  };

  const calculateTotalValue = () => {
    return Object.values(constants.assetCosts || {}).reduce((sum, costs) => sum + (costs.capex || 0), 0);
  };

  const handleCostEdit = (assetName, field, value) => {
    // Handle percentage fields (maxGearing, interestRate) - convert from percentage to decimal
    let processedValue = parseFloat(value) || 0;
    if (field === 'maxGearing' || field === 'interestRate') {
      processedValue = processedValue / 100;
    }
    
    setConstants(prev => ({
      ...prev,
      assetCosts: {
        ...prev.assetCosts,
        [assetName]: {
          ...prev.assetCosts[assetName],
          [field]: processedValue
        }
      }
    }));
    setHasUnsavedChanges(true);
  };

  const startCostEdit = (assetName, field, value, rawValue) => {
    setEditingCost(`${assetName}-${field}`);
    // For percentage fields, show the percentage value for editing
    if (field === 'maxGearing' || field === 'interestRate') {
      setEditValue(rawValue !== undefined && rawValue !== null ? (rawValue * 100).toString() : '');
    } else {
      setEditValue(rawValue !== undefined && rawValue !== null ? rawValue.toString() : '');
    }
  };

  const saveCostEdit = (assetName, field) => {
    handleCostEdit(assetName, field, editValue);
    setEditingCost(null);
    setEditValue('');
  };

  const cancelCostEdit = () => {
    setEditingCost(null);
    setEditValue('');
  };

  const renderEditableCostField = (assetName, field, value, displayValue, suffix = '', rawValue = null) => {
    const cellKey = `${assetName}-${field}`;
    const isEditing = editingCost === cellKey;
    const actualRawValue = rawValue !== null ? rawValue : value;

    if (isEditing) {
      return (
        <div className="flex items-center space-x-1">
          <input
            type="number"
            step={field === 'maxGearing' || field === 'interestRate' ? '0.01' : field === 'operatingCostEscalation' ? '0.1' : '0.01'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full p-1 text-xs border border-gray-300 rounded"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') saveCostEdit(assetName, field);
              if (e.key === 'Escape') cancelCostEdit();
            }}
          />
          <button 
            onClick={() => saveCostEdit(assetName, field)} 
            className="text-green-600 hover:text-green-800"
          >
            <Save className="w-3 h-3" />
          </button>
          <button 
            onClick={cancelCostEdit} 
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      );
    }

    return (
      <div 
        className="cursor-pointer hover:bg-gray-100 p-1 rounded text-xs"
        onClick={() => startCostEdit(assetName, field, value, actualRawValue)}
        title="Click to edit"
      >
        {displayValue || '-'}{suffix}
      </div>
    );
  };

  if (Object.keys(assets).length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <BatteryFull className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No assets defined yet</h3>
        <p className="text-gray-600 mb-4">
          Start building your renewable energy portfolio by adding your first asset
        </p>
        <button
          onClick={onAddNew}
          className="bg-green-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto hover:bg-green-700"
        >
          <Plus className="w-5 h-5" />
          <span>Add Your First Asset</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h3 className="text-lg font-semibold mb-4">Portfolio Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="text-2xl font-bold text-green-600">{Object.keys(assets).length}</div>
            <div className="text-sm text-gray-600">Total Assets</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{calculateTotalCapacity().toFixed(1)} MW</div>
            <div className="text-sm text-gray-600">Total Capacity</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {Object.values(assets).reduce((sum, asset) => sum + (asset.contracts?.length || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Contracts</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrencyFromMillions(calculateTotalValue(), currencyUnit)}
            </div>
            <div className="text-sm text-gray-600">Total CAPEX</div>
          </div>
        </div>
      </div>

      {/* Asset Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.values(assets).map((asset) => (
          <div key={asset.id} className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getAssetIcon(asset.type)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                    <p className="text-sm text-gray-500">{asset.region || asset.state}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => onDuplicate(asset)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Duplicate Asset"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit(asset)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(asset.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Capacity:</span>
                  <span className="font-medium">{asset.capacity} MW</span>
                </div>
                {asset.type === 'storage' && asset.volume && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Storage:</span>
                    <span className="font-medium">{asset.volume} MWh</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Operations:</span>
                  <span className="font-medium">
                    {asset.OperatingStartDate ? new Date(asset.OperatingStartDate).getFullYear() : 
                     asset.assetStartDate ? new Date(asset.assetStartDate).getFullYear() : 'TBD'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contracts:</span>
                  <span className="font-medium">{asset.contracts?.length || 0}</span>
                </div>
              </div>

              {/* Editable Costs Box */}
              {constants.assetCosts?.[asset.name] && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Costs & Finance</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">CAPEX:</span>
                      {renderEditableCostField(
                        asset.name,
                        'capex',
                        constants.assetCosts[asset.name].capex,
                        constants.assetCosts[asset.name].capex ? formatCurrencyFromMillions(constants.assetCosts[asset.name].capex, currencyUnit) : '-',
                        ''
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">OPEX:</span>
                      {renderEditableCostField(
                        asset.name,
                        'operatingCosts',
                        constants.assetCosts[asset.name].operatingCosts,
                        constants.assetCosts[asset.name].operatingCosts ? formatCurrencyFromMillions(constants.assetCosts[asset.name].operatingCosts, currencyUnit) : '-',
                        ''
                      )}
                    </div>
                    {constants.assetCosts[asset.name].operatingCostEscalation !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">OPEX Escalation:</span>
                        {renderEditableCostField(
                          asset.name,
                          'operatingCostEscalation',
                          constants.assetCosts[asset.name].operatingCostEscalation,
                          constants.assetCosts[asset.name].operatingCostEscalation ? `${constants.assetCosts[asset.name].operatingCostEscalation}%` : '-',
                          ''
                        )}
                      </div>
                    )}
                    {constants.assetCosts[asset.name].terminalValue !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Terminal Value:</span>
                        {renderEditableCostField(
                          asset.name,
                          'terminalValue',
                          constants.assetCosts[asset.name].terminalValue,
                          constants.assetCosts[asset.name].terminalValue ? formatCurrencyFromMillions(constants.assetCosts[asset.name].terminalValue, currencyUnit) : '-',
                          ''
                        )}
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Max Gearing:</span>
                      {renderEditableCostField(
                        asset.name,
                        'maxGearing',
                        constants.assetCosts[asset.name].maxGearing,
                        constants.assetCosts[asset.name].maxGearing ? `${(constants.assetCosts[asset.name].maxGearing * 100).toFixed(1)}%` : '-',
                        '',
                        constants.assetCosts[asset.name].maxGearing
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Interest Rate:</span>
                      {renderEditableCostField(
                        asset.name,
                        'interestRate',
                        constants.assetCosts[asset.name].interestRate,
                        constants.assetCosts[asset.name].interestRate ? `${(constants.assetCosts[asset.name].interestRate * 100).toFixed(2)}%` : '-',
                        '',
                        constants.assetCosts[asset.name].interestRate
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Debt Tenor:</span>
                      {renderEditableCostField(
                        asset.name,
                        'tenorYears',
                        constants.assetCosts[asset.name].tenorYears,
                        constants.assetCosts[asset.name].tenorYears ? `${constants.assetCosts[asset.name].tenorYears} years` : '-',
                        ''
                      )}
                    </div>
                    {constants.assetCosts[asset.name].targetDSCRContract !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">DSCR Contract:</span>
                        {renderEditableCostField(
                          asset.name,
                          'targetDSCRContract',
                          constants.assetCosts[asset.name].targetDSCRContract,
                          constants.assetCosts[asset.name].targetDSCRContract ? `${constants.assetCosts[asset.name].targetDSCRContract}x` : '-',
                          ''
                        )}
                      </div>
                    )}
                    {constants.assetCosts[asset.name].targetDSCRMerchant !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">DSCR Merchant:</span>
                        {renderEditableCostField(
                          asset.name,
                          'targetDSCRMerchant',
                          constants.assetCosts[asset.name].targetDSCRMerchant,
                          constants.assetCosts[asset.name].targetDSCRMerchant ? `${constants.assetCosts[asset.name].targetDSCRMerchant}x` : '-',
                          ''
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contract summary */}
              {asset.contracts?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">Primary Contract:</div>
                  <div className="text-sm">
                    <span className="font-medium">{asset.contracts[0].counterparty || 'TBD'}</span>
                    <span className="text-gray-500"> • </span>
                    <span className="capitalize">{asset.contracts[0].type}</span>
                    {asset.contracts[0].strikePrice && (
                      <>
                        <span className="text-gray-500"> • </span>
                        <span>
                          ${asset.contracts[0].strikePrice}
                          {asset.type === 'storage' ? '/MW/hr' : '/MWh'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetCards;














