'use client'

import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle, AlertCircle, Calendar, Settings as SettingsIcon } from 'lucide-react';

// Helper function to get default model dates
const getDefaultModelDates = () => {
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear + 30}-12-31`;
  return { startDate, endDate };
};

export default function ModelDefaultsPage() {
  const defaultDates = getDefaultModelDates();
  const [modelSettings, setModelSettings] = useState({
    useAssetStartDates: true,
    userModelStartDate: defaultDates.startDate,
    userModelEndDate: defaultDates.endDate,
    defaultCapexFundingType: 'equity_first',
    defaultDebtRepaymentFrequency: 'quarterly',
    defaultDebtGracePeriod: 'full_period',
    defaultDebtSizingMethod: 'dscr',
    dscrCalculationFrequency: 'quarterly',
    taxRate: 0.00,
    defaultAssetLifeYears: 20,
    enableTerminalValue: true,
    minCashBalanceForDistribution: 2.0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  useEffect(() => {
    fetchModelSettings();
  }, []);

  const fetchModelSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/model-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setModelSettings(prev => ({
            ...prev,
            ...data.settings,
            // Use defaults if dates are not set
            userModelStartDate: data.settings.userModelStartDate || defaultDates.startDate,
            userModelEndDate: data.settings.userModelEndDate || defaultDates.endDate,
          }));
        }
      } else {
        // If not found, use defaults
        console.log('No saved settings found, using defaults');
      }
    } catch (error) {
      console.error('Error fetching model settings:', error);
      setStatus({ type: 'error', message: 'Failed to load settings. Using defaults.' });
    } finally {
      setLoading(false);
    }
  };

  const saveModelSettings = async () => {
    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/model-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelSettings),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setStatus({ type: 'success', message: 'Model settings saved successfully!' });
    } catch (error) {
      console.error('Error saving model settings:', error);
      setStatus({ type: 'error', message: `Failed to save: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setModelSettings(prev => ({
      ...prev,
      [field]: field === 'enableTerminalValue' ? value : 
               field === 'taxRate' || field === 'defaultAssetLifeYears' || field === 'minCashBalanceForDistribution' 
               ? parseFloat(value) || 0 : value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading model settings...</p>
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
                <h1 className="text-3xl font-bold text-gray-900">Model Defaults</h1>
                <p className="text-gray-600 mt-1">
                  Configure model period, tax, depreciation, and other calculation defaults
                </p>
              </div>
            </div>
            <button
              onClick={saveModelSettings}
              disabled={saving}
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
                  <span>Save Settings</span>
                </>
              )}
            </button>
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

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Model Period */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Model Period</h2>
            </div>
            
            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modelSettings.useAssetStartDates}
                  onChange={(e) => handleInputChange('useAssetStartDates', e.target.checked)}
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
                  onChange={(e) => handleInputChange('userModelStartDate', e.target.value)}
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
                  onChange={(e) => handleInputChange('userModelEndDate', e.target.value)}
                  disabled={modelSettings.useAssetStartDates}
                  className={`w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 ${
                    modelSettings.useAssetStartDates ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="Custom end date"
                />
              </div>
            </div>
          </div>

          {/* Tax */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={modelSettings.taxRate * 100}
                  onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) / 100 || 0)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current: {(modelSettings.taxRate * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

