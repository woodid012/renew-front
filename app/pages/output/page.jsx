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

const formatMetricValue = (value, field) => {
    if (field.includes('Price')) {
        return `$${value.toLocaleString()}`;
    } else if (field.includes('Generation')) {
        return `${(value / 1000).toFixed(1)}k MWh`;
    } else {
        return `$${value.toFixed(2)}M`;
    }
};

// --- Sub-Components ---

const AssetView = ({ assetIds, assetIdToNameMap }) => {
    const [selectedAssetId, setSelectedAssetId] = useState(assetIds.length > 0 ? assetIds[0].id : '');
    const [assetData, setAssetData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedField, setSelectedField] = useState('revenue');
    const [selectedPeriod, setSelectedPeriod] = useState('yearly');

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
                    const url = `/api/output-asset-data?asset_id=${selectedAssetId}${selectedPeriod ? `&period=${selectedPeriod}` : ''}`;
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
    }, [selectedAssetId, selectedPeriod]);

    const handleExportCsv = () => {
        if (!assetData || assetData.length === 0) {
            alert("No data to export.");
            return;
        }
        const headers = ["Period", selectedField];
        const rows = chartData.labels.map((label, index) => [
            label,
            chartData.datasets[0].data[index],
        ]);
        let csvContent = headers.join(",") + "\n";
        rows.forEach((row) => csvContent += row.join(",") + "\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `asset_${selectedAssetId}_${selectedField}_${selectedPeriod || 'raw'}_data.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const selectedFieldData = FIELDS_TO_PLOT.find(f => f.key === selectedField);
    const fieldsByCategory = FIELDS_TO_PLOT.reduce((acc, field) => {
        if (!acc[field.category]) acc[field.category] = [];
        acc[field.category].push(field);
        return acc;
    }, {});

    const chartData = {
        labels: assetData.map(item => {
            if (selectedPeriod === 'monthly') return `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
            if (selectedPeriod === 'quarterly') return `${item._id.year}-Q${item._id.quarter}`;
            if (selectedPeriod === 'yearly') return `${item._id.year}`;
            if (selectedPeriod === 'fiscal_yearly') return `FY${item._id.fiscalYear}`;
            return new Date(item.date).toLocaleDateString();
        }),
        datasets: [{
            label: selectedFieldData?.label || selectedField,
            data: assetData.map(item => item[selectedField]),
            fill: false,
            backgroundColor: selectedFieldData?.color || '#10b981',
            borderColor: selectedFieldData?.color || '#10b981',
            borderWidth: 3,
            pointBackgroundColor: selectedFieldData?.color || '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 6,
            tension: 0.4
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: selectedFieldData?.color || '#10b981',
                borderWidth: 1,
                cornerRadius: 8,
                callbacks: {
                    label: function (context) {
                        return `${selectedFieldData?.label}: ${formatMetricValue(context.parsed.y, selectedField)}`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#6b7280' }
            },
            y: {
                grid: { color: '#f3f4f6' },
                ticks: {
                    color: '#6b7280',
                    callback: (value) => {
                        if (selectedField.includes('Generation')) return `${(value / 1000).toFixed(0)}k`;
                        if (selectedField.includes('Price')) return `$${value}`;
                        return `$${value}M`;
                    }
                }
            }
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Metric</label>
                        <select
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                            value={selectedField}
                            onChange={(e) => setSelectedField(e.target.value)}
                        >
                            {Object.entries(fieldsByCategory).map(([category, fields]) => (
                                <optgroup key={category} label={category}>
                                    {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            {selectedFieldData?.label}
                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {assetIdToNameMap[selectedAssetId]}
                            </span>
                        </h3>
                    </div>
                    <button
                        onClick={handleExportCsv}
                        disabled={!assetData.length}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>

                {loading ? (
                    <div className="h-[400px] flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                    </div>
                ) : assetData.length > 0 ? (
                    <div className="h-[400px] w-full">
                        <Line data={chartData} options={chartOptions} />
                    </div>
                ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-gray-400">
                        <Activity className="w-12 h-12 mb-2 opacity-20" />
                        <p>No data available for this selection</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const PortfolioView = ({ assetIds, assetIdToNameMap }) => {
    const [selectedField, setSelectedField] = useState('revenue');
    const [selectedPeriod, setSelectedPeriod] = useState('yearly');
    const [chartType, setChartType] = useState('stacked');
    const [summaryData, setSummaryData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const url = `/api/all-assets-summary?period=${selectedPeriod}&field=${selectedField}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();
                setSummaryData(data.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedField, selectedPeriod]);

    const handleExportCsv = () => {
        if (!summaryData) return;
        const headers = ["Period", ...chartData.datasets.map(d => d.label)];
        const rows = chartData.labels.map(label => {
            const rowData = [label];
            chartData.datasets.forEach(d => rowData.push(summaryData[label][d.assetId] || 0));
            return rowData;
        });
        let csvContent = headers.join(",") + "\n";
        rows.forEach(r => csvContent += r.join(",") + "\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `portfolio_${selectedField}_${selectedPeriod}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const labels = summaryData ? Object.keys(summaryData).sort() : [];
    const colors = generateColors(assetIds.length);
    const chartData = {
        labels,
        datasets: assetIds.map((asset, i) => ({
            label: assetIdToNameMap[asset.id],
            assetId: asset.id,
            data: labels.map(l => summaryData[l][asset.id] || 0),
            backgroundColor: colors[i],
            borderColor: colors[i],
            borderWidth: chartType === 'line' ? 3 : 0,
            fill: false,
            tension: 0.4,
            pointRadius: chartType === 'line' ? 4 : 0,
        }))
    };

    const selectedFieldData = FIELDS_TO_PLOT.find(f => f.key === selectedField);
    const fieldsByCategory = FIELDS_TO_PLOT.reduce((acc, field) => {
        if (!acc[field.category]) acc[field.category] = [];
        acc[field.category].push(field);
        return acc;
    }, {});

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function (context) {
                        return `${context.dataset.label}: ${formatMetricValue(context.parsed.y, selectedField)}`;
                    }
                }
            }
        },
        scales: {
            x: { stacked: chartType === 'stacked', grid: { display: false } },
            y: {
                stacked: chartType === 'stacked',
                grid: { color: '#f3f4f6' },
                ticks: {
                    callback: (value) => {
                        if (selectedField.includes('Generation')) return `${(value / 1000).toFixed(0)}k`;
                        if (selectedField.includes('Price')) return `$${value}`;
                        return `$${value}M`;
                    }
                }
            }
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Metric</label>
                        <select
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                            value={selectedField}
                            onChange={(e) => setSelectedField(e.target.value)}
                        >
                            {Object.entries(fieldsByCategory).map(([category, fields]) => (
                                <optgroup key={category} label={category}>
                                    {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                                </optgroup>
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
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Chart Type</label>
                        <select
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            value={chartType}
                            onChange={(e) => setChartType(e.target.value)}
                        >
                            {CHART_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            {selectedFieldData?.label}
                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                Portfolio Aggregate
                            </span>
                        </h3>
                    </div>
                    <button
                        onClick={handleExportCsv}
                        disabled={!summaryData}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>

                {loading ? (
                    <div className="h-[500px] flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                    </div>
                ) : summaryData ? (
                    <div className="h-[500px] w-full">
                        {chartType === 'line' ? (
                            <Line data={chartData} options={chartOptions} />
                        ) : (
                            <Bar data={chartData} options={chartOptions} />
                        )}
                    </div>
                ) : (
                    <div className="h-[500px] flex flex-col items-center justify-center text-gray-400">
                        <Activity className="w-12 h-12 mb-2 opacity-20" />
                        <p>No data available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Page Component ---

export default function OutputPage() {
    const [viewMode, setViewMode] = useState('portfolio'); // 'portfolio' | 'asset'
    const [assetIds, setAssetIds] = useState([]);
    const [assetIdToNameMap, setAssetIdToNameMap] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const response = await fetch('/api/output-asset-data');
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
    }, []);

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
