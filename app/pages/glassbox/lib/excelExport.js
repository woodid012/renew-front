/**
 * Excel Export
 * Generates Excel audit file from calculated model results.
 * Uses ExcelJS for workbook creation.
 */

import { formatDate, getColumnHeaders } from './timeArrayHelpers.js'
import { sections } from './defaultLineItems.js'

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Generate Excel workbook from model results
 * @param {object} timeline - Timeline object
 * @param {object} results - Calculated values (context from calculateAll)
 * @param {object[]} items - Line item schemas
 * @param {object[]} inputs - Input schemas
 * @returns {object} - ExcelJS workbook (or data structure if ExcelJS not available)
 */
export function generateExcelData(timeline, results, items, inputs) {
    const rows = []
    const columnHeaders = ['Label', ...getColumnHeaders(timeline, 'MMM-YY')]

    // Add each section
    addTimingSection(rows, timeline)
    addFlagsSection(rows, timeline)
    addSectionRows(rows, 'inputs', inputs, results, timeline)
    addSectionRows(rows, 'pnl', items, results, timeline)
    addSectionRows(rows, 'financing', items, results, timeline)
    addSectionRows(rows, 'tax', items, results, timeline)
    addSectionRows(rows, 'reserves', items, results, timeline)
    addSectionRows(rows, 'working_capital', items, results, timeline)
    addSectionRows(rows, 'cashflow', items, results, timeline)
    addSectionRows(rows, 'balance', items, results, timeline)
    addSectionRows(rows, 'equity', items, results, timeline)
    addMetricsSection(rows, results, timeline)

    return {
        columnHeaders,
        rows,
        timeline,
    }
}

// ============================================================================
// SECTION BUILDERS
// ============================================================================

function addTimingSection(rows, timeline) {
    rows.push({ type: 'header', label: '=== TIMING ===' })

    rows.push({
        type: 'data',
        label: 'Date',
        values: timeline.index.map(d => formatDate(d, 'YYYY-MM')),
        format: 'text',
    })

    rows.push({
        type: 'data',
        label: 'Year',
        values: timeline.year,
        format: 'number',
    })

    rows.push({
        type: 'data',
        label: 'Month',
        values: timeline.month,
        format: 'number',
    })

    rows.push({
        type: 'data',
        label: 'Quarter',
        values: timeline.quarter.map(q => `Q${q}`),
        format: 'text',
    })

    rows.push({
        type: 'data',
        label: 'Fiscal Year',
        values: timeline.fyear.map(fy => `FY${fy}`),
        format: 'text',
    })

    rows.push({
        type: 'data',
        label: 'Period Index',
        values: timeline.periodIndex,
        format: 'number',
    })

    rows.push({ type: 'spacer' })
}

function addFlagsSection(rows, timeline) {
    rows.push({ type: 'header', label: '=== FLAGS ===' })

    Object.entries(timeline.flags || {}).forEach(([name, values]) => {
        rows.push({
            type: 'data',
            label: formatFlagName(name),
            values,
            format: 'number',
        })
    })

    rows.push({ type: 'spacer' })
}

function addSectionRows(rows, sectionId, items, results, timeline) {
    const sectionItems = items.filter(item => item.section === sectionId)
    if (sectionItems.length === 0) return

    const section = sections.find(s => s.id === sectionId)
    rows.push({ type: 'header', label: `=== ${section?.label || sectionId.toUpperCase()} ===` })

    // Sort by order
    sectionItems.sort((a, b) => (a.order || 0) - (b.order || 0))

    sectionItems.forEach(item => {
        const values = results[item.id]
        if (!values || !Array.isArray(values)) return

        const indent = '  '.repeat(item.indent || 0)
        const label = indent + item.label

        rows.push({
            type: 'data',
            id: item.id,
            label,
            values: item.isNegative ? values.map(v => -Math.abs(v)) : values,
            format: item.format || 'currency',
            indent: item.indent || 0,
            isNegative: item.isNegative,
        })
    })

    rows.push({ type: 'spacer' })
}

