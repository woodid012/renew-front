'use client'

import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import {
    TrendingUp,
    Download,
    Calendar,
    Building2,
    BarChart3,
    Filter,
    Loader2,
    AlertCircle,
    Eye,
    Activity,
    PieChart,
    Grid3X3,
    Users,
    LayoutDashboard,
    FileText
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useDisplaySettings } from '../../context/DisplaySettingsContext';
import { formatCurrencyFromMillions, formatCurrency } from '../../utils/currencyFormatter';

Chart.register(...registerables);

// --- Shared Constants ---
const FIELDS_TO_PLOT = [
    { key: 'revenue', label: 'Total Revenue', category: 'Revenue', color: '#10b981' },
    { key: 'contractedGreenRevenue', label: 'Contracted Green Revenue', category: 'Revenue', color: '#22c55e' },
    { key: 'contractedEnergyRevenue', label: 'Contracted Energy Revenue', category: 'Revenue', color: '#06b6d4' },
    { key: 'merchantGreenRevenue', label: 'Merchant Green Revenue', category: 'Revenue', color: '#84cc16' },
    { key: 'merchantEnergyRevenue', label: 'Merchant Energy Revenue', category: 'Revenue', color: '#06b6d4' },
    { key: 'monthlyGeneration', label: 'Monthly Generation', category: 'Generation', color: '#f59e0b' },
    { key: 'avgGreenPrice', label: 'Avg Green Price', category: 'Pricing', color: '#22c55e' },
    { key: 'avgEnergyPrice', label: 'Avg Energy Price', category: 'Pricing', color: '#06b6d4' },
    { key: 'opex', label: 'Operating Expenses', category: 'Costs', color: '#ef4444' },
    { key: 'capex', label: 'Capital Expenditure', category: 'Costs', color: '#dc2626' },
    { key: 'equity_capex', label: 'Equity CAPEX', category: 'Finance', color: '#8b5cf6' },
    { key: 'debt_capex', label: 'Debt CAPEX', category: 'Finance', color: '#6366f1' },
    { key: 'cfads', label: 'CFADS', category: 'Cash Flow', color: '#10b981' },
    { key: 'debt_service', label: 'Debt Service', category: 'Finance', color: '#ef4444' },
    { key: 'ending_balance', label: 'Closing Debt Balance', category: 'Finance', color: '#a855f7' },
    { key: 'equity_cash_flow', label: 'Equity Cash Flow', category: 'Cash Flow', color: '#8b5cf6' },
    { key: 'net_income', label: 'Net Income', category: 'Profitability', color: '#059669' }
];

const PERIODS = [
    { key: 'monthly', label: 'Monthly', icon: Calendar },
    { key: 'quarterly', label: 'Quarterly', icon: Calendar },
    { key: 'yearly', label: 'Yearly', icon: Calendar },
    { key: 'fiscal_yearly', label: 'Fiscal Year', icon: Calendar }
];

const CHART_TYPES = [
    { key: 'stacked', label: 'Stacked Bar', icon: BarChart3 },
    { key: 'line', label: 'Line Chart', icon: TrendingUp },
    { key: 'individual', label: 'Individual Bars', icon: Grid3X3 }
];

// --- Helper Functions ---
const generateColors = (count) => {
    const baseColors = [
        '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
};

// This function will be defined inside components that have access to currencyUnit
// For now, we'll create a factory function
const createFormatMetricValue = (currencyUnit) => (value, field) => {
    if (field.includes('Price')) {
        // Price is in dollars per MWh, use currency formatter
        return formatCurrency(value, currencyUnit);
    } else if (field.includes('Generation')) {
        return `${(value / 1000).toFixed(1)}k MWh`;
    } else {
        // Most financial fields are in millions
        return formatCurrencyFromMillions(value, currencyUnit);
    }
};

// --- Sub-Components ---

// Helper component for individual chart
const ChartCard = ({ title, chartData, chartOptions, loading, hasData, height = 300 }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">{title}</h4>
            {loading ? (
                <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
                    <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
            ) : hasData ? (
                <div className="w-full" style={{ height: `${height}px` }}>
                    <Line data={chartData} options={chartOptions} />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-gray-400" style={{ height: `${height}px` }}>
                    <Activity className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs">No data available</p>
                </div>
            )}
        </div>
    );
};

