'use client'

import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle, AlertCircle, Calendar, Settings as SettingsIcon, Sun, Wind, Battery, DollarSign, TrendingUp } from 'lucide-react';

// Helper function to get default model dates
const getDefaultModelDates = () => {
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear + 30}-12-31`;
  return { startDate, endDate };
};

export default function GeneralPage() {
  const defaultDates = getDefaultModelDates();
  const [modelSettings, setModelSettings] = useState({
    useAssetStartDates: true,
    userModelStartDate: defaultDates.startDate,
    userModelEndDate: defaultDates.endDate,
    minimumModelStartDate: '2025-01-01',
  });
  const [assetDefaults, setAssetDefaults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingModelSettings, setSavingModelSettings] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [generalTab, setGeneralTab] = useState('model-period');
  const [defaultsTab, setDefaultsTab] = useState('solar');

  useEffect(() => {
    fetchModelSettings();
    fetchAssetDefaults();
  }, []);

  useEffect(() => {
    if (modelSettings && assetDefaults !== null) {
      setLoading(false);
    }
  }, [modelSettings, assetDefaults]);

  const fetchModelSettings = async () => {
    try {
      const response = await fetch('/api/model-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setModelSettings(prev => ({
            ...prev,
            useAssetStartDates: data.settings.useAssetStartDates ?? prev.useAssetStartDates,
            userModelStartDate: data.settings.userModelStartDate || defaultDates.startDate,
            userModelEndDate: data.settings.userModelEndDate || defaultDates.endDate,
            minimumModelStartDate: data.settings.minimumModelStartDate || '2025-01-01',
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching model settings:', error);
    }
  };

  const fetchAssetDefaults = async () => {
    try {
      const response = await fetch('/api/asset-defaults');
      if (response.ok) {
        const data = await response.json();
        setAssetDefaults(data);
      }
    } catch (error) {
      console.error('Error fetching asset defaults:', error);
    }
  };

  const saveModelSettings = async () => {
    setSavingModelSettings(true);
    setStatus({ type: null, message: '' });

    try {
      // First, fetch current model settings to preserve other settings
      const currentResponse = await fetch('/api/model-settings');
      let currentSettings = {};
      if (currentResponse.ok) {
        const currentData = await currentResponse.json();
        if (currentData.settings) {
          currentSettings = currentData.settings;
        }
      }

      // Merge model settings with existing settings
      const updatedSettings = {
        ...currentSettings,
        ...modelSettings,
      };

      const response = await fetch('/api/model-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      setStatus({ type: 'success', message: 'Model settings saved successfully!' });
    } catch (error) {
      console.error('Error saving model settings:', error);
      setStatus({ type: 'error', message: `Failed to save model settings: ${error.message}` });
    } finally {
      setSavingModelSettings(false);
    }
  };

  const saveAssetDefaults = async () => {
    if (!assetDefaults) return;
    
    setSavingDefaults(true);
    setStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/asset-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetDefaults),
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'Asset defaults saved successfully!' });
      } else {
        setStatus({ type: 'error', message: 'Failed to save asset defaults' });
      }
    } catch (error) {
      console.error('Error saving asset defaults:', error);
      setStatus({ type: 'error', message: 'Error saving asset defaults' });
    } finally {
      setSavingDefaults(false);
    }
  };

  const handleModelSettingsChange = (field, value) => {
    setModelSettings(prev => ({
      ...prev,
      [field]: field === 'useAssetStartDates' ? value : value
    }));
  };

  const updateAssetDefault = (assetType, field, value) => {
    if (!assetDefaults) return;
    setAssetDefaults({
      ...assetDefaults,
      assetDefaults: {
        ...assetDefaults.assetDefaults,
        [assetType]: {
          ...assetDefaults.assetDefaults[assetType],
          [field]: value
        }
      }
    });
  };

  const updateCostAssumption = (assetType, field, value) => {
    if (!assetDefaults) return;
    setAssetDefaults({
      ...assetDefaults,
      assetDefaults: {
        ...assetDefaults.assetDefaults,
        [assetType]: {
          ...assetDefaults.assetDefaults[assetType],
          costAssumptions: {
            ...assetDefaults.assetDefaults[assetType].costAssumptions,
            [field]: parseFloat(value) || 0
          }
        }
      }
    });
  };

  const updateCapacityFactor = (assetType, region, quarter, value) => {
    if (!assetDefaults) return;
    setAssetDefaults({
      ...assetDefaults,
      assetDefaults: {
        ...assetDefaults.assetDefaults,
        [assetType]: {
          ...assetDefaults.assetDefaults[assetType],
          capacityFactors: {
            ...assetDefaults.assetDefaults[assetType].capacityFactors,
            [region]: {
              ...assetDefaults.assetDefaults[assetType].capacityFactors[region],
              [quarter]: parseFloat(value) || 0
            }
          }
        }
      }
    });
  };

  const assetTypes = [
    { id: 'solar', name: 'Solar', icon: Sun, color: 'yellow' },
    { id: 'wind', name: 'Wind', icon: Wind, color: 'blue' },
    { id: 'storage', name: 'Storage', icon: Battery, color: 'green' }
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
              <SettingsIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">General</h1>
                <p className="text-gray-600 mt-1">
                  Configure model period and asset defaults
                </p>
              </div>
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

        {/* General Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SettingsIcon className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
              </div>
              <div className="flex space-x-2">
                {generalTab === 'model-period' && (
                  <button
                    onClick={saveModelSettings}
                    disabled={savingModelSettings}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {savingModelSettings ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                )}
                {generalTab === 'defaults' && (
                  <button
                    onClick={saveAssetDefaults}
                    disabled={savingDefaults || !assetDefaults}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {savingDefaults ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* General Tabs */}
          <div className="border-b border-gray-200 px-6">
            <nav className="flex space-x-4">
              <button
                onClick={() => setGeneralTab('model-period')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  generalTab === 'model-period'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Model Period</span>
                </div>
              </button>
              <button
                onClick={() => setGeneralTab('defaults')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  generalTab === 'defaults'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <SettingsIcon className="w-4 h-4" />
                  <span>Defaults</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Model Period Tab */}
          {generalTab === 'model-period' && (
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Model Start Date
                </label>
                <input
                  type="date"
                  value={modelSettings.minimumModelStartDate}
                  onChange={(e) => handleModelSettingsChange('minimumModelStartDate', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Minimum start date"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The model start date will be set to max(earliest asset start date, minimum model start date). 
                  This ensures price curve data is available and prevents errors. Default: 1/1/2025.
                </p>
              </div>

              <div className="mb-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modelSettings.useAssetStartDates}
                    onChange={(e) => handleModelSettingsChange('useAssetStartDates', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Use asset start dates (auto-calculate from asset data)
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  When checked, model dates are automatically calculated from asset construction and operations start dates.
                  When unchecked, use the custom dates below.
                </p>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${modelSettings.useAssetStartDates ? 'opacity-50' : ''}`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model Start Date
                  </label>
                  <input
                    type="date"
                    value={modelSettings.userModelStartDate}
                    onChange={(e) => handleModelSettingsChange('userModelStartDate', e.target.value)}
                    disabled={modelSettings.useAssetStartDates}
                    className={`w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 ${
                      modelSettings.useAssetStartDates ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="Custom start date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model End Date
                  </label>
                  <input
                    type="date"
                    value={modelSettings.userModelEndDate}
                    onChange={(e) => handleModelSettingsChange('userModelEndDate', e.target.value)}
                    disabled={modelSettings.useAssetStartDates}
                    className={`w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 ${
                      modelSettings.useAssetStartDates ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    placeholder="Custom end date"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Defaults Tab */}
          {generalTab === 'defaults' && assetDefaults && (
            <div className="p-6">
              {/* Asset Type Tabs */}
              <div className="mb-6">
                <nav className="flex space-x-2">
                  {assetTypes.map(({ id, name, icon: Icon, color }) => {
                    const isActive = defaultsTab === id;
                    const activeClasses = {
                      yellow: 'bg-yellow-100 text-yellow-800',
                      blue: 'bg-blue-100 text-blue-800',
                      green: 'bg-green-100 text-green-800'
                    };
                    return (
                      <button
                        key={id}
                        onClick={() => setDefaultsTab(id)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                          isActive
                            ? `${activeClasses[color]} font-semibold`
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{name}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {assetDefaults.assetDefaults && assetDefaults.assetDefaults[defaultsTab] && (
                <>
                  {(() => {
                    const currentAsset = assetDefaults.assetDefaults[defaultsTab];
                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* General Settings */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <SettingsIcon className="w-5 h-5 mr-2" />
                            General Settings
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Asset Life (years)
                              </label>
                              <input
                                type="number"
                                value={currentAsset.assetLife}
                                onChange={(e) => updateAssetDefault(defaultsTab, 'assetLife', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Volume Loss Adjustment (%)
                              </label>
                              <input
                                type="number"
                                value={currentAsset.volumeLossAdjustment}
                                onChange={(e) => updateAssetDefault(defaultsTab, 'volumeLossAdjustment', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Annual Degradation (%)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                value={currentAsset.annualDegradation}
                                onChange={(e) => updateAssetDefault(defaultsTab, 'annualDegradation', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Construction Duration (months)
                              </label>
                              <input
                                type="number"
                                value={currentAsset.constructionDuration}
                                onChange={(e) => updateAssetDefault(defaultsTab, 'constructionDuration', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Cost Assumptions */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <DollarSign className="w-5 h-5 mr-2" />
                            Cost Assumptions
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                CAPEX per MW ($M/MW)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                value={currentAsset.costAssumptions.capexPerMW}
                                onChange={(e) => updateCostAssumption(defaultsTab, 'capexPerMW', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                OPEX per MW per Year ($M/MW/yr)
                              </label>
                              <input
                                type="number"
                                step="0.001"
                                value={currentAsset.costAssumptions.opexPerMWPerYear}
                                onChange={(e) => updateCostAssumption(defaultsTab, 'opexPerMWPerYear', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Gearing (%)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={currentAsset.costAssumptions.maxGearing * 100}
                                onChange={(e) => updateCostAssumption(defaultsTab, 'maxGearing', parseFloat(e.target.value) / 100)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Interest Rate (%)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={currentAsset.costAssumptions.interestRate * 100}
                                onChange={(e) => updateCostAssumption(defaultsTab, 'interestRate', parseFloat(e.target.value) / 100)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Debt Tenor (years)
                              </label>
                              <input
                                type="number"
                                value={currentAsset.costAssumptions.tenorYears}
                                onChange={(e) => updateCostAssumption(defaultsTab, 'tenorYears', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Capacity Factors (only for solar/wind) */}
                  {defaultsTab !== 'storage' && assetDefaults.assetDefaults[defaultsTab].capacityFactors && (
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Regional Capacity Factors (%)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Q1</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Q2</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Q3</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Q4</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Average</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(assetDefaults.assetDefaults[defaultsTab].capacityFactors).map(([region, factors]) => {
                              const avg = ((factors.q1 + factors.q2 + factors.q3 + factors.q4) / 4).toFixed(1);
                              return (
                                <tr key={region}>
                                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{region}</td>
                                  {['q1', 'q2', 'q3', 'q4'].map(q => (
                                    <td key={q} className="px-6 py-4 whitespace-nowrap">
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={factors[q]}
                                        onChange={(e) => updateCapacityFactor(defaultsTab, region, q, e.target.value)}
                                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                      />
                                    </td>
                                  ))}
                                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{avg}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

