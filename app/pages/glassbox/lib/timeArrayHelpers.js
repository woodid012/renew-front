/**
 * Time Array Helpers
 * Core utilities for timeline-based financial modeling.
 * All arrays share a single Timeline index for consistency.
 */

// ============================================================================
// TIMELINE CREATION
// ============================================================================

/**
 * Create a Timeline object with proper Date index and derived properties.
 * @param {Date|string} startDate - Model start date
 * @param {Date|string} endDate - Model end date
 * @param {string} frequency - 'monthly', 'quarterly', 'annual', 'daily', 'hourly', '30min', '5min'
 * @param {object} options - Additional options
 * @returns {object} Timeline object with index and derived properties
 */
export function createTimeline(startDate, endDate, frequency = 'monthly', options = {}) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const { fyearStart = 7 } = options  // Fiscal year starts in July by default

    // Generate date index based on frequency
    const index = generateDateIndex(start, end, frequency)
    const periods = index.length

    // Derive properties from dates
    const year = index.map(d => d.getFullYear())
    const month = index.map(d => d.getMonth() + 1)  // 1-indexed
    const day = index.map(d => d.getDate())
    const quarter = index.map(d => Math.ceil((d.getMonth() + 1) / 3))
    const weekday = index.map(d => d.getDay())  // 0=Sun, 1=Mon...
    const hour = index.map(d => d.getHours())
    const minute = index.map(d => d.getMinutes())

    // Fiscal year calculation
    const fyear = index.map(d => {
        const m = d.getMonth() + 1
        const y = d.getFullYear()
        return m >= fyearStart ? y + 1 : y
    })

    // Period index (0-based)
    const periodIndex = index.map((_, i) => i)

    return {
        // Metadata
        startDate: start,
        endDate: end,
        frequency,
        periods,
        fyearStart,

        // Primary index (Date objects)
        index,

        // Derived arrays
        year,
        month,
        day,
        quarter,
        fyear,
        weekday,
        hour,
        minute,
        periodIndex,

        // Flags container (populated separately)
        flags: {},
    }
}

/**
 * Generate array of dates at specified frequency
 */
function generateDateIndex(start, end, frequency) {
    const dates = []
    let current = new Date(start)

    const incrementors = {
        '5min': (d) => new Date(d.getTime() + 5 * 60 * 1000),
        '30min': (d) => new Date(d.getTime() + 30 * 60 * 1000),
        'hourly': (d) => new Date(d.getTime() + 60 * 60 * 1000),
        'daily': (d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n },
        'monthly': (d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n },
        'quarterly': (d) => { const n = new Date(d); n.setMonth(n.getMonth() + 3); return n },
        'annual': (d) => { const n = new Date(d); n.setFullYear(n.getFullYear() + 1); return n },
    }

    const increment = incrementors[frequency] || incrementors['monthly']

    while (current <= end) {
        dates.push(new Date(current))
        current = increment(current)
    }

    return dates
}

// ============================================================================
// MASK / FLAG CREATION
// ============================================================================

/**
 * Create a 1/0 mask for periods within a date range
 * @param {object} timeline - Timeline object
 * @param {Date|string} startDate - Start of active period
 * @param {Date|string} endDate - End of active period
 * @returns {number[]} Array of 1s and 0s
 */
export function createMask(timeline, startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)

    return timeline.index.map(d => (d >= start && d <= end) ? 1 : 0)
}

/**
 * Create mask based on period indices
 */
export function createIndexMask(timeline, startIdx, endIdx) {
    return timeline.periodIndex.map(i => (i >= startIdx && i <= endIdx) ? 1 : 0)
}

/**
 * Create mask where a derived property equals a value
 * e.g., createPropertyMask(timeline, 'quarter', 4) -> mask for Q4
 */
export function createPropertyMask(timeline, property, value) {
    const arr = timeline[property]
    if (!arr) throw new Error(`Property '${property}' not found on timeline`)
    return arr.map(v => v === value ? 1 : 0)
}

/**
 * Add a named flag to the timeline
 */
