// app/pages/settings/asset-defaults/page.jsx
'use client'

import { useState, useEffect } from 'react';
import {
    Save,
    RotateCcw,
    CheckCircle,
    AlertCircle,
    Sun,
    Wind,
    Battery,
    Settings,
    DollarSign,
    TrendingUp,
    Calendar
} from 'lucide-react';

export default function AssetDefaultsPage() {
    const [defaults, setDefaults] = useState(null);
    const [originalDefaults, setOriginalDefaults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '', hint: '' });
    const [activeTab, setActiveTab] = useState('solar');
    const [hasChanges, setHasChanges] = useState(false);
    const [initializing, setInitializing] = useState(false);

    useEffect(() => {
        loadDefaults();
    }, []);

    useEffect(() => {
        if (defaults && originalDefaults) {
            const changed = JSON.stringify(defaults) !== JSON.stringify(originalDefaults);
            setHasChanges(changed);
        }
    }, [defaults, originalDefaults]);

    const loadDefaults = async () => {
        setLoading(true);
        setStatus({ type: '', message: '', hint: '' });
        try {
            const response = await fetch('/api/asset-defaults');
            
            // Check if response is ok before trying to parse JSON
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Error parsing JSON response:', parseError);
                setStatus({ 
                    type: 'error', 
                    message: 'Invalid response from server', 
                    hint: 'The server returned an invalid response. Please check the server logs.' 
                });
                setDefaults(null);
                setLoading(false);
                return;
            }

            if (response.ok && data && data.assetDefaults && data.platformDefaults) {
                setDefaults(data);
                setOriginalDefaults(JSON.parse(JSON.stringify(data)));
                setStatus({ type: '', message: '', hint: '' });
            } else if (response.ok && data) {
                // Status 200 but invalid structure - log what we got
                console.error('Invalid data structure received:', {
                    hasAssetDefaults: !!data.assetDefaults,
                    hasPlatformDefaults: !!data.platformDefaults,
                    keys: Object.keys(data),
                    data: data
                });
                setStatus({ 
                    type: 'error', 
                    message: 'Invalid data structure received from server',
                    hint: 'The server returned data but it is missing required fields (assetDefaults or platformDefaults). Please check the MongoDB document structure.'
                });
                setDefaults(null);
            } else {
                // More detailed error handling
                const errorMessage = data?.error || `Failed to load defaults (Status: ${response.status})`;
                const hint = data?.hint || data?.details || 'Please check your MongoDB connection and try initializing defaults.';
                console.error('API Error:', { status: response.status, statusText: response.statusText, data });
                setStatus({ type: 'error', message: errorMessage, hint });
                setDefaults(null);
            }
        } catch (error) {
            console.error('Error loading defaults:', error);
            setStatus({ 
                type: 'error', 
                message: `Error loading defaults: ${error.message}`, 
                hint: 'Please check your network connection and MongoDB configuration.' 
            });
            setDefaults(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setStatus({ type: '', message: '' });

        try {
            const response = await fetch('/api/asset-defaults', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(defaults),
            });

            if (response.ok) {
                setOriginalDefaults(JSON.parse(JSON.stringify(defaults)));
                setStatus({ type: 'success', message: 'Defaults saved successfully!' });
                setHasChanges(false);
            } else {
                setStatus({ type: 'error', message: 'Failed to save defaults' });
            }
        } catch (error) {
            console.error('Error saving defaults:', error);
            setStatus({ type: 'error', message: 'Error saving defaults' });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (confirm('Reset all changes to last saved values?')) {
            setDefaults(JSON.parse(JSON.stringify(originalDefaults)));
            setStatus({ type: '', message: '', hint: '' });
        }
    };

    const handleInitialize = async () => {
        if (!confirm('Initialize default asset defaults? This will create default values in MongoDB.')) {
            return;
        }

        setInitializing(true);
        setStatus({ type: '', message: '', hint: '' });
        
        try {
            const response = await fetch('/api/asset-defaults', {
                method: 'PUT',
            });
            const data = await response.json();

            if (response.ok) {
                setStatus({ type: 'success', message: data.message || 'Defaults initialized successfully!', hint: '' });
                // Reload defaults after initialization
                setTimeout(() => {
                    loadDefaults();
                }, 1000);
            } else if (response.status === 409) {
                // Defaults already exist - just reload them
                setStatus({ 
                    type: 'info', 
                    message: 'Defaults already exist in MongoDB',
                    hint: 'Loading existing defaults...'
                });
                // Reload defaults immediately
                setTimeout(() => {
                    loadDefaults();
                }, 500);
            } else {
                setStatus({ 
                    type: 'error', 
                    message: data.error || 'Failed to initialize defaults',
                    hint: data.hint || ''
                });
            }
        } catch (error) {
            console.error('Error initializing defaults:', error);
            setStatus({ 
                type: 'error', 
                message: 'Error initializing defaults',
                hint: 'Please check your network connection and try again.'
            });
        } finally {
            setInitializing(false);
        }
    };

    const updateAssetDefault = (assetType, field, value) => {
        setDefaults({
            ...defaults,
            assetDefaults: {
                ...defaults.assetDefaults,
                [assetType]: {
                    ...defaults.assetDefaults[assetType],
                    [field]: value
                }
            }
        });
    };

    const updateCostAssumption = (assetType, field, value) => {
        setDefaults({
            ...defaults,
            assetDefaults: {
                ...defaults.assetDefaults,
                [assetType]: {
                    ...defaults.assetDefaults[assetType],
                    costAssumptions: {
                        ...defaults.assetDefaults[assetType].costAssumptions,
                        [field]: parseFloat(value) || 0
                    }
                }
            }
        });
    };

    const updateCapacityFactor = (assetType, region, quarter, value) => {
        setDefaults({
            ...defaults,
            assetDefaults: {
                ...defaults.assetDefaults,
                [assetType]: {
                    ...defaults.assetDefaults[assetType],
                    capacityFactors: {
                        ...defaults.assetDefaults[assetType].capacityFactors,
                        [region]: {
                            ...defaults.assetDefaults[assetType].capacityFactors[region],
                            [quarter]: parseFloat(value) || 0
                        }
                    }
                }
            }
        });
    };

    const updatePlatformDefault = (field, value) => {
        setDefaults({
            ...defaults,
            platformDefaults: {
                ...defaults.platformDefaults,
                [field]: typeof defaults.platformDefaults[field] === 'number' ? parseFloat(value) : value
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading asset defaults...</p>
                </div>
            </div>
        );
    }

    if (!defaults) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center max-w-2xl mx-auto px-4">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Asset Defaults</h2>
                    <p className="text-gray-600 mb-4">{status.message || 'Unable to load asset defaults from the database.'}</p>
                    {status.hint && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
                            <p className="text-sm font-semibold text-yellow-900 mb-1">💡 Hint:</p>
                            <p className="text-sm text-yellow-800 whitespace-pre-wrap">{status.hint}</p>
                        </div>
                    )}
                    {process.env.NODE_ENV === 'development' && (
                        <details className="mt-4 text-left">
                            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                                Debug Information
                            </summary>
                            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                                {JSON.stringify({ message: status.message, hint: status.hint }, null, 2)}
                            </pre>
                        </details>
                    )}
                    {status.type === 'success' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-green-800 font-semibold">{status.message}</p>
                        </div>
                    )}
                    {status.type === 'info' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-blue-800 font-semibold">{status.message}</p>
                            {status.hint && <p className="text-sm text-blue-700 mt-1">{status.hint}</p>}
                        </div>
                    )}
                    <div className="flex space-x-3 justify-center mt-4">
                        <button
                            onClick={loadDefaults}
                            disabled={initializing}
                            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Retry</span>
                        </button>
                        {status.type !== 'success' && (
                            <button
                                onClick={handleInitialize}
                                disabled={initializing}
                                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {initializing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Initializing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Settings className="w-4 h-4" />
                                        <span>Initialize Defaults</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const assetTypes = [
        { id: 'solar', name: 'Solar', icon: Sun, color: 'yellow' },
        { id: 'wind', name: 'Wind', icon: Wind, color: 'blue' },
        { id: 'storage', name: 'Storage', icon: Battery, color: 'green' }
    ];

    // Safety check: ensure data structure is valid
    if (activeTab === 'platform') {
        // For platform tab, check platformDefaults
        if (!defaults?.platformDefaults) {
            return (
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <p className="text-gray-600">Asset defaults data is not properly structured</p>
                        <p className="text-sm text-gray-500 mt-2">Missing platformDefaults configuration</p>
                    </div>
                </div>
            );
        }
    } else {
        // For asset tabs, check assetDefaults and the specific asset type
        if (!defaults?.assetDefaults || !defaults.assetDefaults[activeTab]) {
            return (
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <p className="text-gray-600">Asset defaults data is not properly structured</p>
                        <p className="text-sm text-gray-500 mt-2">Missing assetDefaults or {activeTab} configuration</p>
                    </div>
                </div>
            );
        }
    }

    // Only set currentAsset for asset tabs, not platform
    const currentAsset = activeTab !== 'platform' ? defaults.assetDefaults[activeTab] : null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Asset & Platform Defaults</h1>
                            <p className="text-gray-600">
                                Configure default values for new assets and platform-wide settings
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            {hasChanges && (
                                <button
                                    onClick={handleReset}
                                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>Reset</span>
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={saving || !hasChanges}
                                className={`px-6 py-2 rounded-lg flex items-center space-x-2 transition ${hasChanges
                                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/50'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {saving ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                <span className="font-semibold">{saving ? 'Saving...' : 'Save Changes'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Status Message */}
                    {status.message && (
                        <div className={`mt-4 p-4 rounded-lg flex items-center space-x-2 ${status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                            }`}>
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
                {/* Asset Type Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <nav className="flex space-x-4">
                            {assetTypes.map(({ id, name, icon: Icon, color }) => (
                                <button
                                    key={id}
                                    onClick={() => setActiveTab(id)}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${activeTab === id
                                            ? `bg-${color}-100 text-${color}-800 font-semibold`
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{name}</span>
                                </button>
                            ))}
                            <button
                                onClick={() => setActiveTab('platform')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${activeTab === 'platform'
                                        ? 'bg-purple-100 text-purple-800 font-semibold'
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <Settings className="w-5 h-5" />
                                <span>Platform</span>
                            </button>
                        </nav>
                    </div>

                    {/* Asset Settings */}
                    {activeTab !== 'platform' && (
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* General Settings */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <Settings className="w-5 h-5 mr-2" />
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
                                                onChange={(e) => updateAssetDefault(activeTab, 'assetLife', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Volume Loss Adjustment (%)
                                            </label>
                                            <input
                                                type="number"
                                                value={currentAsset.volumeLossAdjustment}
                                                onChange={(e) => updateAssetDefault(activeTab, 'volumeLossAdjustment', parseFloat(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                                                onChange={(e) => updateAssetDefault(activeTab, 'annualDegradation', parseFloat(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Construction Duration (months)
                                            </label>
                                            <input
                                                type="number"
                                                value={currentAsset.constructionDuration}
                                                onChange={(e) => updateAssetDefault(activeTab, 'constructionDuration', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                                                onChange={(e) => updateCostAssumption(activeTab, 'capexPerMW', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                                                onChange={(e) => updateCostAssumption(activeTab, 'opexPerMWPerYear', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                                                onChange={(e) => updateCostAssumption(activeTab, 'maxGearing', parseFloat(e.target.value) / 100)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                                                onChange={(e) => updateCostAssumption(activeTab, 'interestRate', parseFloat(e.target.value) / 100)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Debt Tenor (years)
                                            </label>
                                            <input
                                                type="number"
                                                value={currentAsset.costAssumptions.tenorYears}
                                                onChange={(e) => updateCostAssumption(activeTab, 'tenorYears', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                DSCR - Contracted
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={currentAsset.costAssumptions.targetDSCRContract || 1.4}
                                                onChange={(e) => updateCostAssumption(activeTab, 'targetDSCRContract', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                DSCR - Merchant
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={currentAsset.costAssumptions.targetDSCRMerchant || 1.8}
                                                onChange={(e) => updateCostAssumption(activeTab, 'targetDSCRMerchant', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Capacity Factors (only for solar/wind) */}
                            {activeTab !== 'storage' && currentAsset.capacityFactors && (
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
                                                {Object.entries(currentAsset.capacityFactors).map(([region, factors]) => {
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
                                                                        onChange={(e) => updateCapacityFactor(activeTab, region, q, e.target.value)}
                                                                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
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
                        </div>
                    )}

                    {/* Platform Settings */}
                    {activeTab === 'platform' && (
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Settings</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={defaults.platformDefaults.taxRate * 100}
                                                onChange={(e) => updatePlatformDefault('taxRate', parseFloat(e.target.value) / 100)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Inflation Rate (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={defaults.platformDefaults.inflationRate}
                                                onChange={(e) => updatePlatformDefault('inflationRate', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Price Escalation (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={defaults.platformDefaults.merchantPriceEscalationRate}
                                                onChange={(e) => updatePlatformDefault('merchantPriceEscalationRate', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Debt Settings</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Debt Sizing Method</label>
                                            <select
                                                value={defaults.platformDefaults.debtSizingMethod}
                                                onChange={(e) => updatePlatformDefault('debtSizingMethod', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            >
                                                <option value="dscr">DSCR-Based</option>
                                                <option value="gearing">Gearing Ratio</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">DSCR Calculation Frequency</label>
                                            <select
                                                value={defaults.platformDefaults.dscrCalculationFrequency}
                                                onChange={(e) => updatePlatformDefault('dscrCalculationFrequency', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            >
                                                <option value="monthly">Monthly</option>
                                                <option value="quarterly">Quarterly</option>
                                                <option value="annual">Annual</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Debt Repayment Frequency</label>
                                            <select
                                                value={defaults.platformDefaults.debtRepaymentFrequency}
                                                onChange={(e) => updatePlatformDefault('debtRepaymentFrequency', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            >
                                                <option value="monthly">Monthly</option>
                                                <option value="quarterly">Quarterly</option>
                                                <option value="semi-annual">Semi-Annual</option>
                                                <option value="annual">Annual</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-blue-900 mb-1">About Asset Defaults</h4>
                            <p className="text-sm text-blue-800">
                                These defaults are used when creating new assets. Changing these values will not affect existing assets.
                                Regional capacity factors are applied automatically based on the asset's location. All cost assumptions
                                are per MW of capacity and can be overridden for individual assets.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