// Helper component for stacked bar chart (for CAPEX)
const StackedBarChartCard = ({ title, chartData, chartOptions, loading, hasData, height = 300 }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">{title}</h4>
            {loading ? (
                <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
                    <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
            ) : hasData ? (
                <div className="w-full" style={{ height: `${height}px` }}>
                    <Bar data={chartData} options={chartOptions} />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-gray-400" style={{ height: `${height}px` }}>
                    <Activity className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs">No data available</p>
                </div>
            )}
        </div>
    );
};

// Helper component for dual-axis chart (for Debt Payments + DSCR)
const DualAxisChartCard = ({ title, chartData, chartOptions, loading, hasData, height = 300 }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">{title}</h4>
            {loading ? (
                <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
                    <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
            ) : hasData ? (
                <div className="w-full" style={{ height: `${height}px` }}>
                    <Line data={chartData} options={chartOptions} />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-gray-400" style={{ height: `${height}px` }}>
                    <Activity className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs">No data available</p>
                </div>
            )}
        </div>
    );
};

const AssetView = ({ assetIds, assetIdToNameMap }) => {
    const { selectedPortfolio, getPortfolioUniqueId } = usePortfolio();
    const { currencyUnit } = useDisplaySettings();
    const formatMetricValue = createFormatMetricValue(currencyUnit);
    const [selectedAssetId, setSelectedAssetId] = useState(assetIds.length > 0 ? assetIds[0].id : '');
    const [assetData, setAssetData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('yearly');
    const [customChartField, setCustomChartField] = useState('cfads');

    useEffect(() => {
        if (assetIds.length > 0 && !selectedAssetId) {
            setSelectedAssetId(assetIds[0].id);
        }
    }, [assetIds]);

    useEffect(() => {
        const fetchAssetData = async () => {
            if (selectedAssetId) {
                setLoading(true);
                setAssetData([]);
                try {
                    const uniqueId = getPortfolioUniqueId(selectedPortfolio) || selectedPortfolio || 'ZEBRE';
                    if (!uniqueId) {
                        console.error('Output page - No unique_id found for portfolio:', selectedPortfolio);
                        setLoading(false);
                        return;
                    }
                    const url = `/api/output-asset-data?asset_id=${selectedAssetId}${selectedPeriod ? `&period=${selectedPeriod}` : ''}&unique_id=${encodeURIComponent(uniqueId)}`;
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const data = await response.json();
                    setAssetData(data.data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchAssetData();
    }, [selectedAssetId, selectedPeriod, selectedPortfolio]);

    // Helper to format period labels
    const formatPeriodLabel = (item) => {
        if (selectedPeriod === 'monthly') return `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        if (selectedPeriod === 'quarterly') return `${item._id.year}-Q${item._id.quarter}`;
        if (selectedPeriod === 'yearly') return `${item._id.year}`;
        if (selectedPeriod === 'fiscal_yearly') return `FY${item._id.fiscalYear}`;
        return new Date(item.date).toLocaleDateString();
    };

    const labels = assetData.map(formatPeriodLabel);

    // Chart 1: Revenue
    const revenueChartData = {
        labels,
        datasets: [{
            label: 'Revenue',
            data: assetData.map(item => item.revenue || 0),
            fill: false,
            backgroundColor: '#10b981',
            borderColor: '#10b981',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.4
        }],
    };

    const revenueChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `Revenue: ${formatCurrencyFromMillions(context.parsed.y, currencyUnit)}`
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 45, minRotation: 45 } },
            y: {
                grid: { color: '#f3f4f6' },
                ticks: {
                    color: '#6b7280',
                    callback: (value) => formatCurrencyFromMillions(value, currencyUnit)
                }
            }
        }
    };

    // Chart 2: Volume
    const volumeChartData = {
        labels,
        datasets: [{
            label: 'Volume',
            data: assetData.map(item => item.monthlyGeneration || 0),
            fill: false,
            backgroundColor: '#f59e0b',
            borderColor: '#f59e0b',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.4
        }],
    };

    const volumeChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `Volume: ${(context.parsed.y / 1000).toFixed(1)}k MWh`
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 45, minRotation: 45 } },
            y: {
                grid: { color: '#f3f4f6' },
                ticks: {
                    color: '#6b7280',
                    callback: (value) => `${(value / 1000).toFixed(0)}k`
                }
            }
        }
    };

    // Chart 3: OPEX
    const opexChartData = {
        labels,
        datasets: [{
            label: 'OPEX',
            data: assetData.map(item => item.opex || 0),
            fill: false,
            backgroundColor: '#ef4444',
            borderColor: '#ef4444',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.4
        }],
    };

    const opexChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `OPEX: ${formatCurrencyFromMillions(context.parsed.y, currencyUnit)}`
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 45, minRotation: 45 } },
            y: {
                grid: { color: '#f3f4f6' },
                ticks: {
                    color: '#6b7280',
                    callback: (value) => formatCurrencyFromMillions(value, currencyUnit)
                }
            }
        }
    };

    // Chart 4: CAPEX (Equity / Debt contribution) - Stacked Bar
    const capexChartData = {
        labels,
        datasets: [
            {
                label: 'Equity CAPEX',
                data: assetData.map(item => item.equity_capex || 0),
                backgroundColor: '#8b5cf6',
                borderColor: '#8b5cf6',
                borderWidth: 1
            },
            {
                label: 'Debt CAPEX',
                data: assetData.map(item => item.debt_capex || 0),
                backgroundColor: '#6366f1',
                borderColor: '#6366f1',
                borderWidth: 1
            }
        ],
    };

    const capexChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatCurrencyFromMillions(context.parsed.y, currencyUnit)}`
                }
            }
        },
        scales: {
            x: { 
                stacked: true,
                grid: { display: false }, 
                ticks: { color: '#6b7280', maxRotation: 45, minRotation: 45 } 
            },
            y: {
                stacked: true,
                grid: { color: '#f3f4f6' },
                ticks: {
                    color: '#6b7280',
                    callback: (value) => formatCurrencyFromMillions(value, currencyUnit)
                }
            }
        }
    };

    // Chart 5: Debt Payments and DSCR - Dual Axis
    const debtServiceData = assetData.map(item => item.debt_service || 0);
    const dscrData = assetData.map((item, idx) => {
        const cfads = item.cfads || 0;
        const debtService = item.debt_service || 0;
        return debtService > 0 ? cfads / debtService : 0;
    });

    const debtPaymentsChartData = {
        labels,
        datasets: [
            {
                label: 'Debt Service',
                data: debtServiceData,
                fill: false,
                backgroundColor: '#ef4444',
                borderColor: '#ef4444',
                borderWidth: 2,
                pointRadius: 3,
                tension: 0.4,
                yAxisID: 'y'
            },
            {
                label: 'DSCR',
                data: dscrData,
                fill: false,
                backgroundColor: '#06b6d4',
                borderColor: '#06b6d4',
                borderWidth: 2,
                pointRadius: 3,
                tension: 0.4,
                yAxisID: 'y1'
            }
        ],
    };

    const debtPaymentsChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        if (context.datasetIndex === 0) {
                            return `Debt Service: ${formatCurrencyFromMillions(context.parsed.y, currencyUnit)}`;
                        } else {
                            return `DSCR: ${context.parsed.y.toFixed(2)}x`;
                        }
                    }
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 45, minRotation: 45 } },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                id: 'y',
                grid: { color: '#f3f4f6' },
                ticks: {
                    color: '#6b7280',
                    callback: (value) => formatCurrencyFromMillions(value, currencyUnit)
                },
                title: { display: true, text: 'Debt Service', color: '#ef4444', font: { size: 11 } }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                id: 'y1',
                grid: { drawOnChartArea: false },
                ticks: {
                    color: '#6b7280',
                    callback: (value) => `${value.toFixed(1)}x`
                },
                title: { display: true, text: 'DSCR', color: '#06b6d4', font: { size: 11 } }
            }
        }
    };

    // Chart 6: Debt Outstanding
    const debtOutstandingChartData = {
        labels,
        datasets: [{
            label: 'Debt Outstanding',
            data: assetData.map(item => item.ending_balance || 0),
            fill: false,
            backgroundColor: '#a855f7',
            borderColor: '#a855f7',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.4
        }],
    };

    const debtOutstandingChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `Debt Outstanding: ${formatCurrencyFromMillions(context.parsed.y, currencyUnit)}`
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 45, minRotation: 45 } },
            y: {
                grid: { color: '#f3f4f6' },
                ticks: {
                    color: '#6b7280',
                    callback: (value) => formatCurrencyFromMillions(value, currencyUnit)
                }
            }
        }
    };

    // Chart 7: Net Equity Cashflows
    const equityCashflowChartData = {
        labels,
        datasets: [{
            label: 'Equity Cash Flow (Pre-Distributions)',
            data: assetData.map(item => item.equity_cash_flow_pre_distributions || item.equity_cash_flow || 0),
            fill: false,
            backgroundColor: '#8b5cf6',
            borderColor: '#8b5cf6',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.4
        }],
    };

    const equityCashflowChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `Equity Cash Flow (Pre-Distributions): ${formatCurrencyFromMillions(context.parsed.y, currencyUnit)}`
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 45, minRotation: 45 } },
            y: {
                grid: { color: '#f3f4f6' },
                ticks: {
                    color: '#6b7280',
                    callback: (value) => formatCurrencyFromMillions(value, currencyUnit)
                }
            }
        }
    };

    // Chart 8: Custom Chart
    const customFieldData = FIELDS_TO_PLOT.find(f => f.key === customChartField);
    const customChartData = {
        labels,
        datasets: [{
            label: customFieldData?.label || customChartField,
            data: assetData.map(item => item[customChartField] || 0),
            fill: false,
            backgroundColor: customFieldData?.color || '#10b981',
            borderColor: customFieldData?.color || '#10b981',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.4
        }],
    };

    const customChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const field = customChartField;
                        if (field.includes('Generation')) {
                            return `${customFieldData?.label || field}: ${(context.parsed.y / 1000).toFixed(1)}k MWh`;
                        }
                        if (field.includes('Price')) {
                            return `${customFieldData?.label || field}: ${formatCurrency(context.parsed.y, currencyUnit)}`;
                        }
                        return `${customFieldData?.label || field}: ${formatCurrencyFromMillions(context.parsed.y, currencyUnit)}`;
                    }
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 45, minRotation: 45 } },
            y: {
                grid: { color: '#f3f4f6' },
                ticks: {
                    color: '#6b7280',
                    callback: (value) => {
                        if (customChartField.includes('Generation')) return `${(value / 1000).toFixed(0)}k`;
                        if (customChartField.includes('Price')) return formatCurrency(value, currencyUnit);
                        return formatCurrencyFromMillions(value, currencyUnit);
                    }
                }
            }
        }
    };

    const fieldsByCategory = FIELDS_TO_PLOT.reduce((acc, field) => {
        if (!acc[field.category]) acc[field.category] = [];
        acc[field.category].push(field);
        return acc;
    }, {});

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select Asset</label>
                        <select
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                            value={selectedAssetId}
                            onChange={(e) => setSelectedAssetId(e.target.value)}
                        >
                            {assetIds.map((asset) => (
                                <option key={asset.id} value={asset.id}>{assetIdToNameMap[asset.id]}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Time Period</label>
                        <select
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                            {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* 8 Chart Grid - 2 columns x 4 rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chart 1: Revenue */}
                <ChartCard
                    title="Revenue"
                    chartData={revenueChartData}
                    chartOptions={revenueChartOptions}
                    loading={loading}
                    hasData={assetData.length > 0}
                />

                {/* Chart 2: Volume */}
                <ChartCard
                    title="Volume"
                    chartData={volumeChartData}
                    chartOptions={volumeChartOptions}
                    loading={loading}
                    hasData={assetData.length > 0}
                />

                {/* Chart 3: OPEX */}
                <ChartCard
                    title="OPEX"
                    chartData={opexChartData}
                    chartOptions={opexChartOptions}
                    loading={loading}
                    hasData={assetData.length > 0}
                />

                {/* Chart 4: CAPEX (Equity / Debt) */}
                <StackedBarChartCard
                    title="CAPEX (Equity / Debt)"
                    chartData={capexChartData}
                    chartOptions={capexChartOptions}
                    loading={loading}
                    hasData={assetData.length > 0}
                />

                {/* Chart 5: Debt Payments and DSCR */}
                <DualAxisChartCard
                    title="Debt Payments & DSCR"
                    chartData={debtPaymentsChartData}
                    chartOptions={debtPaymentsChartOptions}
                    loading={loading}
                    hasData={assetData.length > 0}
                />

                {/* Chart 6: Debt Outstanding */}
                <ChartCard
                    title="Debt Outstanding"
                    chartData={debtOutstandingChartData}
                    chartOptions={debtOutstandingChartOptions}
                    loading={loading}
                    hasData={assetData.length > 0}
                />

                {/* Chart 7: Net Equity Cashflows */}
                <ChartCard
                    title="Equity Cash Flow (Pre-Distributions)"
                    chartData={equityCashflowChartData}
                    chartOptions={equityCashflowChartOptions}
                    loading={loading}
                    hasData={assetData.length > 0}
                />

                {/* Chart 8: Custom Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="mb-3">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Custom Metric</label>
                        <select
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                            value={customChartField}
                            onChange={(e) => setCustomChartField(e.target.value)}
                        >
                            {Object.entries(fieldsByCategory).map(([category, fields]) => (
                                <optgroup key={category} label={category}>
                                    {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    {loading ? (
                        <div className="h-[300px] flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                        </div>
                    ) : assetData.length > 0 ? (
                        <div className="h-[300px] w-full">
                            <Line data={customChartData} options={customChartOptions} />
                        </div>
                    ) : (
                        <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
                            <Activity className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-xs">No data available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper component for portfolio chart card
const PortfolioChartCard = ({ title, chartData, chartOptions, loading, hasData, height = 300 }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">{title}</h4>
            {loading ? (
                <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
                    <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
            ) : hasData ? (
                <div className="w-full" style={{ height: `${height}px` }}>
                    <Bar data={chartData} options={chartOptions} />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-gray-400" style={{ height: `${height}px` }}>
                    <Activity className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs">No data available</p>
                </div>
            )}
        </div>
    );
};

// Helper component for portfolio stacked bar chart
const PortfolioStackedBarChartCard = ({ title, chartData, chartOptions, loading, hasData, height = 300 }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">{title}</h4>
            {loading ? (
                <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
                    <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
            ) : hasData ? (
                <div className="w-full" style={{ height: `${height}px` }}>
                    <Bar data={chartData} options={chartOptions} />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-gray-400" style={{ height: `${height}px` }}>
                    <Activity className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs">No data available</p>
                </div>
            )}
        </div>
    );
};

// Helper component for portfolio dual-axis chart
const PortfolioDualAxisChartCard = ({ title, chartData, chartOptions, loading, hasData, height = 300 }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">{title}</h4>
            {loading ? (
                <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
                    <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
            ) : hasData ? (
                <div className="w-full" style={{ height: `${height}px` }}>
                    <Line data={chartData} options={chartOptions} />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-gray-400" style={{ height: `${height}px` }}>
                    <Activity className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs">No data available</p>
                </div>
            )}
        </div>
    );
};

const PortfolioView = ({ assetIds, assetIdToNameMap }) => {
    const { selectedPortfolio, getPortfolioUniqueId } = usePortfolio();
    const { currencyUnit } = useDisplaySettings();
    const formatMetricValue = createFormatMetricValue(currencyUnit);
    const [selectedPeriod, setSelectedPeriod] = useState('yearly');
    const [customChartField, setCustomChartField] = useState('cfads');
    
    // State for all 8 charts
    const [revenueData, setRevenueData] = useState(null);
    const [volumeData, setVolumeData] = useState(null);
    const [opexData, setOpexData] = useState(null);
    const [equityCapexData, setEquityCapexData] = useState(null);
    const [debtCapexData, setDebtCapexData] = useState(null);
    const [debtServiceData, setDebtServiceData] = useState(null);
    const [cfadsData, setCfadsData] = useState(null);
    const [debtOutstandingData, setDebtOutstandingData] = useState(null);
    const [equityCashflowData, setEquityCashflowData] = useState(null);
    const [customChartData, setCustomChartData] = useState(null);
    
    const [loading, setLoading] = useState(false);

    // Fetch all chart data
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const uniqueId = getPortfolioUniqueId(selectedPortfolio) || selectedPortfolio || 'ZEBRE';
                if (!uniqueId) {
                    console.error('Output page - No unique_id found for portfolio:', selectedPortfolio);
                    setLoading(false);
                    return;
                }

                const fields = [
                    'revenue',
                    'monthlyGeneration',
                    'opex',
                    'equity_capex',
                    'debt_capex',
                    'debt_service',
                    'cfads',
                    'ending_balance',
                    'equity_cash_flow_pre_distributions',
                    customChartField
                ];

                const fetchPromises = fields.map(async (field) => {
                    const url = `/api/all-assets-summary?period=${selectedPeriod}&field=${field}&unique_id=${encodeURIComponent(uniqueId)}`;
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    const data = await res.json();
                    return { field, data: data.data };
                });

                const results = await Promise.all(fetchPromises);
                const dataMap = {};
                results.forEach(({ field, data }) => {
                    dataMap[field] = data;
                });

                setRevenueData(dataMap.revenue);
                setVolumeData(dataMap.monthlyGeneration);
                setOpexData(dataMap.opex);
                setEquityCapexData(dataMap.equity_capex);
                setDebtCapexData(dataMap.debt_capex);
                setDebtServiceData(dataMap.debt_service);
                setCfadsData(dataMap.cfads);
                setDebtOutstandingData(dataMap.ending_balance);
                setEquityCashflowData(dataMap.equity_cash_flow_pre_distributions);
                setCustomChartData(dataMap[customChartField]);
            } catch (err) {
                console.error('Error fetching portfolio data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [selectedPeriod, selectedPortfolio, customChartField]);

    const colors = generateColors(assetIds.length);

    // Helper to create chart data for portfolio
    const createPortfolioChartData = (summaryData, field) => {
        if (!summaryData) return { labels: [], datasets: [] };
        const labels = Object.keys(summaryData).sort();
        return {
            labels,
            datasets: assetIds.map((asset, i) => ({
                label: assetIdToNameMap[asset.id],
                assetId: asset.id,
                data: labels.map(l => summaryData[l]?.[asset.id] || 0),
                backgroundColor: colors[i],
                borderColor: colors[i],
                borderWidth: 1,
            }))
        };
    };

    // Helper to create stacked chart data (for CAPEX) - shows total portfolio equity vs debt
    const createStackedChartData = (equityData, debtData) => {
        if (!equityData || !debtData) return { labels: [], datasets: [] };
        const labels = Object.keys(equityData).sort();
        return {
            labels,
            datasets: [
                {
                    label: 'Equity CAPEX',
                    data: labels.map(l => {
                        return assetIds.reduce((sum, asset) => sum + (equityData[l]?.[asset.id] || 0), 0);
                    }),
                    backgroundColor: '#8b5cf6',
                    borderColor: '#8b5cf6',
                    borderWidth: 1
                },
                {
                    label: 'Debt CAPEX',
                    data: labels.map(l => {
                        return assetIds.reduce((sum, asset) => sum + (debtData[l]?.[asset.id] || 0), 0);
                    }),
                    backgroundColor: '#6366f1',
                    borderColor: '#6366f1',
                    borderWidth: 1
                }
            ]
        };
    };

    // Helper to create dual-axis chart data (Debt Service + DSCR)
    const createDualAxisChartData = (debtServiceData, cfadsData) => {
        if (!debtServiceData || !cfadsData) return { labels: [], datasets: [] };
        const labels = Object.keys(debtServiceData).sort();
        
        const debtServiceValues = labels.map(l => {
            return assetIds.reduce((sum, asset) => sum + (debtServiceData[l]?.[asset.id] || 0), 0);
        });
        
        const cfadsValues = labels.map(l => {
            return assetIds.reduce((sum, asset) => sum + (cfadsData[l]?.[asset.id] || 0), 0);
        });
        
        const dscrValues = debtServiceValues.map((debt, idx) => {
            return debt > 0 ? cfadsValues[idx] / debt : 0;
        });

        return {
            labels,
            datasets: [
                {
                    label: 'Debt Service',
                    data: debtServiceValues,
                    fill: false,
                    backgroundColor: '#ef4444',
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'DSCR',
                    data: dscrValues,
                    fill: false,
                    backgroundColor: '#06b6d4',
                    borderColor: '#06b6d4',
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        };
    };

    // Chart configurations
    const createChartOptions = (field, stacked = false) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 10 } } },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function (context) {
                        return `${context.dataset.label}: ${formatMetricValue(context.parsed.y, field)}`;
                    }
                }
            }
        },
        scales: {
            x: { 
                stacked,
                grid: { display: false },
                ticks: { color: '#6b7280', maxRotation: 45, minRotation: 45, font: { size: 10 } }
            },
            y: {
                stacked,
                grid: { color: '#f3f4f6' },
                ticks: {
                    color: '#6b7280',
                    font: { size: 10 },
                    callback: (value) => {
                        if (field.includes('Generation')) return `${(value / 1000).toFixed(0)}k`;
                        if (field.includes('Price')) return formatCurrency(value, currencyUnit);
                        return formatCurrencyFromMillions(value, currencyUnit);
                    }
                }
            }
        }
    });

    const debtPaymentsChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 10 } } },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        if (context.datasetIndex === 0) {
                            return `Debt Service: ${formatCurrencyFromMillions(context.parsed.y, currencyUnit)}`;
                        } else {
                            return `DSCR: ${context.parsed.y.toFixed(2)}x`;
                        }
                    }
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 45, minRotation: 45, font: { size: 10 } } },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                id: 'y',
                grid: { color: '#f3f4f6' },
                ticks: {
                    color: '#6b7280',
                    font: { size: 10 },
                    callback: (value) => formatCurrencyFromMillions(value, currencyUnit)
                },
                title: { display: true, text: 'Debt Service', color: '#ef4444', font: { size: 10 } }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                id: 'y1',
                grid: { drawOnChartArea: false },
                ticks: {
                    color: '#6b7280',
                    font: { size: 10 },
                    callback: (value) => `${value.toFixed(1)}x`
                },
                title: { display: true, text: 'DSCR', color: '#06b6d4', font: { size: 10 } }
            }
        }
    };

    const fieldsByCategory = FIELDS_TO_PLOT.reduce((acc, field) => {
        if (!acc[field.category]) acc[field.category] = [];
        acc[field.category].push(field);
        return acc;
    }, {});

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Time Period</label>
                        <select
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                            {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* 8 Chart Grid - 2 columns x 4 rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chart 1: Revenue */}
                <PortfolioChartCard
                    title="Revenue"
                    chartData={createPortfolioChartData(revenueData, 'revenue')}
                    chartOptions={createChartOptions('revenue', true)}
                    loading={loading}
                    hasData={revenueData && Object.keys(revenueData).length > 0}
                />

                {/* Chart 2: Volume */}
                <PortfolioChartCard
                    title="Volume"
                    chartData={createPortfolioChartData(volumeData, 'monthlyGeneration')}
                    chartOptions={createChartOptions('monthlyGeneration', true)}
                    loading={loading}
                    hasData={volumeData && Object.keys(volumeData).length > 0}
                />

                {/* Chart 3: OPEX */}
                <PortfolioChartCard
                    title="OPEX"
                    chartData={createPortfolioChartData(opexData, 'opex')}
                    chartOptions={createChartOptions('opex', true)}
                    loading={loading}
                    hasData={opexData && Object.keys(opexData).length > 0}
                />

                {/* Chart 4: CAPEX (Equity / Debt) */}
                <PortfolioStackedBarChartCard
                    title="CAPEX (Equity / Debt)"
                    chartData={createStackedChartData(equityCapexData, debtCapexData)}
                    chartOptions={createChartOptions('capex', true)}
                    loading={loading}
                    hasData={equityCapexData && debtCapexData && Object.keys(equityCapexData).length > 0}
                />

                {/* Chart 5: Debt Payments and DSCR */}
                <PortfolioDualAxisChartCard
                    title="Debt Payments & DSCR"
                    chartData={createDualAxisChartData(debtServiceData, cfadsData)}
                    chartOptions={debtPaymentsChartOptions}
                    loading={loading}
                    hasData={debtServiceData && cfadsData && Object.keys(debtServiceData).length > 0}
                />

                {/* Chart 6: Debt Outstanding */}
                <PortfolioChartCard
                    title="Debt Outstanding"
                    chartData={createPortfolioChartData(debtOutstandingData, 'ending_balance')}
                    chartOptions={createChartOptions('ending_balance', true)}
                    loading={loading}
                    hasData={debtOutstandingData && Object.keys(debtOutstandingData).length > 0}
                />

                {/* Chart 7: Net Equity Cashflows */}
                <PortfolioChartCard
                    title="Equity Cash Flow (Pre-Distributions)"
                    chartData={createPortfolioChartData(equityCashflowData, 'equity_cash_flow_pre_distributions')}
                    chartOptions={createChartOptions('equity_cash_flow_pre_distributions', true)}
                    loading={loading}
                    hasData={equityCashflowData && Object.keys(equityCashflowData).length > 0}
                />

                {/* Chart 8: Custom Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="mb-3">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Custom Metric</label>
                        <select
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                            value={customChartField}
                            onChange={(e) => setCustomChartField(e.target.value)}
                        >
                            {Object.entries(fieldsByCategory).map(([category, fields]) => (
                                <optgroup key={category} label={category}>
                                    {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    {loading ? (
                        <div className="h-[300px] flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                        </div>
                    ) : customChartData && Object.keys(customChartData).length > 0 ? (
                        <div className="h-[300px] w-full">
                            <Bar data={createPortfolioChartData(customChartData, customChartField)} options={createChartOptions(customChartField, true)} />
                        </div>
                    ) : (
                        <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
                            <Activity className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-xs">No data available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---

export default function OutputPage() {
    const { selectedPortfolio, portfolios, getPortfolioUniqueId } = usePortfolio();
    const [viewMode, setViewMode] = useState('portfolio'); // 'portfolio' | 'asset'
    const [assetIds, setAssetIds] = useState([]);
    const [assetIdToNameMap, setAssetIdToNameMap] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const uniqueId = getPortfolioUniqueId(selectedPortfolio) || selectedPortfolio || 'ZEBRE';
                if (!uniqueId) {
                    console.error('Output page - No unique_id found for portfolio:', selectedPortfolio);
                    return;
                }
                const response = await fetch(`/api/output-asset-data?unique_id=${encodeURIComponent(uniqueId)}`);
                if (!response.ok) throw new Error('Failed to fetch assets');
                const data = await response.json();
                setAssetIds(data.uniqueAssetIds.map(a => ({ id: a._id, name: a.name })));
                const map = {};
                data.uniqueAssetIds.forEach(a => map[a._id] = a.name);
                setAssetIdToNameMap(map);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchAssets();
        
        // Listen for portfolio changes
        const handlePortfolioChange = () => {
            fetchAssets();
        };
        window.addEventListener('portfolioChanged', handlePortfolioChange);
        return () => window.removeEventListener('portfolioChanged', handlePortfolioChange);
    }, [selectedPortfolio]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-8">
            {/* Header & Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Financial Outputs</h1>
                    <p className="text-gray-500 mt-1">Comprehensive analysis of asset and portfolio performance</p>
                </div>

                <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm inline-flex">
                    <button
                        onClick={() => setViewMode('portfolio')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'portfolio'
                                ? 'bg-green-50 text-green-700 shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Portfolio View
                    </button>
                    <button
                        onClick={() => setViewMode('asset')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'asset'
                                ? 'bg-green-50 text-green-700 shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Asset View
                    </button>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'portfolio' ? (
                <PortfolioView assetIds={assetIds} assetIdToNameMap={assetIdToNameMap} />
            ) : (
                <AssetView assetIds={assetIds} assetIdToNameMap={assetIdToNameMap} />
            )}
        </div>
    );
}
