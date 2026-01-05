/**
 * Calculation Engine
 * Generic engine that processes line item schemas and computes all values.
 * Handles dependency ordering, parent/child aggregation, and formula evaluation.
 */

import * as helpers from './timeArrayHelpers.js'
import { evaluateFormula, extractReferences } from './formulaParser.js'

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate all line items based on their schemas
 * @param {object[]} items - Array of line item schemas
 * @param {object} inputs - Input values/arrays (context for formulas)
 * @param {object} timeline - Timeline object
 * @returns {object} - Map of item ID to calculated array
 */
export function calculateAll(items, inputs, timeline) {
    // Build results context (starts with inputs)
    const context = { ...inputs }

    // Add timeline properties to context
    context._timeline = timeline
    context._periods = timeline.periods

    // Add flags to context
    Object.entries(timeline.flags || {}).forEach(([name, arr]) => {
        context[name] = arr
    })

    // Sort items by dependency order
    const sortedItems = topologicalSort(items)

    // Calculate each item in order
    sortedItems.forEach(item => {
        const result = calculateItem(item, context, timeline)
        context[item.id] = result
    })

    return context
}

/**
 * Calculate a single line item
 */
function calculateItem(item, context, timeline) {
    const { calcType, calcParams = {} } = item

    switch (calcType) {
        case 'constant':
            return calculateConstant(calcParams, timeline, context)

        case 'escalating':
            return calculateEscalating(calcParams, timeline, context)

        case 'degrading':
            return calculateDegrading(calcParams, timeline, context)

        case 'formula':
            return calculateFormula(calcParams, context, timeline)

        case 'sum_children':
            return calculateSumChildren(item, context)

        case 'schedule':
            return calculateSchedule(calcParams, timeline)

        case 'amortizing':
            return calculateAmortizing(calcParams, timeline, context)

        case 'lookup':
            return calculateLookup(calcParams, context, timeline)

        case 'input':
            // Input items are already in context
            return context[item.id] || helpers.zerosArray(timeline.periods)

        default:
            console.warn(`Unknown calcType: ${calcType} for item ${item.id}`)
            return helpers.zerosArray(timeline.periods)
    }
}

// ============================================================================
// CALCULATION TYPE HANDLERS
// ============================================================================

/**
 * Constant value array
 */
function calculateConstant(params, timeline, context) {
    const { value = 0, mask: maskName } = params
    const arr = helpers.constantArray(value, timeline.periods)

    if (maskName && context[maskName]) {
        return helpers.multiplyArrays(arr, context[maskName])
    }
    return arr
}

/**
 * Escalating value: base * (1 + rate)^n
 */
function calculateEscalating(params, timeline, context) {
    const {
        baseValue = 0,
        rate = 0,
        startDate = timeline.startDate,
        mask: maskName
    } = params

    const mask = maskName ? context[maskName] : null
    return helpers.escalatingArray(baseValue, rate, timeline, startDate, mask)
}

/**
 * Degrading value: base * (1 - rate)^n
 */
function calculateDegrading(params, timeline, context) {
    const {
        baseValue = 0,
        rate = 0,
        startDate = timeline.startDate,
        mask: maskName
    } = params

    const mask = maskName ? context[maskName] : null
    return helpers.degradingArray(baseValue, rate, timeline, startDate, mask)
}

/**
 * Formula-based calculation
 */
function calculateFormula(params, context, timeline) {
    const { formula } = params
    if (!formula) return helpers.zerosArray(timeline.periods)

    return evaluateFormula(formula, context, timeline)
}

/**
 * Sum of children (parent aggregator)
 */
function calculateSumChildren(item, context) {
    const { childIds = [], operations = [] } = item

    if (childIds.length === 0) {
        // No explicit children - find by parentId
        // This should be handled by the hierarchy builder
        return context[item.id] || []
    }

    // Sum children with operations
    let result = null

    childIds.forEach((childId, i) => {
        const childValue = context[childId]
        if (!childValue) return

        const op = operations[i] || '+'

        if (result === null) {
            result = op === '-' ? helpers.negateArray([...childValue]) : [...childValue]
        } else {
            if (op === '-') {
                result = helpers.subtractArrays(result, childValue)
            } else {
                result = helpers.sumArrays(result, childValue)
            }
        }
    })

    return result || []
}

