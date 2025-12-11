'use client'

import { useState, useEffect } from 'react';
import { Target, Save, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function SensitivitySettingsPage() {
  const [sensitivityConfig, setSensitivityConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  useEffect(() => {
    fetchSensitivityConfig();
  }, []);

  const fetchSensitivityConfig = async () => {
    setLoading(true);
    try {
      // Load general sensitivity config (no unique_id needed)
      const response = await fetch('/api/sensitivity-inputs');
      
      if (!response.ok) {
        // If not found, try to load default structure
        const defaultConfig = {
          base_scenario_file: null,
          output_collection_prefix: 'sensitivity_results',
          sensitivities: {}
        };
        setSensitivityConfig(defaultConfig);
        setLoading(false);
        return;
      }

      const data = await response.json();
      // If we get the config from MongoDB, it might have portfolio_name or unique_id, remove them for editing
      const { portfolio_name, unique_id, updated_at, ...config } = data;
      setSensitivityConfig(config);
    } catch (error) {
      console.error('Error fetching sensitivity config:', error);
      // Load default structure on error
      const defaultConfig = {
        base_scenario_file: null,
        output_collection_prefix: 'sensitivity_results',
        sensitivities: {}
      };
      setSensitivityConfig(defaultConfig);
      setStatus({ type: 'error', message: 'Failed to load sensitivity config. Using defaults.' });
    } finally {
      setLoading(false);
    }
  };

  const saveSensitivityConfig = async () => {
    if (!sensitivityConfig) return;

    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      // Save as general config (no unique_id or portfolio_name)
      const response = await fetch('/api/sensitivity-inputs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sensitivityConfig),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setStatus({ type: 'success', message: 'Sensitivity configuration saved successfully!' });
      
      // Refresh to get updated timestamp
      setTimeout(() => {
        fetchSensitivityConfig();
      }, 500);
    } catch (error) {
      console.error('Error saving sensitivity config:', error);
      setStatus({ type: 'error', message: `Failed to save: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const updateSensitivityParam = (paramName, field, value) => {
    if (!sensitivityConfig) return;
    
    setSensitivityConfig(prev => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      if (!newConfig.sensitivities) {
        newConfig.sensitivities = {};
      }
      if (!newConfig.sensitivities[paramName]) {
        newConfig.sensitivities[paramName] = {};
      }
      
      if (field === 'range') {
        const rangeValue = typeof value === 'string' ? value.split(',').map(v => parseFloat(v.trim())) : value;
        newConfig.sensitivities[paramName][field] = rangeValue;
      } else if (field === 'steps' || field === 'base') {
        newConfig.sensitivities[paramName][field] = parseFloat(value) || 0;
      } else {
        newConfig.sensitivities[paramName][field] = value;
      }
      
      return newConfig;
    });
  };

  const toggleSensitivityParam = (paramName) => {
    if (!sensitivityConfig) return;
    
    setSensitivityConfig(prev => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      if (!newConfig.sensitivities) {
        newConfig.sensitivities = {};
      }
      
      if (newConfig.sensitivities[paramName]) {
        // Remove the parameter
        delete newConfig.sensitivities[paramName];
      } else {
        // Add the parameter with defaults
        newConfig.sensitivities[paramName] = {
          type: 'multiplier',
          base: 1.0,
          range: [-0.10, 0.10],
          steps: 3
        };
      }
      
      return newConfig;
    });
  };

  const availableParams = [
    { key: 'volume', label: 'Volume', defaultType: 'multiplier', defaultBase: 1.0, defaultRange: [-0.10, 0.10] },
    { key: 'capex', label: 'CAPEX', defaultType: 'multiplier', defaultBase: 1.0, defaultRange: [-0.05, 0.05] },
    { key: 'electricity_price', label: 'Electricity Price', defaultType: 'absolute_adjustment', defaultBase: 0.0, defaultRange: [-5.0, 5.0] },
    { key: 'green_price', label: 'Green Price', defaultType: 'absolute_adjustment', defaultBase: 0.0, defaultRange: [-2.0, 2.0] },
    { key: 'opex', label: 'OPEX', defaultType: 'multiplier', defaultBase: 1.0, defaultRange: [-0.08, 0.08] },
    { key: 'interest_rate', label: 'Interest Rate', defaultType: 'basis_points_adjustment', defaultBase: 0, defaultRange: [-50, 50] },
    { key: 'terminal_value', label: 'Terminal Value', defaultType: 'multiplier', defaultBase: 1.0, defaultRange: [-0.15, 0.15] }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Target className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sensitivity Analysis</h1>
                <p className="text-gray-600 mt-1">
                  Configure general sensitivity parameters for all portfolios
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchSensitivityConfig}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={saveSensitivityConfig}
                disabled={saving || !sensitivityConfig}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {status.type && (
          <div className={`mb-6 p-4 rounded-lg border flex items-center space-x-2 ${
            status.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {status.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        {/* Configuration Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Sensitivity Parameters</h2>
            <p className="text-sm text-gray-600">
              Enable and configure parameters to vary in sensitivity analysis. Each parameter will be tested across a range of values.
            </p>
          </div>

          <div className="space-y-4">
            {availableParams.map(param => {
              const paramConfig = sensitivityConfig?.sensitivities?.[param.key];
              const isEnabled = !!paramConfig;
              
              return (
                <div key={param.key} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => toggleSensitivityParam(param.key)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
                      />
                      <span className="text-base font-semibold text-gray-900">
                        {param.label}
                      </span>
                    </label>
                  </div>
                  
                  {isEnabled && (
                    <div className="mt-4 pl-8 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={paramConfig.type || param.defaultType}
                            onChange={(e) => updateSensitivityParam(param.key, 'type', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="multiplier">Multiplier</option>
                            <option value="absolute_adjustment">Absolute Adjustment</option>
                            <option value="basis_points_adjustment">Basis Points</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Base Value</label>
                          <input
                            type="number"
                            step="0.01"
                            value={paramConfig.base ?? param.defaultBase}
                            onChange={(e) => updateSensitivityParam(param.key, 'base', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Range Min</label>
                          <input
                            type="number"
                            step="0.01"
                            value={paramConfig.range?.[0] ?? param.defaultRange[0]}
                            onChange={(e) => {
                              const newRange = [...(paramConfig.range || param.defaultRange)];
                              newRange[0] = parseFloat(e.target.value) || 0;
                              updateSensitivityParam(param.key, 'range', newRange);
                            }}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Range Max</label>
                          <input
                            type="number"
                            step="0.01"
                            value={paramConfig.range?.[1] ?? param.defaultRange[1]}
                            onChange={(e) => {
                              const newRange = [...(paramConfig.range || param.defaultRange)];
                              newRange[1] = parseFloat(e.target.value) || 0;
                              updateSensitivityParam(param.key, 'range', newRange);
                            }}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Steps</label>
                          <input
                            type="number"
                            min="2"
                            max="10"
                            value={paramConfig.steps ?? 3}
                            onChange={(e) => updateSensitivityParam(param.key, 'steps', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">Number of values to test (excluding base)</p>
                        </div>
                        {paramConfig.type === 'absolute_adjustment' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                            <input
                              type="text"
                              value={paramConfig.unit || 'per_mwh'}
                              onChange={(e) => updateSensitivityParam(param.key, 'unit', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                              placeholder="per_mwh"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Additional Settings */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Output Collection Prefix
                </label>
                <input
                  type="text"
                  value={sensitivityConfig?.output_collection_prefix || 'sensitivity_results'}
                  onChange={(e) => setSensitivityConfig(prev => ({
                    ...prev,
                    output_collection_prefix: e.target.value
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="sensitivity_results"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Prefix for sensitivity results stored in MongoDB
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-2">About Sensitivity Analysis</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Each enabled parameter will be varied across the specified range</li>
            <li>The number of steps determines how many values are tested (excluding the base case)</li>
            <li>Multiplier type multiplies the base value (e.g., 1.0 = no change, 1.1 = +10%)</li>
            <li>Absolute adjustment adds/subtracts a fixed amount</li>
            <li>Basis points adjustment changes interest rates (100 bps = 1%)</li>
            <li>Configuration is saved as general assumptions and will be used when running sensitivity analysis for all portfolios</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


