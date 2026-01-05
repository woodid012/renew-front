/**
 * Default Inputs
 * Seed data for input time series (prices, volumes, indexations).
 * These are user-configurable via the frontend.
 */

export const defaultInputs = [
    // ============================================================================
    // MARKET DATA
    // ============================================================================
    {
        id: 'energy_price',
        label: 'Energy Price',
        section: 'inputs',
        category: 'market_data',
        inputType: 'price_curve',
        inputParams: {
            source: 'PRICE_Curves',
            curveId: null,  // User selects
            column: 'baseload_energy',
            defaultValue: 50,
        },
        format: 'currency',
        unit: '$/MWh',
        editable: true,
        order: 1,
    },
    {
        id: 'green_price',
        label: 'Green / LGC Price',
        section: 'inputs',
        category: 'market_data',
        inputType: 'price_curve',
        inputParams: {
            source: 'PRICE_Curves',
            curveId: null,
            column: 'green',
            defaultValue: 35,
        },
        format: 'currency',
        unit: '$/MWh',
        editable: true,
        order: 2,
    },
    {
        id: 'capacity_price',
        label: 'Capacity Price',
        section: 'inputs',
        category: 'market_data',
        inputType: 'constant',
        inputParams: {
            value: 8,
        },
        format: 'currency',
        unit: '$/kW-yr',
        editable: true,
        order: 3,
    },

    // ============================================================================
    // VOLUME
    // ============================================================================
    {
        id: 'gross_generation',
        label: 'Gross Generation',
        section: 'inputs',
        category: 'volume',
        inputType: 'schedule',
        inputParams: {
            values: [],  // User enters or calculates from technical inputs
            defaultValue: 10000,
        },
        format: 'number',
        unit: 'MWh',
        editable: true,
        order: 10,
    },
    {
        id: 'availability',
        label: 'Availability Factor',
        section: 'inputs',
        category: 'volume',
        inputType: 'constant',
        inputParams: {
            value: 0.95,
        },
        format: 'percent',
        unit: '%',
        editable: true,
        order: 11,
    },
    {
        id: 'degradation_rate',
        label: 'Annual Degradation',
        section: 'inputs',
        category: 'volume',
        inputType: 'constant',
        inputParams: {
            value: 0.005,  // 0.5%
        },
        format: 'percent',
        unit: '%/yr',
        editable: true,
        order: 12,
    },
    {
        id: 'net_generation',
        label: 'Net Generation',
        section: 'inputs',
        category: 'volume',
        calcType: 'formula',
        calcParams: {
            formula: '{gross_generation} * {availability}',
        },
        format: 'number',
        unit: 'MWh',
        editable: false,
        order: 13,
    },

    // ============================================================================
    // INDEXATION
    // ============================================================================
    {
        id: 'cpi_rate',
        label: 'CPI Rate',
        section: 'inputs',
        category: 'indexation',
        inputType: 'constant',
        inputParams: {
            value: 0.025,  // 2.5%
        },
        format: 'percent',
        unit: '%',
        editable: true,
        order: 20,
    },
    {
        id: 'wage_escalation',
        label: 'Wage Escalation',
        section: 'inputs',
        category: 'indexation',
        inputType: 'constant',
        inputParams: {
            value: 0.03,  // 3%
        },
        format: 'percent',
        unit: '%',
        editable: true,
        order: 21,
    },
    {
        id: 'energy_escalation',
        label: 'Energy Price Escalation',
        section: 'inputs',
        category: 'indexation',
        inputType: 'constant',
        inputParams: {
            value: 0.02,  // 2%
        },
        format: 'percent',
        unit: '%',
        editable: true,
        order: 22,
    },

    // ============================================================================
    // CONTRACT TERMS
    // ============================================================================
    {
        id: 'toll_base',
        label: 'Toll Payment (Year 1)',
        section: 'inputs',
        category: 'contract',
        inputType: 'constant',
        inputParams: {
            value: 15000000,
        },
        format: 'currency',
        unit: '$',
        editable: true,
        order: 30,
    },
    {
        id: 'toll_escalation',
        label: 'Toll Escalation Rate',
        section: 'inputs',
        category: 'contract',
        inputType: 'constant',
        inputParams: {
            value: 0.025,
        },
        format: 'percent',
        unit: '%',
        editable: true,
        order: 31,
    },
    {
        id: 'contract_years',
        label: 'Contract Duration',
        section: 'inputs',
        category: 'contract',
        inputType: 'constant',
        inputParams: {
            value: 10,
        },
        format: 'number',
        unit: 'years',
        editable: true,
        order: 32,
    },

    // ============================================================================
    // FINANCING ASSUMPTIONS
    // ============================================================================
    {
        id: 'debt_amount',
        label: 'Debt Amount',
        section: 'inputs',
        category: 'financing',
        inputType: 'constant',
        inputParams: {
            value: 80000000,
        },
        format: 'currency',
        unit: '$',
        editable: true,
        order: 40,
    },
    {
        id: 'debt_rate',
        label: 'Debt Interest Rate',
        section: 'inputs',
        category: 'financing',
        inputType: 'constant',
        inputParams: {
            value: 0.055,  // 5.5%
        },
        format: 'percent',
        unit: '%',
        editable: true,
        order: 41,
    },
    {
        id: 'debt_tenor',
        label: 'Debt Tenor',
        section: 'inputs',
        category: 'financing',
        inputType: 'constant',
        inputParams: {
            value: 15,
        },
        format: 'number',
        unit: 'years',
        editable: true,
        order: 42,
    },
    {
        id: 'target_dscr',
        label: 'Target DSCR',
        section: 'inputs',
        category: 'financing',
        inputType: 'constant',
        inputParams: {
            value: 1.35,
        },
        format: 'ratio',
        unit: 'x',
        editable: true,
        order: 43,
    },
    {
        id: 'dsra_months',
        label: 'DSRA Coverage (months)',
        section: 'inputs',
        category: 'financing',
        inputType: 'constant',
        inputParams: {
            value: 6,
        },
        format: 'number',
        unit: 'months',
        editable: true,
        order: 44,
    },

    // ============================================================================
    // TAX ASSUMPTIONS
    // ============================================================================
    {
        id: 'tax_rate',
        label: 'Corporate Tax Rate',
        section: 'inputs',
        category: 'tax',
        inputType: 'constant',
        inputParams: {
            value: 0.30,  // 30%
        },
        format: 'percent',
        unit: '%',
        editable: true,
        order: 50,
    },
    {
        id: 'depreciation_life',
        label: 'Depreciation Life',
        section: 'inputs',
        category: 'tax',
        inputType: 'constant',
        inputParams: {
            value: 20,
        },
        format: 'number',
        unit: 'years',
        editable: true,
        order: 51,
    },
    {
        id: 'itc_rate',
        label: 'ITC Rate',
        section: 'inputs',
        category: 'tax',
        inputType: 'constant',
        inputParams: {
            value: 0.30,  // 30%
        },
        format: 'percent',
        unit: '%',
        editable: true,
        order: 52,
    },

    // ============================================================================
    // WORKING CAPITAL
    // ============================================================================
    {
        id: 'ar_days',
        label: 'Receivables Days',
        section: 'inputs',
        category: 'working_capital',
        inputType: 'constant',
        inputParams: {
            value: 30,
        },
        format: 'number',
        unit: 'days',
        editable: true,
        order: 60,
    },
    {
        id: 'ap_days',
        label: 'Payables Days',
        section: 'inputs',
        category: 'working_capital',
        inputType: 'constant',
        inputParams: {
            value: 45,
        },
        format: 'number',
        unit: 'days',
        editable: true,
        order: 61,
    },
]

