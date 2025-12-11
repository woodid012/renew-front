// app/pages/asset-inputs/detail/components/AssetForm.jsx
'use client'

import { useState, useEffect } from 'react';
import {
  Save,
  X,
  Plus,
  FileText,
  TrendingUp,
  Calendar,
  DollarSign,
  Settings
} from 'lucide-react';
import { useDisplaySettings } from '@/app/context/DisplaySettingsContext';
import { formatCurrencyFromMillions } from '@/app/utils/currencyFormatter';

const AssetForm = ({
  showForm,
  editingAsset,
  formData,
  setFormData,
  onSubmit,
  onCancel,
  getDefaultAssetCosts,
  assetDefaults
}) => {
  const { currencyUnit } = useDisplaySettings();
  const [activeTab, setActiveTab] = useState('basic');

  // Recalculate contract end dates when Operations Start date or construction dates change
  useEffect(() => {
    // Calculate current Operations Start date
    let opsStartDate = formData.OperatingStartDate || '';
    if (formData.constructionStartDate && !opsStartDate) {
      const start = new Date(formData.constructionStartDate);
      start.setDate(1);
      const duration = parseInt(formData.constructionDuration) || 0;
      if (duration > 0) {
        const constructionEnd = new Date(start);
        constructionEnd.setMonth(constructionEnd.getMonth() + duration - 1);
        constructionEnd.setMonth(constructionEnd.getMonth() + 1, 0);
        const opsStart = new Date(constructionEnd);
        opsStart.setDate(opsStart.getDate() + 1);
        opsStartDate = opsStart.toISOString().split('T')[0];
      }
    }

    // Update contracts that use Operations Start Date
    setFormData(prev => {
      const hasChanges = prev.contracts.some(contract => {
        if (contract.useOpsStartDate && contract.contractDuration) {
          const duration = parseInt(contract.contractDuration) || 0;
          if (duration > 0 && opsStartDate) {
            const start = new Date(opsStartDate);
            const endDate = new Date(start);
            endDate.setMonth(endDate.getMonth() + duration);
            endDate.setMonth(endDate.getMonth() + 1, 0);
            const calculatedEndDate = endDate.toISOString().split('T')[0];
            return contract.startDate !== opsStartDate || contract.endDate !== calculatedEndDate;
          }
        }
        return false;
      });

      if (!hasChanges) return prev;

      return {
        ...prev,
        contracts: prev.contracts.map(contract => {
          if (contract.useOpsStartDate && opsStartDate) {
            const updatedContract = { ...contract, startDate: opsStartDate };
            const duration = parseInt(contract.contractDuration) || 0;
            if (duration > 0) {
              const start = new Date(opsStartDate);
              const endDate = new Date(start);
              // Subtract 1 from duration to get the correct target month (e.g., 1 month duration = end of start month)
              endDate.setMonth(endDate.getMonth() + duration - 1);
              endDate.setMonth(endDate.getMonth() + 1, 0);
              updatedContract.endDate = endDate.toISOString().split('T')[0];
            }
            return updatedContract;
          }
          return contract;
        })
      };
    });
  }, [formData.constructionStartDate, formData.constructionDuration, formData.OperatingStartDate]);

  // Safe helper to get string values
  const safeValue = (value) => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  // Calculate volume metrics for performance tab
  const calculateVolumeMetrics = () => {
    const capacity = parseFloat(formData.capacity) || 0;
    const hoursPerQuarter = {
      q1: 2160, // 90 days (Jan 31 + Feb 28 + Mar 31)
      q2: 2184, // 91 days (Apr 30 + May 31 + Jun 30)
      q3: 2208, // 92 days (Jul 31 + Aug 31 + Sep 30)
      q4: 2208  // 92 days (Oct 31 + Nov 30 + Dec 31)
    };

    const quarters = ['q1', 'q2', 'q3', 'q4'];
    const capacityFactors = quarters.map(q => {
      const cf = parseFloat(formData[`qtrCapacityFactor_${q}`]) || 0;
      return cf / 100; // Convert percentage to decimal
    });

    const volumes = quarters.map((q, idx) => {
      const cf = capacityFactors[idx];
      return capacity * cf * hoursPerQuarter[q];
    });

    const annualAvgCapacityFactor = capacityFactors.reduce((sum, cf) => sum + cf, 0) / 4;
    const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);

    return {
      capacity,
      hoursPerQuarter,
      quarters,
      capacityFactors,
      volumes,
      annualAvgCapacityFactor,
      totalVolume
    };
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate durationHours for storage assets when volume or capacity changes
      if (prev.type === 'storage' && (field === 'volume' || field === 'capacity')) {
        const volume = field === 'volume' ? parseFloat(value) || 0 : parseFloat(prev.volume) || 0;
        const capacity = field === 'capacity' ? parseFloat(value) || 0 : parseFloat(prev.capacity) || 0;

        // Only auto-calculate if both values are present and durationHours wasn't manually set
        if (volume > 0 && capacity > 0) {
          const calculatedDuration = volume / capacity;
          // Only update if durationHours is empty or matches previous calculated value (to allow manual override)
          if (!prev.durationHours || Math.abs(parseFloat(prev.durationHours) - calculatedDuration) < 0.01) {
            updated.durationHours = calculatedDuration.toFixed(2);
          }
        } else if (volume === 0 || capacity === 0) {
          // Clear duration if volume or capacity is cleared
          updated.durationHours = '';
        }
      }

      // Calculate timeline dates: construction start + duration = construction end, then ops start = construction end + 1 day
      if (field === 'constructionStartDate' || field === 'constructionDuration') {
        const startDate = field === 'constructionStartDate' ? value : prev.constructionStartDate;
        const duration = parseInt(field === 'constructionDuration' ? value : prev.constructionDuration) || 0;
        
        if (startDate) {
          // Force construction start to 1st of month
          const start = new Date(startDate);
          start.setDate(1);
          const formattedStart = start.toISOString().split('T')[0];

          if (field === 'constructionStartDate') {
            updated.constructionStartDate = formattedStart;
          }

          // Calculate construction end date (construction start + duration months, end of that month)
          const constructionEnd = new Date(start);
          // Subtract 1 from duration to get the correct target month (e.g., 1 month duration = end of start month)
          constructionEnd.setMonth(constructionEnd.getMonth() + duration - 1);
          // Set to last day of the month
          constructionEnd.setMonth(constructionEnd.getMonth() + 1, 0); // 0th day of next month = last day of current month
          
          // Calculate operations start = construction end + 1 day
          const opsStart = new Date(constructionEnd);
          opsStart.setDate(opsStart.getDate() + 1);
          updated.OperatingStartDate = opsStart.toISOString().split('T')[0];
        }
      }

      // Apply asset defaults when type or region changes
      if (assetDefaults && assetDefaults.assetDefaults) {
        const currentType = field === 'type' ? value : prev.type;
        const currentRegion = field === 'region' ? value : prev.region;

        // If type changed, update general defaults
        if (field === 'type') {
          const typeDefaults = assetDefaults.assetDefaults[currentType];
          if (typeDefaults) {
            updated.assetLife = typeDefaults.assetLife;
            updated.volumeLossAdjustment = typeDefaults.volumeLossAdjustment;
            updated.annualDegradation = typeDefaults.annualDegradation;
            updated.constructionDuration = typeDefaults.constructionDuration;

            // Recalculate dates with new default duration if start date exists
            if (updated.constructionStartDate && typeDefaults.constructionDuration !== undefined) {
              const start = new Date(updated.constructionStartDate);
              start.setDate(1); // Ensure construction start is 1st of month
              updated.constructionStartDate = start.toISOString().split('T')[0];
              
              // Calculate construction end (start + duration months, end of that month)
              const constructionEnd = new Date(start);
              // Subtract 1 from duration to get the correct target month (e.g., 1 month duration = end of start month)
              constructionEnd.setMonth(constructionEnd.getMonth() + typeDefaults.constructionDuration - 1);
              // Set to last day of the month
              constructionEnd.setMonth(constructionEnd.getMonth() + 1, 0); // 0th day of next month = last day of current month
              
              // Calculate operations start = construction end + 1 day
              const opsStart = new Date(constructionEnd);
              opsStart.setDate(opsStart.getDate() + 1);
              updated.OperatingStartDate = opsStart.toISOString().split('T')[0];
            }
            // Prepopulate cost defaults for new type
            const defaults = getDefaultAssetCosts(currentType, parseFloat(updated.capacity) || 0);
            updated.capex = defaults.capex;
            updated.operatingCosts = defaults.operatingCosts;
            updated.operatingCostEscalation = defaults.operatingCostEscalation;
            updated.terminalValue = defaults.terminalValue;
            updated.maxGearing = defaults.maxGearing;
            updated.targetDSCRContract = defaults.targetDSCRContract;
            updated.targetDSCRMerchant = defaults.targetDSCRMerchant;
            updated.interestRate = defaults.interestRate;
            updated.tenorYears = defaults.tenorYears;
            updated.debtStructure = defaults.debtStructure;
          }
        }

        // If type or region changed, update capacity factors (only for solar/wind)
        if ((field === 'type' || field === 'region') && currentType !== 'storage') {
          const typeDefaults = assetDefaults.assetDefaults[currentType];
          if (typeDefaults && typeDefaults.capacityFactors) {
            const regionFactors = typeDefaults.capacityFactors[currentRegion];
            if (regionFactors) {
              updated.qtrCapacityFactor_q1 = regionFactors.q1;
              updated.qtrCapacityFactor_q2 = regionFactors.q2;
              updated.qtrCapacityFactor_q3 = regionFactors.q3;
              updated.qtrCapacityFactor_q4 = regionFactors.q4;
            }
          }
        }
        // If capacity changes, also refresh cost defaults (keep user edits if they already changed a cost field)
        if (field === 'capacity') {
          const defaults = getDefaultAssetCosts(currentType, parseFloat(value) || 0);
          // Only set if the cost fields are currently empty (i.e., not manually edited)
          if (!prev.capex) updated.capex = defaults.capex;
          if (!prev.operatingCosts) updated.operatingCosts = defaults.operatingCosts;
          if (!prev.operatingCostEscalation) updated.operatingCostEscalation = defaults.operatingCostEscalation;
          if (!prev.terminalValue) updated.terminalValue = defaults.terminalValue;
          if (!prev.maxGearing) updated.maxGearing = defaults.maxGearing;
          if (!prev.targetDSCRContract) updated.targetDSCRContract = defaults.targetDSCRContract;
          if (!prev.targetDSCRMerchant) updated.targetDSCRMerchant = defaults.targetDSCRMerchant;
          if (!prev.interestRate) updated.interestRate = defaults.interestRate;
          if (!prev.tenorYears) updated.tenorYears = defaults.tenorYears;
          if (!prev.debtStructure) updated.debtStructure = defaults.debtStructure;
        }
      }

      return updated;
    });
  };

  const handleContractChange = (contractIndex, field, value) => {
    setFormData(prev => {
      const updated = { ...prev };
      updated.contracts = prev.contracts.map((contract, index) => {
        if (index === contractIndex) {
          const updatedContract = { ...contract, [field]: value };
          
          // Calculate end date when contract duration or start date changes
          if (field === 'contractDuration' || field === 'startDate' || field === 'useOpsStartDate') {
            const duration = parseInt(updatedContract.contractDuration) || 0;
            
            // Get the actual start date (either from useOpsStartDate or manual entry)
            let startDate = updatedContract.startDate || '';
            if (updatedContract.useOpsStartDate) {
              // Calculate Operations Start date
              startDate = prev.OperatingStartDate || '';
              if (prev.constructionStartDate && !startDate) {
                const start = new Date(prev.constructionStartDate);
                start.setDate(1);
                const constructionDuration = parseInt(prev.constructionDuration) || 0;
                if (constructionDuration > 0) {
                  const constructionEnd = new Date(start);
                  constructionEnd.setMonth(constructionEnd.getMonth() + constructionDuration - 1);
                  constructionEnd.setMonth(constructionEnd.getMonth() + 1, 0);
                  const opsStart = new Date(constructionEnd);
                  opsStart.setDate(opsStart.getDate() + 1);
                  startDate = opsStart.toISOString().split('T')[0];
                }
              }
              // Update the stored startDate for consistency
              if (startDate) {
                updatedContract.startDate = startDate;
              }
            }
            
            // If duration is provided and start date exists, calculate end date
            if (duration > 0 && startDate) {
              const start = new Date(startDate);
              const endDate = new Date(start);
              // Subtract 1 from duration to get the correct target month (e.g., 1 month duration = end of start month)
              endDate.setMonth(endDate.getMonth() + duration - 1);
              // Set to last day of that month
              endDate.setMonth(endDate.getMonth() + 1, 0);
              updatedContract.endDate = endDate.toISOString().split('T')[0];
            }
          }
          
          return updatedContract;
        }
        return contract;
      });
      return updated;
    });
  };

  const addContract = () => {
    // Calculate Operations Start date for default
    let opsStartDate = formData.OperatingStartDate || '';
    if (formData.constructionStartDate && !opsStartDate) {
      const start = new Date(formData.constructionStartDate);
      start.setDate(1);
      const duration = parseInt(formData.constructionDuration) || 0;
      if (duration > 0) {
        const constructionEnd = new Date(start);
        constructionEnd.setMonth(constructionEnd.getMonth() + duration - 1);
        constructionEnd.setMonth(constructionEnd.getMonth() + 1, 0);
        const opsStart = new Date(constructionEnd);
        opsStart.setDate(opsStart.getDate() + 1);
        opsStartDate = opsStart.toISOString().split('T')[0];
      }
    }
    
    const newContract = {
      id: Date.now().toString(),
      counterparty: '',
      type: formData.type === 'storage' ? 'tolling' : 'bundled',
      buyersPercentage: 100,
      strikePrice: '',
      indexation: 2.5,
      indexationReferenceYear: new Date().getFullYear(),
      startDate: opsStartDate,
      useOpsStartDate: true, // Default to using Operations Start date
      contractDuration: '', // Duration in months
      endDate: '',
      hasFloor: false,
      floorValue: ''
    };

    setFormData(prev => ({
      ...prev,
      contracts: [...prev.contracts, newContract]
    }));
  };

  const removeContract = (contractIndex) => {
    setFormData(prev => ({
      ...prev,
      contracts: prev.contracts.filter((_, index) => index !== contractIndex)
    }));
  };

  const getContractTypeOptions = (assetType) => {
    if (assetType === 'storage') {
      return ['tolling', 'cfd', 'fixed'];
    }
    return ['bundled', 'green', 'Energy', 'fixed'];
  };

  if (!showForm) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-screen overflow-y-auto">
        <form onSubmit={onSubmit}>
          {/* Form Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-semibold">
              {editingAsset ? 'Edit Asset' : 'Add New Asset'}
            </h2>
            <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'basic', label: 'Basic Details', icon: FileText },
                { id: 'performance', label: 'Performance', icon: TrendingUp },
                { id: 'timeline', label: 'Timeline', icon: Calendar },
                { id: 'contracts', label: 'Contracts', icon: DollarSign },
                { id: 'costs', label: 'Costs', icon: Settings }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 border-b-2 font-medium text-sm ${activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <Icon className="w-4 h-4 inline mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Basic Details Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                    <input
                      type="text"
                      value={safeValue(formData.name)}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                    <select
                      value={formData.region}
                      onChange={(e) => handleInputChange('region', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      {['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS'].map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Technology Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="solar">Solar</option>
                      <option value="wind">Wind</option>
                      <option value="storage">Battery Storage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (MW)</label>
                    <input
                      type="number"
                      value={safeValue(formData.capacity)}
                      onChange={(e) => handleInputChange('capacity', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      step="0.1"
                      required
                    />
                  </div>
                  {formData.type === 'storage' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Storage Volume (MWh)</label>
                        <input
                          type="number"
                          value={safeValue(formData.volume)}
                          onChange={(e) => handleInputChange('volume', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
                        <input
                          type="number"
                          value={safeValue(formData.durationHours || (formData.volume && formData.capacity ? (parseFloat(formData.volume) / parseFloat(formData.capacity)).toFixed(2) : ''))}
                          onChange={(e) => handleInputChange('durationHours', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          step="0.1"
                          min="0.1"
                          placeholder="Auto-calculated from Volume/Capacity"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.volume && formData.capacity && parseFloat(formData.volume) > 0 && parseFloat(formData.capacity) > 0
                            ? `Calculated: ${(parseFloat(formData.volume) / parseFloat(formData.capacity)).toFixed(2)}h (Volume ÷ Capacity). Used for merchant price curve lookup.`
                            : 'Used for merchant price curve lookup. Auto-calculated from Volume ÷ Capacity when both are set.'}
                        </p>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset Life (years)</label>
                    <input
                      type="number"
                      value={formData.assetLife}
                      onChange={(e) => handleInputChange('assetLife', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && (
              <div className="space-y-6">
                {formData.type === 'storage' && (
                  <>
                    {/* BESS Capacity and Volume Display */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-4">BESS Configuration</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded p-3">
                          <div className="text-xs text-gray-500 mb-1">BESS Capacity</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {parseFloat(formData.capacity) || 0} MW
                          </div>
                        </div>
                        <div className="bg-white rounded p-3">
                          <div className="text-xs text-gray-500 mb-1">BESS Volume</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {parseFloat(formData.volume) || 0} MWh
                          </div>
                        </div>
                        <div className="bg-white rounded p-3">
                          <div className="text-xs text-gray-500 mb-1">Duration</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {formData.volume && formData.capacity && parseFloat(formData.volume) > 0 && parseFloat(formData.capacity) > 0
                              ? `${(parseFloat(formData.volume) / parseFloat(formData.capacity)).toFixed(2)}h`
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Annual Cycle Volume Calculation */}
                    {(() => {
                      const volume = parseFloat(formData.volume) || 0;
                      const cyclesPerDay = 1; // Fixed at 1 cycle per day
                      const annualCycleVolume = volume * 365 * cyclesPerDay;

                      if (volume <= 0) return null;

                      return (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="text-xs text-blue-600 mb-2">Annual Cycle Volume (for 1 Cycle per Day)</div>
                          <div className="text-sm text-blue-800 font-mono">
                            {volume.toLocaleString(undefined, { maximumFractionDigits: 0 })} MWh × 365 days × 1 cycle/day = {annualCycleVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} MWh
                          </div>
                        </div>
                      );
                    })()}

                    {/* Volume Loss Adjustment and Annual Degradation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Volume Loss Adjustment (%)</label>
                        <input
                          type="number"
                          value={safeValue(formData.volumeLossAdjustment)}
                          onChange={(e) => handleInputChange('volumeLossAdjustment', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Annual Degradation (%)</label>
                        <input
                          type="number"
                          value={safeValue(formData.annualDegradation)}
                          onChange={(e) => handleInputChange('annualDegradation', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </>
                )}
                {formData.type !== 'storage' && (
                  <>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Quarterly Capacity Factors (%)</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['q1', 'q2', 'q3', 'q4'].map(quarter => (
                          <div key={quarter}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {quarter.toUpperCase()}
                            </label>
                            <input
                              type="number"
                              value={safeValue(formData[`qtrCapacityFactor_${quarter}`])}
                              onChange={(e) => handleInputChange(`qtrCapacityFactor_${quarter}`, e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md"
                              min="0"
                              max="100"
                              step="0.1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Volume and Summary Calculations */}
                    {(() => {
                      const metrics = calculateVolumeMetrics();
                      if (metrics.capacity <= 0) return null;

                      return (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-4">Volume Calculations & Summary</h4>
                          
                          {/* Quarterly Volume Table */}
                          <div className="mb-4">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-300">
                                    <th className="text-left py-2 px-3 font-medium text-gray-700">Quarter</th>
                                    <th className="text-right py-2 px-3 font-medium text-gray-700">Capacity Factor (%)</th>
                                    <th className="text-right py-2 px-3 font-medium text-gray-700">Hours</th>
                                    <th className="text-right py-2 px-3 font-medium text-gray-700">Volume (MWh)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {metrics.quarters.map((q, idx) => (
                                    <tr key={q} className="border-b border-gray-200">
                                      <td className="py-2 px-3 font-medium text-gray-700">{q.toUpperCase()}</td>
                                      <td className="py-2 px-3 text-right text-gray-600">
                                        {(metrics.capacityFactors[idx] * 100).toFixed(2)}%
                                      </td>
                                      <td className="py-2 px-3 text-right text-gray-600">
                                        {metrics.hoursPerQuarter[q].toLocaleString()}
                                      </td>
                                      <td className="py-2 px-3 text-right font-medium text-gray-900">
                                        {metrics.volumes[idx].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Annual Summary */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-300">
                            <div className="bg-white rounded p-3">
                              <div className="text-xs text-gray-500 mb-1">Annual Average Capacity Factor</div>
                              <div className="text-lg font-semibold text-gray-900">
                                {(metrics.annualAvgCapacityFactor * 100).toFixed(2)}%
                              </div>
                            </div>
                            <div className="bg-white rounded p-3">
                              <div className="text-xs text-gray-500 mb-1">Total Annual Volume</div>
                              <div className="text-lg font-semibold text-gray-900">
                                {metrics.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} MWh
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Volume Loss Adjustment and Annual Degradation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Volume Loss Adjustment (%)</label>
                        <input
                          type="number"
                          value={safeValue(formData.volumeLossAdjustment)}
                          onChange={(e) => handleInputChange('volumeLossAdjustment', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Annual Degradation (%)</label>
                        <input
                          type="number"
                          value={safeValue(formData.annualDegradation)}
                          onChange={(e) => handleInputChange('annualDegradation', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          step="0.1"
                        />
                      </div>
                    </div>

                    {/* Post-Adjustment Volume Summary */}
                    {(() => {
                      const metrics = calculateVolumeMetrics();
                      if (metrics.capacity <= 0) return null;
                      
                      const volumeLossAdjustment = parseFloat(formData.volumeLossAdjustment) || 100;
                      const multiplier = volumeLossAdjustment / 100;
                      const postAdjustmentVolume = metrics.totalVolume * multiplier;

                      return (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="text-xs text-blue-600 mb-2">Total Annual Volume (Loss Adjusted)</div>
                          {volumeLossAdjustment < 100 ? (
                            <div className="text-sm text-blue-800 font-mono">
                              {metrics.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} MWh × {volumeLossAdjustment.toFixed(1)}% = {postAdjustmentVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} MWh
                            </div>
                          ) : (
                            <div className="text-xl font-semibold text-blue-900">
                              {metrics.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} MWh
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (() => {
              // Calculate construction end and ops start for display
              let constructionEndDate = '';
              let opsStartDate = safeValue(formData.OperatingStartDate);
              let opsEndDate = '';
              
              if (formData.constructionStartDate) {
                const start = new Date(formData.constructionStartDate);
                start.setDate(1);
                const duration = parseInt(formData.constructionDuration) || 0;
                
                // Construction end = construction start + duration months, end of that month
                const constructionEnd = new Date(start);
                // Subtract 1 from duration to get the correct target month (e.g., 1 month duration = end of start month)
                constructionEnd.setMonth(constructionEnd.getMonth() + duration - 1);
                // Set to last day of the month
                constructionEnd.setMonth(constructionEnd.getMonth() + 1, 0); // 0th day of next month = last day of current month
                constructionEndDate = constructionEnd.toISOString().split('T')[0];
                
                // Operations start = construction end + 1 day
                const opsStart = new Date(constructionEnd);
                opsStart.setDate(opsStart.getDate() + 1);
                opsStartDate = opsStart.toISOString().split('T')[0];
              }
              
              // Calculate operations end = operations start + asset life (years) - 1 day
              let opsDurationYears = '';
              if (opsStartDate && formData.assetLife) {
                const opsStart = new Date(opsStartDate);
                const assetLifeYears = parseInt(formData.assetLife) || 0;
                if (assetLifeYears > 0) {
                  const opsEnd = new Date(opsStart);
                  opsEnd.setFullYear(opsEnd.getFullYear() + assetLifeYears);
                  opsEnd.setDate(opsEnd.getDate() - 1); // Subtract 1 day
                  opsEndDate = opsEnd.toISOString().split('T')[0];
                  
                  // Calculate operations duration in years
                  const diffTime = opsEnd.getTime() - opsStart.getTime();
                  const diffDays = diffTime / (1000 * 60 * 60 * 24);
                  const diffYears = diffDays / 365.25;
                  opsDurationYears = diffYears.toFixed(2);
                }
              }
              
              return (
                <div className="space-y-6">
                  {/* Construction Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Construction Start</label>
                      <input
                        type="date"
                        value={safeValue(formData.constructionStartDate)}
                        onChange={(e) => handleInputChange('constructionStartDate', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Construction Duration (months)</label>
                      <input
                        type="number"
                        value={safeValue(formData.constructionDuration)}
                        onChange={(e) => handleInputChange('constructionDuration', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Construction End</label>
                      <input
                        type="date"
                        value={constructionEndDate}
                        disabled
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 opacity-75 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">Calculated: Construction Start + Duration</p>
                    </div>
                  </div>
                  
                  {/* Operations Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Operations Start</label>
                      <input
                        type="date"
                        value={opsStartDate}
                        disabled
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 opacity-75 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">Calculated: Construction End + 1 day</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Operations Duration (years)</label>
                      <input
                        type="text"
                        value={opsDurationYears}
                        disabled
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 opacity-75 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">Calculated: Between Operations Start and End</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Operations End</label>
                      <input
                        type="date"
                        value={opsEndDate}
                        disabled
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 opacity-75 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">Calculated: Operations Start + Asset Life - 1 day</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Contracts Tab */}
            {activeTab === 'contracts' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Revenue Contracts</h3>
                  <button
                    type="button"
                    onClick={addContract}
                    className="bg-green-600 text-white px-3 py-1 rounded flex items-center space-x-1 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Contract</span>
                  </button>
                </div>

                {formData.contracts.map((contract, index) => (
                  <div key={contract.id} className="border border-gray-200 rounded-lg p-4 relative">
                    <button
                      type="button"
                      onClick={() => removeContract(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Counterparty</label>
                        <input
                          type="text"
                          value={safeValue(contract.counterparty)}
                          onChange={(e) => handleContractChange(index, 'counterparty', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                        <select
                          value={contract.type}
                          onChange={(e) => handleContractChange(index, 'type', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          {getContractTypeOptions(formData.type).map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Strike Price ($/MWh)</label>
                        <input
                          type="number"
                          value={safeValue(contract.strikePrice)}
                          onChange={(e) => handleContractChange(index, 'strikePrice', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Buyer&apos;s Percentage (%)</label>
                        <input
                          type="number"
                          value={safeValue(contract.buyersPercentage)}
                          onChange={(e) => handleContractChange(index, 'buyersPercentage', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          min="0"
                          max="100"
                        />
                      </div>
                      {/* Date fields row */}
                      <div className="col-span-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <input
                            type="checkbox"
                            id={`useOpsStartDate-${index}`}
                            checked={contract.useOpsStartDate || false}
                            onChange={(e) => {
                              const useOpsStart = e.target.checked;
                              handleContractChange(index, 'useOpsStartDate', useOpsStart);
                              if (useOpsStart) {
                                // Calculate Operations Start date
                                let opsStartDate = formData.OperatingStartDate || '';
                                if (formData.constructionStartDate && !opsStartDate) {
                                  const start = new Date(formData.constructionStartDate);
                                  start.setDate(1);
                                  const duration = parseInt(formData.constructionDuration) || 0;
                                  if (duration > 0) {
                                    const constructionEnd = new Date(start);
                                    constructionEnd.setMonth(constructionEnd.getMonth() + duration - 1);
                                    constructionEnd.setMonth(constructionEnd.getMonth() + 1, 0);
                                    const opsStart = new Date(constructionEnd);
                                    opsStart.setDate(opsStart.getDate() + 1);
                                    opsStartDate = opsStart.toISOString().split('T')[0];
                                  }
                                }
                                handleContractChange(index, 'startDate', opsStartDate);
                              }
                            }}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded"
                          />
                          <label htmlFor={`useOpsStartDate-${index}`} className="text-sm font-medium text-gray-700">
                            Use Operations Start Date
                          </label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                              type="date"
                              value={(() => {
                                // If useOpsStartDate is checked, calculate and return Operations Start date
                                if (contract.useOpsStartDate) {
                                  let opsStartDate = formData.OperatingStartDate || '';
                                  if (formData.constructionStartDate && !opsStartDate) {
                                    const start = new Date(formData.constructionStartDate);
                                    start.setDate(1);
                                    const duration = parseInt(formData.constructionDuration) || 0;
                                    if (duration > 0) {
                                      const constructionEnd = new Date(start);
                                      constructionEnd.setMonth(constructionEnd.getMonth() + duration - 1);
                                      constructionEnd.setMonth(constructionEnd.getMonth() + 1, 0);
                                      const opsStart = new Date(constructionEnd);
                                      opsStart.setDate(opsStart.getDate() + 1);
                                      opsStartDate = opsStart.toISOString().split('T')[0];
                                    }
                                  }
                                  return safeValue(opsStartDate);
                                }
                                return safeValue(contract.startDate);
                              })()}
                              onChange={(e) => handleContractChange(index, 'startDate', e.target.value)}
                              disabled={contract.useOpsStartDate || false}
                              className={`w-full p-2 border border-gray-300 rounded-md ${
                                contract.useOpsStartDate 
                                  ? 'bg-gray-100 opacity-50 cursor-not-allowed' 
                                  : ''
                              }`}
                            />
                            {contract.useOpsStartDate && (
                              <p className="text-xs text-gray-500 mt-1">Using Operations Start</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Duration (months)</label>
                            <input
                              type="number"
                              value={safeValue(contract.contractDuration)}
                              onChange={(e) => handleContractChange(index, 'contractDuration', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md"
                              min="0"
                              placeholder="Enter duration"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {contract.contractDuration 
                                ? 'Calculates End Date' 
                                : 'Leave empty for manual'}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                              type="date"
                              value={safeValue(contract.endDate)}
                              onChange={(e) => handleContractChange(index, 'endDate', e.target.value)}
                              disabled={!!contract.contractDuration && parseInt(contract.contractDuration) > 0}
                              className={`w-full p-2 border border-gray-300 rounded-md ${
                                contract.contractDuration && parseInt(contract.contractDuration) > 0
                                  ? 'bg-gray-100 opacity-50 cursor-not-allowed' 
                                  : ''
                              }`}
                            />
                            {contract.contractDuration && parseInt(contract.contractDuration) > 0 && (
                              <p className="text-xs text-gray-500 mt-1">Calculated</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Indexation (%/year)</label>
                        <input
                          type="number"
                          value={safeValue(contract.indexation)}
                          onChange={(e) => handleContractChange(index, 'indexation', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reference Year</label>
                        <input
                          type="number"
                          value={safeValue(contract.indexationReferenceYear)}
                          onChange={(e) => handleContractChange(index, 'indexationReferenceYear', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          min="2020"
                          max="2030"
                        />
                      </div>

                      {/* Contract type specific fields */}
                      {contract.type === 'bundled' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Energy Price ($/MWh)</label>
                            <input
                              type="number"
                              value={safeValue(contract.EnergyPrice)}
                              onChange={(e) => handleContractChange(index, 'EnergyPrice', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Green Price ($/MWh)</label>
                            <input
                              type="number"
                              value={safeValue(contract.greenPrice)}
                              onChange={(e) => handleContractChange(index, 'greenPrice', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md"
                              step="0.01"
                            />
                          </div>
                        </>
                      )}

                      {/* Cap options */}
                      <div className="col-span-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <input
                            type="checkbox"
                            id={`hasCap-${index}`}
                            checked={contract.hasCap || false}
                            onChange={(e) => handleContractChange(index, 'hasCap', e.target.checked)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded"
                          />
                          <label htmlFor={`hasCap-${index}`} className="text-sm font-medium text-gray-700">
                            Has Cap Price
                          </label>
                        </div>
                        {contract.hasCap && (
                          <input
                            type="number"
                            placeholder="Cap Value"
                            value={safeValue(contract.capValue)}
                            onChange={(e) => handleContractChange(index, 'capValue', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            step="0.01"
                          />
                        )}
                      </div>

                      {/* Floor options */}
                      <div className="col-span-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <input
                            type="checkbox"
                            id={`hasFloor-${index}`}
                            checked={contract.hasFloor || false}
                            onChange={(e) => handleContractChange(index, 'hasFloor', e.target.checked)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded"
                          />
                          <label htmlFor={`hasFloor-${index}`} className="text-sm font-medium text-gray-700">
                            Has Floor Price
                          </label>
                        </div>
                        {contract.hasFloor && (
                          <input
                            type="number"
                            placeholder="Floor Value"
                            value={safeValue(contract.floorValue)}
                            onChange={(e) => handleContractChange(index, 'floorValue', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            step="0.01"
                          />
                        )}
                      </div>
                    </div>

                    {/* Contract Summary */}
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <div className="text-sm text-gray-600">
                        <strong>Contract Summary:</strong> {contract.counterparty || 'TBD'} •
                        {contract.type} • {contract.buyersPercentage}% •
                        ${contract.strikePrice || '0'}/MWh
                        {contract.startDate && contract.endDate && (
                          <span> • {Math.round((new Date(contract.endDate) - new Date(contract.startDate)) / (365.25 * 24 * 60 * 60 * 1000))} years</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {formData.contracts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No contracts added yet</p>
                    <p className="text-sm">Add contracts to define revenue arrangements</p>
                  </div>
                )}
              </div>
            )}

            {/* Costs Tab */}
            {activeTab === 'costs' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Cost Configuration</h4>
                  <p className="text-sm text-blue-700">
                    Asset costs are automatically calculated based on capacity and technology type.
                    You can adjust these in the Bulk Edit tab after saving the asset.
                  </p>
                </div>

                {formData.capacity && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Estimated Costs</h4>
                      {(() => {
                        const defaultCosts = getDefaultAssetCosts(formData.type, parseFloat(formData.capacity) || 0);
                        return (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">CAPEX:</span>
                              <span className="font-medium">{formatCurrencyFromMillions(defaultCosts.capex, currencyUnit)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Annual OPEX:</span>
                              <span className="font-medium">{formatCurrencyFromMillions(defaultCosts.operatingCosts, currencyUnit)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Terminal Value:</span>
                              <span className="font-medium">{formatCurrencyFromMillions(defaultCosts.terminalValue, currencyUnit)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Finance Assumptions</h4>
                      {(() => {
                        const defaultCosts = getDefaultAssetCosts(formData.type, parseFloat(formData.capacity) || 0);
                        return (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Max Gearing:</span>
                              <span className="font-medium">{(defaultCosts.maxGearing * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Target DSCR:</span>
                              <span className="font-medium">{defaultCosts.targetDSCRContract}x</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Interest Rate:</span>
                              <span className="font-medium">{(defaultCosts.interestRate * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Loan Tenor:</span>
                              <span className="font-medium">{defaultCosts.tenorYears} years</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{editingAsset ? 'Update' : 'Create'} Asset</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetForm;