export function addFlag(timeline, name, startDate, endDate) {
    timeline.flags[name] = createMask(timeline, startDate, endDate)
    return timeline
}

/**
 * Add construction/operating flags based on COD date
 */
export function addProjectFlags(timeline, codDate, contractEndDate = null, debtEndDate = null) {
    const cod = new Date(codDate)

    // Construction: before COD
    timeline.flags.is_construction = timeline.index.map(d => d < cod ? 1 : 0)

    // Operating: COD onwards
    timeline.flags.is_operating = timeline.index.map(d => d >= cod ? 1 : 0)

    // Contracted period
    if (contractEndDate) {
        const contractEnd = new Date(contractEndDate)
        timeline.flags.is_contracted = timeline.index.map(d =>
            (d >= cod && d <= contractEnd) ? 1 : 0
        )
        timeline.flags.is_merchant = timeline.index.map(d =>
            d > contractEnd ? 1 : 0
        )
    }

    // Debt period
    if (debtEndDate) {
        const debtEnd = new Date(debtEndDate)
        timeline.flags.is_debt_period = timeline.index.map(d =>
            (d >= cod && d <= debtEnd) ? 1 : 0
        )
    }

    return timeline
}

/**
 * Combine masks with logical operations
 */
export function combineMasks(mask1, mask2, operation = 'and') {
    if (mask1.length !== mask2.length) {
        throw new Error('Masks must have same length')
    }

    switch (operation) {
        case 'and':
            return mask1.map((v, i) => (v === 1 && mask2[i] === 1) ? 1 : 0)
        case 'or':
            return mask1.map((v, i) => (v === 1 || mask2[i] === 1) ? 1 : 0)
        case 'not':
            return mask1.map(v => v === 1 ? 0 : 1)
        case 'xor':
            return mask1.map((v, i) => (v !== mask2[i]) ? 1 : 0)
        default:
            throw new Error(`Unknown operation: ${operation}`)
    }
}

// ============================================================================
// ARRAY MATH
// ============================================================================

/**
 * Element-wise sum of multiple arrays
 */
export function sumArrays(...arrays) {
    if (arrays.length === 0) return []
    const len = arrays[0].length

    return Array.from({ length: len }, (_, i) =>
        arrays.reduce((sum, arr) => sum + (arr[i] || 0), 0)
    )
}

/**
 * Element-wise subtraction: a - b
 */
export function subtractArrays(a, b) {
    return a.map((v, i) => v - (b[i] || 0))
}

/**
 * Element-wise multiplication (typically for applying masks)
 */
export function multiplyArrays(a, b) {
    return a.map((v, i) => v * (b[i] || 0))
}

/**
 * Element-wise division: a / b (returns 0 if b[i] is 0)
 */
export function divideArrays(a, b) {
    return a.map((v, i) => (b[i] !== 0) ? v / b[i] : 0)
}

/**
 * Negate all values in array
 */
export function negateArray(arr) {
    return arr.map(v => -v)
}

/**
 * Element-wise max of two arrays
 */
export function maxArrays(a, b) {
    return a.map((v, i) => Math.max(v, b[i] || 0))
}

/**
 * Element-wise min of two arrays
 */
export function minArrays(a, b) {
    return a.map((v, i) => Math.min(v, b[i] || 0))
}

/**
 * Apply a scalar or array mask: if mask[i] = 1, use a[i], else use b[i]
 */
export function conditionalArray(mask, a, b) {
    return mask.map((m, i) => m === 1 ? (a[i] || 0) : (b[i] || 0))
}

// ============================================================================
// VALUE GENERATORS
// ============================================================================

/**
 * Create array of constant value
 */
export function constantArray(value, length, mask = null) {
    const arr = Array(length).fill(value)
    return mask ? multiplyArrays(arr, mask) : arr
}

/**
 * Create array with zeros
 */
export function zerosArray(length) {
    return Array(length).fill(0)
}

/**
 * Create escalating array: base * (1 + rate)^n
 * @param {number} baseValue - Starting value
 * @param {number} rate - Annual rate (e.g., 0.025 for 2.5%)
 * @param {object} timeline - Timeline object
 * @param {Date|string} startDate - When escalation starts
 * @param {number[]} mask - Optional mask to apply
 */
