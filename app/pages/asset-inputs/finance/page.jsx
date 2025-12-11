'use client'

import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { usePortfolio } from '../../../context/PortfolioContext';

export default function FinancePage() {
  const { selectedPortfolio, getPortfolioUniqueId } = usePortfolio();
  const [financeSettings, setFinanceSettings] = useState({
    defaultCapexFundingType: 'equity_first',
    debtRepaymentDscrFrequency: 'quarterly',
    defaultDebtGracePeriod: 'prorate',
    defaultDebtSizingMethod: 'dscr',
    defaultInterestRate: 0.06,
    defaultDebtTermYears: 18,
    targetDSCRContract: 1.4,
    targetDSCRMerchant: 1.8,
    maxGearing: 0.70,
    defaultAssetLifeYears: 20,
    enableTerminalValue: true,
    minCashBalanceForDistribution: 2.0,
    taxRate: 0.00,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  useEffect(() => {
    fetchFinanceSettings();
    fetchAssets();
  }, [selectedPortfolio]);

  const fetchFinanceSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/model-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          // Handle backward compatibility: map old fields to new combined field
          let debtRepaymentDscrFrequency = data.settings.debtRepaymentDscrFrequency;
          if (!debtRepaymentDscrFrequency) {
            // If new field doesn't exist, use old fields (prefer dscrCalculationFrequency, fallback to defaultDebtRepaymentFrequency)
            debtRepaymentDscrFrequency = data.settings.dscrCalculationFrequency || 
                                        data.settings.defaultDebtRepaymentFrequency || 
                                        'quarterly';
          }
          
          setFinanceSettings(prev => ({
            ...prev,
            defaultCapexFundingType: data.settings.defaultCapexFundingType || prev.defaultCapexFundingType,
            debtRepaymentDscrFrequency: debtRepaymentDscrFrequency || prev.debtRepaymentDscrFrequency,
            defaultDebtGracePeriod: data.settings.defaultDebtGracePeriod || prev.defaultDebtGracePeriod,
            defaultDebtSizingMethod: data.settings.defaultDebtSizingMethod || prev.defaultDebtSizingMethod,
            defaultInterestRate: data.settings.defaultInterestRate ?? prev.defaultInterestRate,
            defaultDebtTermYears: data.settings.defaultDebtTermYears ?? prev.defaultDebtTermYears,
            targetDSCRContract: data.settings.targetDSCRContract ?? prev.targetDSCRContract,
            targetDSCRMerchant: data.settings.targetDSCRMerchant ?? prev.targetDSCRMerchant,
            maxGearing: data.settings.maxGearing ?? prev.maxGearing,
            defaultAssetLifeYears: data.settings.defaultAssetLifeYears ?? prev.defaultAssetLifeYears,
            enableTerminalValue: data.settings.enableTerminalValue ?? prev.enableTerminalValue,
            minCashBalanceForDistribution: data.settings.minCashBalanceForDistribution ?? prev.minCashBalanceForDistribution,
            taxRate: data.settings.taxRate ?? prev.taxRate,
          }));
        }
      } else {
        // If not found, use defaults
        console.log('No saved settings found, using defaults');
      }
    } catch (error) {
      console.error('Error fetching finance settings:', error);
      setStatus({ type: 'error', message: 'Failed to load settings. Using defaults.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    setAssetsLoading(true);
    try {
      const portfolioToUse = selectedPortfolio || 'ZEBRE';
      const uniqueId = getPortfolioUniqueId(portfolioToUse);
      if (!uniqueId) {
        console.error('Finance page - No unique_id found for portfolio:', portfolioToUse);
        setAssets([]);
        setAssetsLoading(false);
        return;
      }

      const response = await fetch(`/api/assets?unique_id=${encodeURIComponent(uniqueId)}`);
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      } else {
        console.error('Failed to fetch assets');
        setAssets([]);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      setAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  };

  const saveFinanceSettings = async () => {
    setSaving(true);
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

      // Merge finance settings with existing settings
      const updatedSettings = {
        ...currentSettings,
        ...financeSettings,
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

      const result = await response.json();
      setStatus({ type: 'success', message: 'Finance settings saved successfully!' });
    } catch (error) {
      console.error('Error saving finance settings:', error);
      setStatus({ type: 'error', message: `Failed to save: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFinanceSettings(prev => ({
      ...prev,
      [field]: field === 'defaultInterestRate' || field === 'targetDSCRContract' || 
               field === 'targetDSCRMerchant' || field === 'maxGearing' ||
               field === 'minCashBalanceForDistribution' || field === 'taxRate'
               ? parseFloat(value) || 0
               : field === 'defaultDebtTermYears' || field === 'defaultAssetLifeYears'
               ? parseInt(value) || 0
               : field === 'enableTerminalValue'
               ? value
               : value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading finance settings...</p>
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
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Finance</h1>
                <p className="text-gray-600 mt-1">
                  Configure CAPEX and debt settings for the cash flow model
                </p>
              </div>
            </div>
            <button
              onClick={saveFinanceSettings}
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

        {/* CAPEX & Debt Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">CAPEX & Debt Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CAPEX Funding Type
              </label>
              <select
                value={financeSettings.defaultCapexFundingType}
                onChange={(e) => handleInputChange('defaultCapexFundingType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="equity_first">Equity First (equity used first, then debt)</option>
                <option value="pari_passu">Pari Passu (proportional equity and debt)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                How CAPEX is funded during construction
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Debt Sizing Method
                </label>
                <select
                  value={financeSettings.defaultDebtSizingMethod}
                  onChange={(e) => handleInputChange('defaultDebtSizingMethod', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="dscr">DSCR (Debt Service Coverage Ratio)</option>
                  <option value="annuity">Annuity (Fixed Annuity Payment)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Debt Repayment / DSCR Frequency
                </label>
                <select
                  value={financeSettings.debtRepaymentDscrFrequency}
                  onChange={(e) => handleInputChange('debtRepaymentDscrFrequency', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Used for both DSCR calculation and debt repayment frequency
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Debt Grace Period
              </label>
              <select
                value={financeSettings.defaultDebtGracePeriod}
                onChange={(e) => handleInputChange('defaultDebtGracePeriod', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="prorate">Prorate (immediate prorated payment - default)</option>
                <option value="none">None (immediate payment, prorated if partial period)</option>
                <option value="full_period">Full Period (after first full period)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Determines when debt payments start if operations begin mid-period
              </p>
            </div>
          </div>
        </div>

        {/* Asset-Level Debt Terms, DSCR, and Gearing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Debt Terms, DSCR, and Gearing (Asset-Level)</h2>
          <p className="text-sm text-gray-600 mb-4">
            These values are set on an asset-level basis and are read-only. To modify these values, edit the individual assets.
          </p>
          {assetsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
              <span className="text-gray-600">Loading assets...</span>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No assets found for the current portfolio.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asset Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Debt Term (years)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Interest Rate (%)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DSCR Contract
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DSCR Merchant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gearing (%)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assets.map((asset) => {
                    // Get values from various possible field names and parse them
                    const debtTermRaw = asset.cost_tenorYears || asset.tenorYears || asset.tenor || asset.debtTenor;
                    const debtTerm = debtTermRaw != null && debtTermRaw !== '' ? parseFloat(debtTermRaw) : null;
                    
                    const interestRateRaw = asset.cost_interestRate || asset.interestRate || asset.interest_rate || asset.debtInterestRate;
                    const interestRate = interestRateRaw != null && interestRateRaw !== '' ? parseFloat(interestRateRaw) : null;
                    
                    const dscrContractRaw = asset.cost_targetDSCRContract || asset.targetDSCRContract || asset.contractDSCR;
                    const dscrContract = dscrContractRaw != null && dscrContractRaw !== '' ? parseFloat(dscrContractRaw) : null;
                    
                    const dscrMerchantRaw = asset.cost_targetDSCRMerchant || asset.targetDSCRMerchant || asset.merchantDSCR;
                    const dscrMerchant = dscrMerchantRaw != null && dscrMerchantRaw !== '' ? parseFloat(dscrMerchantRaw) : null;
                    
                    const gearingRaw = asset.cost_maxGearing || asset.maxGearing || asset.max_gearing || asset.gearing;
                    const gearing = gearingRaw != null && gearingRaw !== '' ? parseFloat(gearingRaw) : null;
                    
                    return (
                      <tr key={asset.asset_id || asset._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {asset.asset_name || asset.name || `Asset ${asset.asset_id || ''}`}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {debtTerm != null ? debtTerm : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {interestRate != null ? (interestRate * 100).toFixed(2) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {dscrContract != null ? dscrContract.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {dscrMerchant != null ? dscrMerchant.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {gearing != null ? (gearing * 100).toFixed(1) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Depreciation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Depreciation</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Asset Life (years)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="50"
                value={financeSettings.defaultAssetLifeYears}
                onChange={(e) => handleInputChange('defaultAssetLifeYears', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used for straight-line depreciation and amortization calculations
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Annual depreciation = CAPEX / Asset Life
              </p>
            </div>
          </div>
        </div>

        {/* Tax */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={financeSettings.taxRate * 100}
                onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) / 100 || 0)}
                className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Current: {(financeSettings.taxRate * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Terminal Value & Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Terminal Value & Distribution</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enableTerminalValue"
                checked={financeSettings.enableTerminalValue}
                onChange={(e) => handleInputChange('enableTerminalValue', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="enableTerminalValue" className="text-sm font-medium text-gray-700">
                Enable Terminal Value Calculation
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              When enabled, terminal value is calculated at the end of the asset life and included in cash flow distributions
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Cash Balance for Distribution ($M)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={financeSettings.minCashBalanceForDistribution}
                onChange={(e) => handleInputChange('minCashBalanceForDistribution', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum cash balance that must be maintained before distributions to equity holders
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