/**
 * User-defined schedule
 */
function calculateSchedule(params, timeline) {
    const { values = [], mask: maskName } = params

    // Pad or truncate to timeline length
    const arr = [...values]
    while (arr.length < timeline.periods) arr.push(0)
    if (arr.length > timeline.periods) arr.length = timeline.periods

    return arr
}

/**
 * Amortizing debt schedule
 */
function calculateAmortizing(params, timeline, context) {
    const {
        principal,
        rate,
        termYears,
        startDate,
        outputType = 'payment'  // 'payment', 'interest', 'principal', 'balance'
    } = params

    // Get principal amount (could be a reference)
    const principalValue = typeof principal === 'string'
        ? helpers.sumArray(context[principal] || [])
        : principal

    const schedule = helpers.amortizingDebt(
        principalValue,
        rate,
        termYears,
        timeline,
        startDate || timeline.startDate
    )

    return schedule[outputType] || schedule.payment
}

/**
 * Lookup from external data
 */
function calculateLookup(params, context, timeline) {
    const { source, column, defaultValue = 0 } = params

    // Look up from context (e.g., price curves)
    const data = context[source]
    if (!data) {
        return helpers.constantArray(defaultValue, timeline.periods)
    }

    if (column && typeof data === 'object' && !Array.isArray(data)) {
        return data[column] || helpers.constantArray(defaultValue, timeline.periods)
    }

    if (Array.isArray(data)) {
        return data
    }

    return helpers.constantArray(defaultValue, timeline.periods)
}

// ============================================================================
// DEPENDENCY ORDERING
// ============================================================================

/**
 * Topological sort of items based on dependencies
 */
function topologicalSort(items) {
    const itemMap = new Map(items.map(item => [item.id, item]))
    const visited = new Set()
    const sorted = []

    // Get dependencies for an item
    function getDependencies(item) {
        const deps = []

        // Parent reference
        if (item.parentId && itemMap.has(item.parentId)) {
            // Don't add parent as dependency - children come first
        }

        // Formula references
        if (item.calcType === 'formula' && item.calcParams?.formula) {
            const refs = extractReferences(item.calcParams.formula)
            refs.forEach(ref => {
                if (itemMap.has(ref)) {
                    deps.push(ref)
                }
            })
        }

        // Sum children - children must be calculated first
        if (item.childIds) {
            item.childIds.forEach(childId => {
                if (itemMap.has(childId)) {
                    deps.push(childId)
                }
            })
        }

        // Mask references
        if (item.calcParams?.mask && itemMap.has(item.calcParams.mask)) {
            deps.push(item.calcParams.mask)
        }

        return deps
    }

    // DFS visit
    function visit(item) {
        if (visited.has(item.id)) return
        visited.add(item.id)

        const deps = getDependencies(item)
        deps.forEach(depId => {
            const depItem = itemMap.get(depId)
            if (depItem) visit(depItem)
        })

        sorted.push(item)
    }

    // Visit all items
    items.forEach(item => visit(item))

    return sorted
}

// ============================================================================
// HIERARCHY BUILDING
// ============================================================================

/**
 * Build parent-child relationships from flat item list
 */
export function buildHierarchy(items) {
    const itemMap = new Map(items.map(item => [item.id, { ...item, children: [] }]))
    const roots = []

    items.forEach(item => {
        const node = itemMap.get(item.id)
        if (item.parentId && itemMap.has(item.parentId)) {
            itemMap.get(item.parentId).children.push(node)
        } else {
            roots.push(node)
        }
    })

    // Sort children by order
    function sortChildren(node) {
        node.children.sort((a, b) => (a.order || 0) - (b.order || 0))
        node.children.forEach(sortChildren)
    }

    roots.sort((a, b) => (a.order || 0) - (b.order || 0))
    roots.forEach(sortChildren)

    return roots
}

