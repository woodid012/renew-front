/**
 * Formula Parser
 * Parses formula strings like '{revenue} - {costs}' and evaluates against data context.
 * Supports {id} references, built-in functions, and arithmetic operations.
 */

import * as helpers from './timeArrayHelpers.js'

// ============================================================================
// BUILT-IN FUNCTIONS
// ============================================================================

const builtInFunctions = {
    // Array math
    max: (a, b) => Array.isArray(a) ? helpers.maxArrays(a, b) : Math.max(a, b),
    min: (a, b) => Array.isArray(a) ? helpers.minArrays(a, b) : Math.min(a, b),
    abs: (a) => Array.isArray(a) ? a.map(v => Math.abs(v)) : Math.abs(a),

    // Aggregation (returns scalar)
    sum: (arr) => Array.isArray(arr) ? helpers.sumArray(arr) : (arr || 0),
    avg: (arr) => Array.isArray(arr) ? helpers.avgArray(arr) : (arr || 0),

    // Time-based - must check for array input
    lag: (arr, n = 1) => {
        if (!Array.isArray(arr)) return arr || 0
        return helpers.lagArray(arr, n)
    },
    lead: (arr, n = 1) => {
        if (!Array.isArray(arr)) return arr || 0
        return helpers.leadArray(arr, n)
    },
    cumulative: (arr) => {
        if (!Array.isArray(arr)) return arr || 0
        let sum = 0
        return arr.map(v => { sum += v; return sum })
    },
    cumulativeProduct: (rateArray) => {
        if (!Array.isArray(rateArray)) return rateArray || 0
        let product = 1
        return rateArray.map(r => { product *= (1 + r); return product })
    },

    // Financial
    npv: (cashflows, rate = 0.08) => Array.isArray(cashflows) ? helpers.npv(cashflows, rate) : 0,
    irr: (cashflows) => Array.isArray(cashflows) ? helpers.irr(cashflows) : 0,

    // Conditional (element-wise)
    if: (condition, trueVal, falseVal) => {
        if (Array.isArray(condition)) {
            return condition.map((c, i) => {
                const t = Array.isArray(trueVal) ? trueVal[i] : trueVal
                const f = Array.isArray(falseVal) ? falseVal[i] : falseVal
                return c ? t : f
            })
        }
        return condition ? trueVal : falseVal
    },

    // Logical (for masks)
    and: (a, b) => (Array.isArray(a) && Array.isArray(b)) ? helpers.combineMasks(a, b, 'and') : 0,
    or: (a, b) => (Array.isArray(a) && Array.isArray(b)) ? helpers.combineMasks(a, b, 'or') : 0,
    not: (a) => Array.isArray(a) ? helpers.combineMasks(a, a, 'not') : 0,
}


// ============================================================================
// TOKENIZER
// ============================================================================

const TOKEN_TYPES = {
    NUMBER: 'NUMBER',
    IDENTIFIER: 'IDENTIFIER',
    REFERENCE: 'REFERENCE',  // {id}
    OPERATOR: 'OPERATOR',
    FUNCTION: 'FUNCTION',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    COMMA: 'COMMA',
}

/**
 * Tokenize a formula string
 */