export function escalatingArray(baseValue, rate, timeline, startDate, mask = null) {
    const start = new Date(startDate)
    const startYear = start.getFullYear()

    const arr = timeline.index.map((d, i) => {
        if (d < start) return 0
        const yearsElapsed = timeline.year[i] - startYear
        return baseValue * Math.pow(1 + rate, yearsElapsed)
    })

    return mask ? multiplyArrays(arr, mask) : arr
}

/**
 * Create degrading array: base * (1 - rate)^n
 */
export function degradingArray(baseValue, rate, timeline, startDate, mask = null) {
    const start = new Date(startDate)
    const startYear = start.getFullYear()

    const arr = timeline.index.map((d, i) => {
        if (d < start) return 0
        const yearsElapsed = timeline.year[i] - startYear
        return baseValue * Math.pow(1 - rate, yearsElapsed)
    })

    return mask ? multiplyArrays(arr, mask) : arr
}

/**
 * Create cumulative escalation index: (1 + rate)^n
 * Useful for applying to costs: cost * cumulativeIndex
 */
export function cumulativeEscalationIndex(rate, timeline, startDate) {
    const start = new Date(startDate)
    const startYear = start.getFullYear()

    return timeline.index.map((d, i) => {
        if (d < start) return 1
        const yearsElapsed = timeline.year[i] - startYear
        return Math.pow(1 + rate, yearsElapsed)
    })
}

// ============================================================================
// LOOKUPS & SLICING
// ============================================================================

/**
 * Get value at specific date (index-based lookup)
 */
export function getAtDate(values, timeline, targetDate) {
    const target = new Date(targetDate)
    const idx = timeline.index.findIndex(d => d >= target)
    return idx >= 0 ? values[idx] : null
}

/**
 * Find period index for a date
 */
export function findIndex(timeline, targetDate) {
    const target = new Date(targetDate)
    return timeline.index.findIndex(d => d >= target)
}

/**
 * Get slice of values between dates
 */
export function sliceByDates(values, timeline, startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)

    return values.filter((_, i) =>
        timeline.index[i] >= start && timeline.index[i] <= end
    )
}

/**
 * Lag array by n periods (shift forward in time)
 */
export function lagArray(arr, n = 1, fillValue = 0) {
    if (n <= 0) return [...arr]
    const fill = Array(n).fill(fillValue)
    return [...fill, ...arr.slice(0, -n)]
}

/**
 * Lead array by n periods (shift backward in time)
 */
export function leadArray(arr, n = 1, fillValue = 0) {
    if (n <= 0) return [...arr]
    const fill = Array(n).fill(fillValue)
    return [...arr.slice(n), ...fill]
}

// ============================================================================
// AGGREGATION
// ============================================================================

/**
 * Sum values where mask = 1
 */
export function sumWhere(values, mask) {
    return values.reduce((sum, v, i) => sum + (mask[i] === 1 ? v : 0), 0)
}

/**
 * Sum entire array
 */
export function sumArray(arr) {
    return arr.reduce((sum, v) => sum + v, 0)
}

/**
 * Average of array
 */
export function avgArray(arr) {
    return arr.length > 0 ? sumArray(arr) / arr.length : 0
}

/**
 * Min of array
 */
export function minArray(arr) {
    return Math.min(...arr)
}

/**
 * Max of array
 */
export function maxArray(arr) {
    return Math.max(...arr)
}

/**
 * Group and sum by year
 */
export function sumByYear(values, timeline) {
    const result = {}
    values.forEach((v, i) => {
        const year = timeline.year[i]
        result[year] = (result[year] || 0) + v
    })
    return result
}

/**
 * Group and sum by quarter
 */
export function sumByQuarter(values, timeline) {
    const result = {}
    values.forEach((v, i) => {
        const key = `${timeline.year[i]}-Q${timeline.quarter[i]}`
        result[key] = (result[key] || 0) + v
    })
    return result
}

/**
 * Group and sum by month
 */