/**
 * Flatten hierarchy back to array (with childIds populated)
 */
export function flattenHierarchy(roots) {
    const result = []

    function visit(node, depth = 0) {
        const item = { ...node, depth, childIds: node.children.map(c => c.id) }
        delete item.children
        result.push(item)

        node.children.forEach(child => visit(child, depth + 1))
    }

    roots.forEach(root => visit(root))
    return result
}

// ============================================================================
// SECTION GROUPING
// ============================================================================

/**
 * Group items by section for display/export
 */
export function groupBySection(items) {
    const groups = {}

    items.forEach(item => {
        const section = item.section || 'other'
        if (!groups[section]) {
            groups[section] = []
        }
        groups[section].push(item)
    })

    // Sort items within each section
    Object.values(groups).forEach(items => {
        items.sort((a, b) => (a.order || 0) - (b.order || 0))
    })

    return groups
}

// ============================================================================
// SUMMARY FUNCTIONS
// ============================================================================

/**
 * Calculate summary metrics for an item
 */
export function calculateSummaries(itemId, values, timeline) {
    const operatingMask = timeline.flags?.is_operating

    return {
        total: helpers.sumArray(values),
        operatingTotal: operatingMask ? helpers.sumWhere(values, operatingMask) : helpers.sumArray(values),
        min: helpers.minArray(values.filter(v => v !== 0) || [0]),
        max: helpers.maxArray(values),
        avg: helpers.avgArray(values),
        byYear: helpers.sumByYear(values, timeline),
        byQuarter: helpers.sumByQuarter(values, timeline),
    }
}

/**
 * Calculate financial metrics
 */
export function calculateMetrics(context, timeline) {
    const metrics = {}

    // Equity IRR
    if (context.equity_cashflow) {
        metrics.equityIRR = helpers.irr(context.equity_cashflow, 12) * 100  // Convert to %
    }

    // Project IRR (using CFADS)
    if (context.cfads && context.capex) {
        const projectCF = helpers.subtractArrays(context.cfads, context.capex)
        metrics.projectIRR = helpers.irr(projectCF, 12) * 100
    }

    // MOIC
    if (context.equity_cashflow) {
        const inflows = context.equity_cashflow.filter(v => v > 0).reduce((a, b) => a + b, 0)
        const outflows = Math.abs(context.equity_cashflow.filter(v => v < 0).reduce((a, b) => a + b, 0))
        metrics.moic = outflows > 0 ? inflows / outflows : 0
    }

    // NPV @ various rates
    if (context.equity_cashflow) {
        metrics.npv8 = helpers.npv(context.equity_cashflow, 0.08, 12)
        metrics.npv10 = helpers.npv(context.equity_cashflow, 0.10, 12)
        metrics.npv12 = helpers.npv(context.equity_cashflow, 0.12, 12)
    }

    // DSCR metrics
    if (context.dscr) {
        const validDSCR = context.dscr.filter(v => v > 0 && isFinite(v))
        if (validDSCR.length > 0) {
            metrics.minDSCR = Math.min(...validDSCR)
            metrics.avgDSCR = validDSCR.reduce((a, b) => a + b, 0) / validDSCR.length
        }
    }

    // LLCR / PLCR
    if (context.cfads && context.debt_balance) {
        const firstDebtIdx = context.debt_balance.findIndex(b => b > 0)
        if (firstDebtIdx >= 0) {
            const debtPeriodCFADS = context.cfads.slice(firstDebtIdx)
            const initialDebt = context.debt_balance[firstDebtIdx]
            if (initialDebt > 0) {
                metrics.llcr = helpers.npv(debtPeriodCFADS, 0.055, 12) / initialDebt
            }
        }
    }

    return metrics
}

// ============================================================================
// EXPORTS
// ============================================================================

export { calculateItem, topologicalSort }