/**
 * Input categories for UI grouping
 */
export const inputCategories = [
    { id: 'market_data', label: 'Market Data', order: 1 },
    { id: 'volume', label: 'Volume / Generation', order: 2 },
    { id: 'indexation', label: 'Indexation Rates', order: 3 },
    { id: 'contract', label: 'Contract Terms', order: 4 },
    { id: 'financing', label: 'Financing Assumptions', order: 5 },
    { id: 'tax', label: 'Tax Assumptions', order: 6 },
    { id: 'working_capital', label: 'Working Capital', order: 7 },
]

/**
 * Create input arrays from schemas
 */
export function initializeInputs(inputSchemas, timeline) {
    const inputs = {}

    inputSchemas.forEach(schema => {
        const { id, inputType, inputParams = {}, calcType, calcParams } = schema

        // If it has a calcType, it's calculated not input
        if (calcType) return

        switch (inputType) {
            case 'constant':
                inputs[id] = Array(timeline.periods).fill(inputParams.value || 0)
                break

            case 'schedule':
                const values = inputParams.values || []
                const defaultVal = inputParams.defaultValue || 0
                inputs[id] = values.length >= timeline.periods
                    ? values.slice(0, timeline.periods)
                    : [...values, ...Array(timeline.periods - values.length).fill(defaultVal)]
                break

            case 'price_curve':
                // Will be populated from MongoDB
                inputs[id] = Array(timeline.periods).fill(inputParams.defaultValue || 0)
                break

            default:
                inputs[id] = Array(timeline.periods).fill(0)
        }
    })

    return inputs
}