export function sumByMonth(values, timeline) {
    const result = {}
    values.forEach((v, i) => {
        const key = `${timeline.year[i]}-${String(timeline.month[i]).padStart(2, '0')}`
        result[key] = (result[key] || 0) + v
    })
    return result
}

/**
 * Group and sum by fiscal year
 */
export function sumByFYear(values, timeline) {
    const result = {}
    values.forEach((v, i) => {
        const fy = `FY${timeline.fyear[i]}`
        result[fy] = (result[fy] || 0) + v
    })
    return result
}

// ============================================================================
// FINANCIAL FUNCTIONS
// ============================================================================

/**
 * Net Present Value
 * @param {number[]} cashflows - Array of cash flows
 * @param {number} rate - Discount rate (annual, e.g., 0.08 for 8%)
 * @param {number} periodsPerYear - 12 for monthly, 4 for quarterly, 1 for annual
 */
export function npv(cashflows, rate, periodsPerYear = 12) {
    const periodicRate = rate / periodsPerYear
    return cashflows.reduce((pv, cf, i) => {
        return pv + cf / Math.pow(1 + periodicRate, i)
    }, 0)
}

/**
 * Internal Rate of Return (using Newton-Raphson)
 * @param {number[]} cashflows - Array of cash flows
 * @param {number} periodsPerYear - 12 for monthly, 4 for quarterly, 1 for annual
 * @param {number} guess - Initial guess (default 0.1 = 10%)
 */
export function irr(cashflows, periodsPerYear = 12, guess = 0.1) {
    if (!cashflows || cashflows.length === 0) return 0

    const hasNegative = cashflows.some(cf => cf < 0)
    const hasPositive = cashflows.some(cf => cf > 0)
    if (!hasNegative || !hasPositive) return 0

    let rate = guess
    const maxIterations = 100
    const tolerance = 0.0001

    for (let i = 0; i < maxIterations; i++) {
        let npvValue = 0
        let dnpv = 0

        for (let j = 0; j < cashflows.length; j++) {
            const cf = cashflows[j]
            const discountFactor = Math.pow(1 + rate, j)
            npvValue += cf / discountFactor
            dnpv -= j * cf / Math.pow(1 + rate, j + 1)
        }

        if (Math.abs(dnpv) < 1e-10) break

        const newRate = rate - npvValue / dnpv

        if (Math.abs(newRate - rate) < tolerance) {
            // Convert periodic rate to annual
            return Math.pow(1 + newRate, periodsPerYear) - 1
        }

        rate = newRate
        if (rate < -0.99) rate = -0.99
        if (rate > 10) rate = 10
    }

    return Math.pow(1 + rate, periodsPerYear) - 1
}

/**
 * Calculate debt amortization schedule
 * @returns {object} { balance, interest, principal, payment }
 */
export function amortizingDebt(principal, annualRate, termYears, timeline, startDate, periodsPerYear = 12) {
    const start = new Date(startDate)
    const periodicRate = annualRate / periodsPerYear
    const totalPayments = termYears * periodsPerYear

    // Calculate periodic payment (PMT)
    const payment = principal * (periodicRate * Math.pow(1 + periodicRate, totalPayments)) /
        (Math.pow(1 + periodicRate, totalPayments) - 1)

    const balance = []
    const interest = []
    const principalPay = []
    const payments = []

    let currentBalance = 0
    let paymentCount = 0

    timeline.index.forEach((d, i) => {
        if (d < start) {
            // Before debt starts
            balance.push(0)
            interest.push(0)
            principalPay.push(0)
            payments.push(0)
        } else if (paymentCount === 0) {
            // First period - drawdown
            balance.push(principal)
            interest.push(0)
            principalPay.push(0)
            payments.push(0)
            currentBalance = principal
            paymentCount = 1
        } else if (paymentCount <= totalPayments && currentBalance > 0) {
            // Amortization period
            const periodInterest = currentBalance * periodicRate
            const periodPrincipal = Math.min(payment - periodInterest, currentBalance)
            currentBalance = currentBalance - periodPrincipal

            balance.push(currentBalance)
            interest.push(periodInterest)
            principalPay.push(periodPrincipal)
            payments.push(periodInterest + periodPrincipal)
            paymentCount++
        } else {
            // After debt repaid
            balance.push(0)
            interest.push(0)
            principalPay.push(0)
            payments.push(0)
        }
    })

    return { balance, interest, principal: principalPay, payment: payments }
}