function tokenize(formula) {
    const tokens = []
    let i = 0

    while (i < formula.length) {
        const char = formula[i]

        // Skip whitespace
        if (/\s/.test(char)) {
            i++
            continue
        }

        // Reference: {id}
        if (char === '{') {
            let refName = ''
            i++ // skip {
            while (i < formula.length && formula[i] !== '}') {
                refName += formula[i]
                i++
            }
            i++ // skip }
            tokens.push({ type: TOKEN_TYPES.REFERENCE, value: refName.trim() })
            continue
        }

        // Number
        if (/[\d.]/.test(char)) {
            let num = ''
            while (i < formula.length && /[\d.eE+-]/.test(formula[i])) {
                num += formula[i]
                i++
            }
            tokens.push({ type: TOKEN_TYPES.NUMBER, value: parseFloat(num) })
            continue
        }

        // Identifier or function
        if (/[a-zA-Z_]/.test(char)) {
            let name = ''
            while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) {
                name += formula[i]
                i++
            }

            // Check if it's a built-in function
            if (builtInFunctions[name.toLowerCase()]) {
                tokens.push({ type: TOKEN_TYPES.FUNCTION, value: name.toLowerCase() })
            } else {
                tokens.push({ type: TOKEN_TYPES.IDENTIFIER, value: name })
            }
            continue
        }

        // Operators
        if (/[+\-*/^%]/.test(char)) {
            tokens.push({ type: TOKEN_TYPES.OPERATOR, value: char })
            i++
            continue
        }

        // Parentheses
        if (char === '(') {
            tokens.push({ type: TOKEN_TYPES.LPAREN, value: '(' })
            i++
            continue
        }
        if (char === ')') {
            tokens.push({ type: TOKEN_TYPES.RPAREN, value: ')' })
            i++
            continue
        }

        // Comma
        if (char === ',') {
            tokens.push({ type: TOKEN_TYPES.COMMA, value: ',' })
            i++
            continue
        }

        // Skip unknown characters
        i++
    }

    return tokens
}

// ============================================================================
// PARSER & EVALUATOR
// ============================================================================

/**
 * Parse and evaluate a formula against a data context
 * @param {string} formula - Formula string like '{revenue} - {costs}'
 * @param {object} context - Object mapping IDs to values/arrays
 * @param {object} timeline - Timeline object (for time-based functions)
 * @returns {number|number[]} - Evaluated result (scalar or array)
 */
export function evaluateFormula(formula, context = {}, timeline = null) {
    if (!formula || typeof formula !== 'string') {
        return 0
    }

    // Handle simple cases
    if (formula.trim() === '') return 0

    // Tokenize
    const tokens = tokenize(formula)

    if (tokens.length === 0) return 0

    // Simple expression parser
    // For now, handle: {a} + {b}, {a} - {b}, {a} * {b}, function({a}, {b})
    // More complex expressions can be added later

    try {
        return parseExpression(tokens, context, timeline)
    } catch (error) {
        console.error(`Formula evaluation error: ${formula}`, error)
        return 0
    }
}

/**
 * Parse an expression (handles operators and precedence)
 */
function parseExpression(tokens, context, timeline, pos = { index: 0 }) {
    let left = parseTerm(tokens, context, timeline, pos)

    while (pos.index < tokens.length) {
        const token = tokens[pos.index]

        if (token.type === TOKEN_TYPES.OPERATOR && (token.value === '+' || token.value === '-')) {
            pos.index++
            const right = parseTerm(tokens, context, timeline, pos)

            if (token.value === '+') {
                left = addValues(left, right)
            } else {
                left = subtractValues(left, right)
            }
        } else {
            break
        }
    }

    return left
}

/**
 * Parse a term (handles * and / with higher precedence)
 */
function parseTerm(tokens, context, timeline, pos) {
    let left = parseFactor(tokens, context, timeline, pos)

    while (pos.index < tokens.length) {
        const token = tokens[pos.index]

        if (token.type === TOKEN_TYPES.OPERATOR && (token.value === '*' || token.value === '/')) {
            pos.index++
            const right = parseFactor(tokens, context, timeline, pos)

            if (token.value === '*') {
                left = multiplyValues(left, right)
            } else {
                left = divideValues(left, right)
            }
        } else {
            break
        }
    }

    return left
}

/**
 * Parse a factor (numbers, references, functions, parentheses)
 */