function addMetricsSection(rows, results, timeline) {
    rows.push({ type: 'header', label: '=== KEY METRICS ===' })

    const metrics = calculateDisplayMetrics(results, timeline)

    Object.entries(metrics).forEach(([key, value]) => {
        rows.push({
            type: 'metric',
            label: formatMetricName(key),
            value,
            format: getMetricFormat(key),
        })
    })

    rows.push({ type: 'spacer' })
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

function formatFlagName(name) {
    return name
        .replace(/^is_/, '')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

function formatMetricName(name) {
    const nameMap = {
        equityIRR: 'Equity IRR',
        projectIRR: 'Project IRR',
        moic: 'Equity MOIC',
        npv8: 'NPV @ 8%',
        npv10: 'NPV @ 10%',
        npv12: 'NPV @ 12%',
        minDSCR: 'Minimum DSCR',
        avgDSCR: 'Average DSCR',
        llcr: 'LLCR at COD',
        plcr: 'PLCR at COD',
        paybackYears: 'Payback Period',
    }
    return nameMap[name] || name
}

function getMetricFormat(name) {
    if (name.includes('IRR') || name.includes('irr')) return 'percent'
    if (name.includes('npv') || name.includes('NPV')) return 'currency'
    if (name.includes('moic') || name.includes('MOIC')) return 'ratio'
    if (name.includes('DSCR') || name.includes('dscr')) return 'ratio'
    if (name.includes('lcr') || name.includes('LCR')) return 'ratio'
    return 'number'
}

function calculateDisplayMetrics(results, timeline) {
    const metrics = {}

    // Equity IRR
    if (results.equity_cashflow) {
        const cf = results.equity_cashflow
        const hasNeg = cf.some(v => v < 0)
        const hasPos = cf.some(v => v > 0)
        if (hasNeg && hasPos) {
            // Simplified IRR calculation for display
            const totalIn = cf.filter(v => v > 0).reduce((a, b) => a + b, 0)
            const totalOut = Math.abs(cf.filter(v => v < 0).reduce((a, b) => a + b, 0))
            const years = timeline.periods / 12
            metrics.equityIRR = totalOut > 0
                ? (Math.pow(totalIn / totalOut, 1 / years) - 1) * 100
                : 0
            metrics.moic = totalOut > 0 ? totalIn / totalOut : 0
        }
    }

    // NPV (simplified)
    if (results.equity_cashflow) {
        const rate = 0.08 / 12  // Monthly
        let pv = 0
        results.equity_cashflow.forEach((cf, i) => {
            pv += cf / Math.pow(1 + rate, i)
        })
        metrics.npv8 = pv
    }

    // DSCR metrics
    if (results.dscr) {
        const validDSCR = results.dscr.filter(v => v > 0 && isFinite(v))
        if (validDSCR.length > 0) {
            metrics.minDSCR = Math.min(...validDSCR)
            metrics.avgDSCR = validDSCR.reduce((a, b) => a + b, 0) / validDSCR.length
        }
    }

    // Payback period
    if (results.cumulative_equity_cf) {
        const firstPositiveIdx = results.cumulative_equity_cf.findIndex(v => v > 0)
        if (firstPositiveIdx >= 0) {
            metrics.paybackYears = (firstPositiveIdx / 12).toFixed(1)
        }
    }

    return metrics
}

// ============================================================================
// EXCEL FILE GENERATION (requires ExcelJS)
// ============================================================================

/**
 * Generate actual Excel file using ExcelJS
 * Call this when ExcelJS is available
 */
export async function generateExcelFile(excelData, filename = 'model_output.xlsx') {
    // Dynamic import of ExcelJS
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Model Output')

    // Set column widths
    sheet.columns = [
        { width: 35 },  // Label column
        ...Array(excelData.timeline.periods).fill({ width: 12 }),
    ]

    // Add header row
    const headerRow = sheet.addRow(excelData.columnHeaders)
    headerRow.font = { bold: true }
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
    }
    sheet.getRow(1).freeze = true  // Freeze header

    // Add data rows
    let rowNum = 2
    excelData.rows.forEach(row => {
        if (row.type === 'header') {
            const excelRow = sheet.addRow([row.label])
            excelRow.font = { bold: true }
            excelRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD0D0D0' },
            }
            rowNum++
        } else if (row.type === 'spacer') {
            sheet.addRow([])
            rowNum++
        } else if (row.type === 'data') {
            const values = row.values.map(v => formatCellValue(v, row.format, row.isNegative))
            const excelRow = sheet.addRow([row.label, ...values])

            // Apply formatting
            if (row.indent > 0) {
                excelRow.getCell(1).alignment = { indent: row.indent }
            }

            // Number formatting
            for (let c = 2; c <= values.length + 1; c++) {
                const cell = excelRow.getCell(c)
                cell.numFmt = getNumberFormat(row.format)
                if (row.isNegative) {
                    cell.font = { color: { argb: 'FFFF0000' } }  // Red for negatives
                }
            }

            rowNum++
        } else if (row.type === 'metric') {
            const excelRow = sheet.addRow([row.label, formatCellValue(row.value, row.format)])
            excelRow.font = { bold: true }
            excelRow.getCell(2).numFmt = getNumberFormat(row.format)
            rowNum++
        }
    })

    return workbook
}

function formatCellValue(value, format, isNegative = false) {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value

    // Return raw number for Excel formatting
    return value
}

function getNumberFormat(format) {
    switch (format) {
        case 'currency':
            return '#,##0;(#,##0)'
        case 'percent':
            return '0.00%'
        case 'ratio':
            return '0.00x'
        case 'number':
            return '#,##0'
        default:
            return 'General'
    }
}

/**
 * Download Excel file in browser
 */
export async function downloadExcel(excelData, filename = 'model_output.xlsx') {
    const workbook = await generateExcelFile(excelData, filename)
    const buffer = await workbook.xlsx.writeBuffer()

    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
}

// ============================================================================
// CSV EXPORT (fallback if ExcelJS not available)
// ============================================================================

/**
 * Generate CSV string (fallback)
 */
export function generateCSV(excelData) {
    const lines = []

    // Header
    lines.push(excelData.columnHeaders.join(','))

    // Data rows
    excelData.rows.forEach(row => {
        if (row.type === 'data') {
            const values = row.values.map(v => {
                if (typeof v === 'number') return v.toFixed(2)
                return `"${v}"`
            })
            lines.push(`"${row.label}",${values.join(',')}`)
        } else if (row.type === 'header') {
            lines.push(`"${row.label}"`)
        } else if (row.type === 'metric') {
            lines.push(`"${row.label}",${row.value}`)
        }
    })

    return lines.join('\n')
}

/**
 * Download CSV
 */
export function downloadCSV(excelData, filename = 'model_output.csv') {
    const csv = generateCSV(excelData)
    const blob = new Blob([csv], { type: 'text/csv' })

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
}