/**
 * Size debt from CFADS at target DSCR
 * Returns max debt that satisfies DSCR constraint
 */
export function sizeDebtFromCFADS(cfadsArray, targetDSCR, annualRate, termYears, periodsPerYear = 12) {
    // Find minimum CFADS during debt period (excluding zeros/construction)
    const operatingCFADS = cfadsArray.filter(cf => cf > 0)
    if (operatingCFADS.length === 0) return 0

    const minCFADS = Math.min(...operatingCFADS)
    const annualMinCFADS = minCFADS * (periodsPerYear === 12 ? 12 : periodsPerYear === 4 ? 4 : 1)

    // Max annual debt service
    const maxAnnualDS = annualMinCFADS / targetDSCR

    // Calculate max debt using PV of annuity
    const periodicRate = annualRate / periodsPerYear
    const totalPayments = termYears * periodsPerYear
    const annuityFactor = (1 - Math.pow(1 + periodicRate, -totalPayments)) / periodicRate

    const maxDebt = (maxAnnualDS / periodsPerYear) * annuityFactor

    return maxDebt
}

// ============================================================================
// RESAMPLING (Frequency Conversion)
// ============================================================================

/**
 * Resample array to different frequency
 * @param {number[]} values - Source values
 * @param {object} sourceTimeline - Source timeline
 * @param {object} targetTimeline - Target timeline
 * @param {string} method - 'sum', 'mean', 'last', 'first', 'interpolate'
 */
export function resample(values, sourceTimeline, targetTimeline, method = 'sum') {
    // For now, implement basic monthly↔annual conversion
    // More complex resampling can be added later

    const result = []

    targetTimeline.index.forEach((targetDate, targetIdx) => {
        const targetYear = targetTimeline.year[targetIdx]
        const targetMonth = targetTimeline.month[targetIdx]

        // Find matching source values
        const matchingValues = values.filter((_, srcIdx) => {
            if (targetTimeline.frequency === 'annual') {
                // Target is annual: match all source periods in that year
                return sourceTimeline.year[srcIdx] === targetYear
            } else if (targetTimeline.frequency === 'monthly' && sourceTimeline.frequency === 'annual') {
                // Target is monthly, source is annual: spread/fill
                return sourceTimeline.year[srcIdx] === targetYear
            } else {
                // Same frequency or month match
                return sourceTimeline.year[srcIdx] === targetYear &&
                    sourceTimeline.month[srcIdx] === targetMonth
            }
        })

        if (matchingValues.length === 0) {
            result.push(0)
        } else {
            switch (method) {
                case 'sum':
                    result.push(matchingValues.reduce((a, b) => a + b, 0))
                    break
                case 'mean':
                    result.push(matchingValues.reduce((a, b) => a + b, 0) / matchingValues.length)
                    break
                case 'last':
                    result.push(matchingValues[matchingValues.length - 1])
                    break
                case 'first':
                    result.push(matchingValues[0])
                    break
                case 'spread':
                    // For annual→monthly: divide by 12
                    result.push(matchingValues[0] / 12)
                    break
                default:
                    result.push(matchingValues[0])
            }
        }
    })

    return result
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format date for display
 */
export function formatDate(date, format = 'YYYY-MM') {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')

    switch (format) {
        case 'YYYY':
            return String(year)
        case 'YYYY-MM':
            return `${year}-${month}`
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`
        case 'MMM-YY':
            return `${d.toLocaleString('en', { month: 'short' })}-${String(year).slice(2)}`
        default:
            return `${year}-${month}`
    }
}

/**
 * Get column headers for Excel
 */
export function getColumnHeaders(timeline, format = 'MMM-YY') {
    return timeline.index.map(d => formatDate(d, format))
}