function parseFactor(tokens, context, timeline, pos) {
    if (pos.index >= tokens.length) return 0

    const token = tokens[pos.index]

    // Number
    if (token.type === TOKEN_TYPES.NUMBER) {
        pos.index++
        return token.value
    }

    // Reference: {id}
    if (token.type === TOKEN_TYPES.REFERENCE) {
        pos.index++
        const value = context[token.value]
        if (value === undefined) {
            console.warn(`Reference not found: {${token.value}}`)
            return 0
        }
        return value
    }

    // Identifier (treat as reference without braces)
    if (token.type === TOKEN_TYPES.IDENTIFIER) {
        pos.index++
        const value = context[token.value]
        if (value === undefined) {
            console.warn(`Identifier not found: ${token.value}`)
            return 0
        }
        return value
    }

    // Function call
    if (token.type === TOKEN_TYPES.FUNCTION) {
        pos.index++
        const funcName = token.value
        const args = parseFunctionArgs(tokens, context, timeline, pos)

        const func = builtInFunctions[funcName]
        if (!func) {
            console.warn(`Unknown function: ${funcName}`)
            return 0
        }

        return func(...args)
    }

    // Parenthesized expression
    if (token.type === TOKEN_TYPES.LPAREN) {
        pos.index++ // skip (
        const result = parseExpression(tokens, context, timeline, pos)
        if (tokens[pos.index]?.type === TOKEN_TYPES.RPAREN) {
            pos.index++ // skip )
        }
        return result
    }

    // Unary minus
    if (token.type === TOKEN_TYPES.OPERATOR && token.value === '-') {
        pos.index++
        const value = parseFactor(tokens, context, timeline, pos)
        return negateValue(value)
    }

    return 0
}

/**
 * Parse function arguments
 */
function parseFunctionArgs(tokens, context, timeline, pos) {
    const args = []

    // Expect (
    if (tokens[pos.index]?.type !== TOKEN_TYPES.LPAREN) {
        return args
    }
    pos.index++ // skip (

    while (pos.index < tokens.length) {
        // Check for )
        if (tokens[pos.index]?.type === TOKEN_TYPES.RPAREN) {
            pos.index++
            break
        }

        // Parse argument
        const arg = parseExpression(tokens, context, timeline, pos)
        args.push(arg)

        // Check for comma
        if (tokens[pos.index]?.type === TOKEN_TYPES.COMMA) {
            pos.index++
        }
    }

    return args
}

// ============================================================================
// VALUE OPERATIONS (handle both scalars and arrays)
// ============================================================================

function addValues(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        return helpers.sumArrays(a, b)
    }
    if (Array.isArray(a)) {
        return a.map(v => v + b)
    }
    if (Array.isArray(b)) {
        return b.map(v => a + v)
    }
    return a + b
}

function subtractValues(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        return helpers.subtractArrays(a, b)
    }
    if (Array.isArray(a)) {
        return a.map(v => v - b)
    }
    if (Array.isArray(b)) {
        return b.map(v => a - v)
    }
    return a - b
}

function multiplyValues(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        return helpers.multiplyArrays(a, b)
    }
    if (Array.isArray(a)) {
        return a.map(v => v * b)
    }
    if (Array.isArray(b)) {
        return b.map(v => a * v)
    }
    return a * b
}

function divideValues(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        return helpers.divideArrays(a, b)
    }
    if (Array.isArray(a)) {
        return a.map(v => b !== 0 ? v / b : 0)
    }
    if (Array.isArray(b)) {
        return b.map((v, i) => v !== 0 ? a / v : 0)
    }
    return b !== 0 ? a / b : 0
}

function negateValue(a) {
    if (Array.isArray(a)) {
        return helpers.negateArray(a)
    }
    return -a
}

// ============================================================================
// REFERENCE EXTRACTION
// ============================================================================

/**
 * Extract all {id} references from a formula
 * Useful for dependency tracking
 */
export function extractReferences(formula) {
    if (!formula || typeof formula !== 'string') return []

    const refs = []
    const regex = /\{([^}]+)\}/g
    let match

    while ((match = regex.exec(formula)) !== null) {
        refs.push(match[1].trim())
    }

    return refs
}

/**
 * Check if a formula has any references
 */
export function hasReferences(formula) {
    return extractReferences(formula).length > 0
}

/**
 * Replace references in formula with values (for display/audit)
 */
export function substituteReferences(formula, context) {
    if (!formula || typeof formula !== 'string') return formula

    return formula.replace(/\{([^}]+)\}/g, (match, id) => {
        const value = context[id.trim()]
        if (Array.isArray(value)) {
            return `[array:${value.length}]`
        }
        return value !== undefined ? String(value) : match
    })
}

// ============================================================================
// EXPORTS
// ============================================================================

export { builtInFunctions }
