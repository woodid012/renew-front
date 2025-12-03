'use client'

import { useState, useEffect } from 'react';
import { useDisplaySettings, CURRENCY_UNITS } from '@/app/context/DisplaySettingsContext';
import { Save, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';

export default function DisplaySettingsPage() {
  const { currencyUnit, updateCurrencyUnit, CURRENCY_UNITS: units } = useDisplaySettings();
  const [selectedUnit, setSelectedUnit] = useState(currencyUnit);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    setSelectedUnit(currencyUnit);
  }, [currencyUnit]);

  const handleSave = () => {
    updateCurrencyUnit(selectedUnit);
    setStatus({ type: 'success', message: 'Display settings saved successfully!' });
    setTimeout(() => setStatus({ type: '', message: '' }), 3000);
  };

  const handleReset = () => {
    setSelectedUnit(currencyUnit);
    setStatus({ type: '', message: '' });
  };

  const hasChanges = selectedUnit !== currencyUnit;

  const formatExample = (value, unit) => {
    switch (unit) {
      case units.MILLIONS:
        return `$${(value / 1000000).toFixed(1)}M`;
      case units.THOUSANDS:
        return `$${(value / 1000).toFixed(0)}k`;
      case units.DOLLARS:
        return `$${value.toLocaleString()}`;
      default:
        return `$${(value / 1000000).toFixed(1)}M`;
    }
  };

  const exampleValue = 5000000; // $5M example

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Display Settings</h1>
              <p className="text-gray-600">
                Configure how financial values are displayed throughout the application
              </p>
            </div>
            <div className="flex space-x-3">
              {hasChanges && (
                <button
                  onClick={handleReset}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition"
                >
                  <span>Reset</span>
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className={`px-6 py-2 rounded-lg flex items-center space-x-2 transition ${
                  hasChanges
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/50'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-5 h-5" />
                <span className="font-semibold">Save Changes</span>
              </button>
            </div>
          </div>

          {/* Status Message */}
          {status.message && (
            <div
              className={`mt-4 p-4 rounded-lg flex items-center space-x-2 ${
                status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{status.message}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Currency Units Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <DollarSign className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Currency Display Format</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Choose how financial values are displayed throughout the application. This setting applies globally to all currency displays.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Millions Option */}
              <label
                className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedUnit === units.MILLIONS
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="radio"
                    name="currencyUnit"
                    value={units.MILLIONS}
                    checked={selectedUnit === units.MILLIONS}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-lg font-semibold text-gray-900">$M (Millions)</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Display values in millions of dollars
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatExample(exampleValue, units.MILLIONS)}
                  </span>
                </div>
              </label>

              {/* Thousands Option */}
              <label
                className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedUnit === units.THOUSANDS
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="radio"
                    name="currencyUnit"
                    value={units.THOUSANDS}
                    checked={selectedUnit === units.THOUSANDS}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-lg font-semibold text-gray-900">$000 (Thousands)</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Display values in thousands of dollars
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatExample(exampleValue, units.THOUSANDS)}
                  </span>
                </div>
              </label>

              {/* Dollars Option */}
              <label
                className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedUnit === units.DOLLARS
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="radio"
                    name="currencyUnit"
                    value={units.DOLLARS}
                    checked={selectedUnit === units.DOLLARS}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-lg font-semibold text-gray-900">$ (Dollars)</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Display values in full dollars
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatExample(exampleValue, units.DOLLARS)}
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">About Display Settings</h4>
              <p className="text-sm text-blue-800">
                These settings control how financial values are formatted and displayed across all pages in the application.
                Changes take effect immediately after saving. The selected format will be applied to all currency displays including
                CAPEX, OPEX, revenue, cash flows, and other financial metrics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

