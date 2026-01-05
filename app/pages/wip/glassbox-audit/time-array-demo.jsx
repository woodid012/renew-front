'use client'

import { useState, useMemo, useCallback } from 'react'
import {
    Download,
    Play,
    Settings,
    ChevronDown,
    ChevronRight,
    Calendar,
    DollarSign,
    TrendingUp,
    Calculator,
    FileSpreadsheet,
} from 'lucide-react'

// Import the new framework
import * as helpers from './utils/timeArrayHelpers.js'
import { calculateAll, buildHierarchy, calculateMetrics } from './utils/calculationEngine.js'
import { defaultInputs, inputCategories, initializeInputs } from './utils/defaultInputs.js'
import { defaultLineItems, sections, calcTypes } from './utils/defaultLineItems.js'
import { generateExcelData, downloadCSV } from './utils/excelExport.js'

export default function TimeArrayDemoPage() {
    // Timeline configuration
    const [timelineConfig, setTimelineConfig] = useState({
        startDate: '2023-01-01',
        endDate: '2045-12-31',
        frequency: 'monthly',
        codDate: '2025-01-01',
        contractEndDate: '2035-01-01',
        debtEndDate: '2040-01-01',
    })

    // Expanded sections in UI
    const [expandedSections, setExpandedSections] = useState({
        inputs: true,
        pnl: true,
        metrics: true,
    })

    // Selected item for detail view
    const [selectedItem, setSelectedItem] = useState(null)

    // Create timeline
    const timeline = useMemo(() => {
        const tl = helpers.createTimeline(
            timelineConfig.startDate,
            timelineConfig.endDate,
            timelineConfig.frequency
        )

        // Add project flags
        helpers.addProjectFlags(
            tl,
            timelineConfig.codDate,
            timelineConfig.contractEndDate,
            timelineConfig.debtEndDate
        )

        // Add COD year flag (for one-time items like ITC)
        const codYear = new Date(timelineConfig.codDate).getFullYear()
        tl.flags.is_cod_year = tl.year.map((y, i) =>
            y === codYear && tl.month[i] === 1 ? 1 : 0
        )

        return tl
    }, [timelineConfig])

    // Initialize inputs
    const inputs = useMemo(() => {
        const baseInputs = initializeInputs(defaultInputs, timeline)

        // Add some calculated inputs
        baseInputs.total_capex = helpers.constantArray(100000000, timeline.periods)

        // Add timeline flags to inputs so formulas can reference them
        Object.entries(timeline.flags).forEach(([name, values]) => {
            baseInputs[name] = values
        })

        // Add scalar inputs as arrays
        baseInputs.debt_rate = helpers.constantArray(0.055, timeline.periods)
        baseInputs.tax_rate = helpers.constantArray(0.30, timeline.periods)
        baseInputs.itc_rate = helpers.constantArray(0.30, timeline.periods)
        baseInputs.depreciation_life = helpers.constantArray(20, timeline.periods)
        baseInputs.ar_days = helpers.constantArray(30, timeline.periods)
        baseInputs.ap_days = helpers.constantArray(45, timeline.periods)
        baseInputs.dsra_months = helpers.constantArray(6, timeline.periods)

        // Mock generation profile (deterministic - no random for hydration)
        baseInputs.gross_generation = timeline.flags.is_operating.map((flag, i) =>
            flag === 1 ? 15000 + 1000 * Math.sin(i / 6) : 0
        )
        baseInputs.net_generation = baseInputs.gross_generation.map(v => v * 0.95)

        // Mock prices (deterministic)
        baseInputs.energy_price = timeline.index.map((d, i) =>
            50 + 10 * Math.sin(i / 12 * Math.PI) + timeline.year[i] - 2023
        )
        baseInputs.green_price = helpers.constantArray(35, timeline.periods)

        return baseInputs
    }, [timeline])

    // Calculate all line items
    const results = useMemo(() => {
        try {
            return calculateAll(defaultLineItems, inputs, timeline)
        } catch (error) {
            console.error('Calculation error:', error)
            return inputs
        }
    }, [inputs, timeline])

    // Calculate metrics
    const metrics = useMemo(() => {
        return calculateMetrics(results, timeline)
    }, [results, timeline])

    // Build hierarchy for display
    const hierarchy = useMemo(() => {
        return buildHierarchy(defaultLineItems)
    }, [])

    // Toggle section expansion
    const toggleSection = useCallback((sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }))
    }, [])

    // Export to CSV
    const handleExportCSV = useCallback(() => {
        const excelData = generateExcelData(timeline, results, defaultLineItems, defaultInputs)
        downloadCSV(excelData, 'model_output.csv')
    }, [timeline, results])

    // Format currency
    const formatCurrency = (value) => {
        if (typeof value !== 'number' || isNaN(value)) return '-'
        if (Math.abs(value) >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`
        }
        if (Math.abs(value) >= 1000) {
            return `$${(value / 1000).toFixed(0)}k`
        }
        return `$${value.toFixed(0)}`
    }

    // Calculate totals
    const getTotal = (id) => {
        const arr = results[id]
        if (!Array.isArray(arr)) return 0
        return arr.reduce((sum, v) => sum + (v || 0), 0)
    }

    // Render a line item row
    const renderLineItem = (item, depth = 0) => {
        const values = results[item.id]
        const total = Array.isArray(values) ? values.reduce((a, b) => a + (b || 0), 0) : 0
        const isParent = item.children && item.children.length > 0
        const isExpanded = expandedSections[item.id]

        return (
            <div key={item.id}>
                <div
                    className={`flex items-center justify-between py-2 px-3 hover:bg-gray-50 cursor-pointer ${depth === 0 ? 'font-semibold bg-gray-50' : ''
                        } ${item.isNegative ? 'text-red-600' : ''}`}
                    style={{ paddingLeft: `${12 + depth * 20}px` }}
                    onClick={() => {
                        if (isParent) {
                            toggleSection(item.id)
                        }
                        setSelectedItem(item)
                    }}
                >
                    <div className="flex items-center gap-2">
                        {isParent && (
                            isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        )}
                        <span>{item.label}</span>
                    </div>
                    <span className="font-mono">
                        {item.isNegative ? `(${formatCurrency(Math.abs(total))})` : formatCurrency(total)}
                    </span>
                </div>

                {isParent && isExpanded && (
                    <div>
                        {item.children.map(child => renderLineItem(child, depth + 1))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header */}
            <div className="bg-white border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Calculator className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Time Array Framework Demo</h1>
                                <p className="text-sm text-gray-500">Data-driven P&L with Excel audit export</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-12 gap-6">

                    {/* Left Panel - Configuration */}
                    <div className="col-span-3 space-y-4">
                        {/* Timeline Config */}
                        <div className="bg-white rounded-xl shadow-sm border p-4">
                            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-600" />
                                Timeline
                            </h2>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <label className="text-gray-500">Start Date</label>
                                    <input
                                        type="date"
                                        value={timelineConfig.startDate}
                                        onChange={e => setTimelineConfig(p => ({ ...p, startDate: e.target.value }))}
                                        className="w-full mt-1 px-2 py-1 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500">COD Date</label>
                                    <input
                                        type="date"
                                        value={timelineConfig.codDate}
                                        onChange={e => setTimelineConfig(p => ({ ...p, codDate: e.target.value }))}
                                        className="w-full mt-1 px-2 py-1 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500">Contract End</label>
                                    <input
                                        type="date"
                                        value={timelineConfig.contractEndDate}
                                        onChange={e => setTimelineConfig(p => ({ ...p, contractEndDate: e.target.value }))}
                                        className="w-full mt-1 px-2 py-1 border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500">End Date</label>
                                    <input
                                        type="date"
                                        value={timelineConfig.endDate}
                                        onChange={e => setTimelineConfig(p => ({ ...p, endDate: e.target.value }))}
                                        className="w-full mt-1 px-2 py-1 border rounded"
                                    />
                                </div>
                                <div className="pt-2 border-t text-gray-600">
                                    <div>Periods: <span className="font-mono">{timeline.periods}</span></div>
                                    <div>Frequency: <span className="font-mono">{timeline.frequency}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Metrics */}
                        <div className="bg-white rounded-xl shadow-sm border p-4">
                            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-green-600" />
                                Key Metrics
                            </h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Equity IRR</span>
                                    <span className="font-semibold text-green-600">
                                        {metrics.equityIRR?.toFixed(1) || '-'}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">MOIC</span>
                                    <span className="font-semibold">
                                        {metrics.moic?.toFixed(2) || '-'}x
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">NPV @ 8%</span>
                                    <span className="font-semibold">
                                        {formatCurrency(metrics.npv8 || 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Min DSCR</span>
                                    <span className="font-semibold">
                                        {metrics.minDSCR?.toFixed(2) || '-'}x
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Avg DSCR</span>
                                    <span className="font-semibold">
                                        {metrics.avgDSCR?.toFixed(2) || '-'}x
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Panel - P&L Hierarchy */}
                    <div className="col-span-5 bg-white rounded-xl shadow-sm border">
                        <div className="p-4 border-b">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-indigo-600" />
                                P&L Hierarchy
                            </h2>
                        </div>
                        <div className="max-h-[600px] overflow-y-auto">
                            {hierarchy.map(item => renderLineItem(item))}
                        </div>
                    </div>

                    {/* Right Panel - Selected Item Detail */}
                    <div className="col-span-4 bg-white rounded-xl shadow-sm border">
                        <div className="p-4 border-b">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                                {selectedItem ? selectedItem.label : 'Select an Item'}
                            </h2>
                        </div>

                        {selectedItem && (
                            <div className="p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">ID:</span>
                                        <span className="ml-2 font-mono">{selectedItem.id}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Type:</span>
                                        <span className="ml-2">{selectedItem.calcType}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Section:</span>
                                        <span className="ml-2">{selectedItem.section}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Total:</span>
                                        <span className="ml-2 font-semibold">{formatCurrency(getTotal(selectedItem.id))}</span>
                                    </div>
                                </div>

                                {selectedItem.calcParams?.formula && (
                                    <div className="bg-gray-900 rounded-lg p-3">
                                        <div className="text-xs text-gray-400 mb-1">Formula</div>
                                        <code className="text-green-400 text-sm">{selectedItem.calcParams.formula}</code>
                                    </div>
                                )}

                                {/* Mini sparkline of values */}
                                <div>
                                    <div className="text-xs text-gray-500 mb-2">Time Series (first 24 periods)</div>
                                    <div className="flex items-end gap-0.5 h-16">
                                        {(results[selectedItem.id] || []).slice(0, 24).map((v, i) => {
                                            const max = Math.max(...(results[selectedItem.id] || [0]).map(Math.abs))
                                            const height = max > 0 ? Math.abs(v) / max * 100 : 0
                                            const isNegative = v < 0
                                            return (
                                                <div
                                                    key={i}
                                                    className={`flex-1 ${isNegative ? 'bg-red-400' : 'bg-indigo-400'} rounded-t`}
                                                    style={{ height: `${Math.max(2, height)}%` }}
                                                    title={`${helpers.formatDate(timeline.index[i])}: ${formatCurrency(v)}`}
                                                />
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* First few values */}
                                <div>
                                    <div className="text-xs text-gray-500 mb-2">Sample Values</div>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        {(results[selectedItem.id] || []).slice(0, 8).map((v, i) => (
                                            <div key={i} className="bg-gray-50 rounded p-2">
                                                <div className="text-gray-400">{helpers.formatDate(timeline.index[i], 'MMM-YY')}</div>
                                                <div className="font-mono">{formatCurrency(v)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}
