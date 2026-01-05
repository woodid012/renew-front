/**
 * Default Line Items
 * Seed data for P&L, Financing, Cash Flow, and Balance Sheet line items.
 * These are user-configurable via the frontend.
 */

export const defaultLineItems = [
    // ============================================================================
    // P&L: REVENUE
    // ============================================================================
    {
        id: 'revenue',
        label: 'REVENUE',
        section: 'pnl',
        parentId: null,
        calcType: 'sum_children',
        childIds: ['contracted_revenue', 'merchant_revenue'],
        operations: ['+', '+'],
        format: 'currency',
        indent: 0,
        order: 1,
    },
    {
        id: 'contracted_revenue',
        label: 'Contracted Revenue',
        section: 'pnl',
        parentId: 'revenue',
        calcType: 'sum_children',
        childIds: ['toll_revenue', 'capacity_revenue'],
        operations: ['+', '+'],
        format: 'currency',
        indent: 1,
        order: 2,
    },
    {
        id: 'toll_revenue',
        label: 'Toll Payment',
        section: 'pnl',
        parentId: 'contracted_revenue',
        calcType: 'escalating',
        calcParams: {
            baseValue: 15000000,
            rate: 0.025,
            mask: 'is_contracted',
        },
        format: 'currency',
        indent: 2,
        order: 3,
    },
    {
        id: 'capacity_revenue',
        label: 'Capacity Payment',
        section: 'pnl',
        parentId: 'contracted_revenue',
        calcType: 'constant',
        calcParams: {
            value: 0,  // Optional - set by user
            mask: 'is_contracted',
        },
        format: 'currency',
        indent: 2,
        order: 4,
    },
    {
        id: 'merchant_revenue',
        label: 'Merchant Revenue',
        section: 'pnl',
        parentId: 'revenue',
        calcType: 'sum_children',
        childIds: ['energy_revenue', 'green_revenue', 'ancillary_revenue'],
        operations: ['+', '+', '+'],
        format: 'currency',
        indent: 1,
        order: 5,
    },
    {
        id: 'energy_revenue',
        label: 'Energy Revenue',
        section: 'pnl',
        parentId: 'merchant_revenue',
        calcType: 'formula',
        calcParams: {
            formula: '{net_generation} * {energy_price} * {is_merchant}',
        },
        format: 'currency',
        indent: 2,
        order: 6,
    },
    {
        id: 'green_revenue',
        label: 'Green / LGC Revenue',
        section: 'pnl',
        parentId: 'merchant_revenue',
        calcType: 'formula',
        calcParams: {
            formula: '{net_generation} * {green_price} * {is_merchant}',
        },
        format: 'currency',
        indent: 2,
        order: 7,
    },
    {
        id: 'ancillary_revenue',
        label: 'Ancillary Revenue',
        section: 'pnl',
        parentId: 'merchant_revenue',
        calcType: 'constant',
        calcParams: {
            value: 0,
            mask: 'is_operating',
        },
        format: 'currency',
        indent: 2,
        order: 8,
    },

    // ============================================================================
    // P&L: COSTS
    // ============================================================================
    {
        id: 'costs',
        label: 'COSTS',
        section: 'pnl',
        parentId: null,
        calcType: 'sum_children',
        childIds: ['fixed_costs', 'variable_costs'],
        operations: ['+', '+'],
        format: 'currency',
        isNegative: true,
        indent: 0,
        order: 10,
    },
    {
        id: 'fixed_costs',
        label: 'Fixed Costs',
        section: 'pnl',
        parentId: 'costs',
        calcType: 'sum_children',
        childIds: ['om_cost', 'insurance_cost', 'land_lease', 'grid_charges', 'royalties'],
        operations: ['+', '+', '+', '+', '+'],
        format: 'currency',
        isNegative: true,
        indent: 1,
        order: 11,
    },
    {
        id: 'om_cost',
        label: 'O&M',
        section: 'pnl',
        parentId: 'fixed_costs',
        calcType: 'escalating',
        calcParams: {
            baseValue: 5000000,
            rate: 0.025,
            mask: 'is_operating',
        },
        format: 'currency',
        isNegative: true,
        indent: 2,
        order: 12,
    },
    {
        id: 'insurance_cost',
        label: 'Insurance',
        section: 'pnl',
        parentId: 'fixed_costs',
        calcType: 'escalating',
        calcParams: {
            baseValue: 300000,
            rate: 0.025,
            mask: 'is_operating',
        },
        format: 'currency',
        isNegative: true,
        indent: 2,
        order: 13,
    },
    {
        id: 'land_lease',
        label: 'Land Lease',
        section: 'pnl',
        parentId: 'fixed_costs',
        calcType: 'escalating',
        calcParams: {
            baseValue: 200000,
            rate: 0.025,
            mask: 'is_operating',
        },
        format: 'currency',
        isNegative: true,
        indent: 2,
        order: 14,
    },
    {
        id: 'grid_charges',
        label: 'Grid Charges',
        section: 'pnl',
        parentId: 'fixed_costs',
        calcType: 'escalating',
        calcParams: {
            baseValue: 500000,
            rate: 0.02,
            mask: 'is_operating',
        },
        format: 'currency',
        isNegative: true,
        indent: 2,
        order: 15,
    },
    {
        id: 'royalties',
        label: 'Royalties',
        section: 'pnl',
        parentId: 'fixed_costs',
        calcType: 'formula',
        calcParams: {
            formula: '{revenue} * 0.02',  // 2% of revenue
        },
        format: 'currency',
        isNegative: true,
        indent: 2,
        order: 16,
    },
    {
        id: 'variable_costs',
        label: 'Variable Costs',
        section: 'pnl',
        parentId: 'costs',
        calcType: 'constant',
        calcParams: {
            value: 0,
            mask: 'is_operating',
        },
        format: 'currency',
        isNegative: true,
        indent: 1,
        order: 17,
    },

    // ============================================================================
    // P&L: GROSS MARGIN & EBITDA
    // ============================================================================
    {
        id: 'gross_margin',
        label: 'GROSS MARGIN',
        section: 'pnl',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{revenue} - {costs}',
        },
        format: 'currency',
        indent: 0,
        order: 20,
    },
    {
        id: 'other_operating',
        label: 'OTHER OPERATING ITEMS',
        section: 'pnl',
        parentId: null,
        calcType: 'sum_children',
        childIds: ['maintenance_capex', 'performance_lds'],
        operations: ['+', '+'],
        format: 'currency',
        isNegative: true,
        indent: 0,
        order: 21,
    },
    {
        id: 'maintenance_capex',
        label: 'Maintenance Capex',
        section: 'pnl',
        parentId: 'other_operating',
        calcType: 'escalating',
        calcParams: {
            baseValue: 500000,
            rate: 0.025,
            mask: 'is_operating',
        },
        format: 'currency',
        isNegative: true,
        indent: 1,
        order: 22,
    },
    {
        id: 'performance_lds',
        label: 'Performance LDs',
        section: 'pnl',
        parentId: 'other_operating',
        calcType: 'constant',
        calcParams: {
            value: 0,
        },
        format: 'currency',
        indent: 1,
        order: 23,
    },
    {
        id: 'ebitda',
        label: 'EBITDA',
        section: 'pnl',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{gross_margin} - {other_operating}',
        },
        format: 'currency',
        indent: 0,
        order: 24,
    },

    // ============================================================================
    // FINANCING: DEBT SCHEDULE
    // ============================================================================
    {
        id: 'debt_opening_balance',
        label: 'Debt Balance (Opening)',
        section: 'financing',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: 'lag({debt_closing_balance}, 1)',
        },
        format: 'currency',
        indent: 0,
        order: 30,
    },
    {
        id: 'debt_drawdown',
        label: 'Debt Drawdown',
        section: 'financing',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{capex} * 0.7 * {is_construction}',  // 70% gearing during construction
        },
        format: 'currency',
        indent: 0,
        order: 31,
    },
    {
        id: 'debt_interest',
        label: 'Interest',
        section: 'financing',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{debt_opening_balance} * {debt_rate} / 12',
        },
        format: 'currency',
        isNegative: true,
        indent: 0,
        order: 32,
    },
    {
        id: 'debt_principal',
        label: 'Principal Repayment',
        section: 'financing',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: 'max(0, {debt_service} - {debt_interest}) * {is_debt_period}',
        },
        format: 'currency',
        isNegative: true,
        indent: 0,
        order: 33,
    },
    {
        id: 'debt_service',
        label: 'Debt Service',
        section: 'financing',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{debt_interest} + {debt_principal}',
        },
        format: 'currency',
        isNegative: true,
        indent: 0,
        order: 34,
    },
    {
        id: 'debt_closing_balance',
        label: 'Debt Balance (Closing)',
        section: 'financing',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{debt_opening_balance} + {debt_drawdown} - {debt_principal}',
        },
        format: 'currency',
        indent: 0,
        order: 35,
    },
    {
        id: 'dscr',
        label: 'DSCR',
        section: 'financing',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: 'if({debt_service}, {cfads} / {debt_service}, 0)',
        },
        format: 'ratio',
        indent: 0,
        order: 36,
    },

    // ============================================================================
    // CFADS
    // ============================================================================
    {
        id: 'cfads',
        label: 'CFADS',
        section: 'pnl',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{ebitda}',  // Simplified - can add working capital adjustments
        },
        format: 'currency',
        indent: 0,
        order: 25,
    },

    // ============================================================================
    // TAX & DEPRECIATION
    // ============================================================================
    {
        id: 'depreciation',
        label: 'Depreciation',
        section: 'tax',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{total_capex} / {depreciation_life} * {is_operating}',
        },
        format: 'currency',
        isNegative: true,
        indent: 0,
        order: 40,
    },
    {
        id: 'taxable_income',
        label: 'Taxable Income',
        section: 'tax',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{ebitda} - {depreciation} - {debt_interest}',
        },
        format: 'currency',
        indent: 0,
        order: 41,
    },
    {
        id: 'tax_expense',
        label: 'Tax Expense',
        section: 'tax',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: 'max(0, {taxable_income}) * {tax_rate}',
        },
        format: 'currency',
        isNegative: true,
        indent: 0,
        order: 42,
    },
    {
        id: 'itc_benefit',
        label: 'ITC Benefit',
        section: 'tax',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{total_capex} * {itc_rate} * {is_cod_year}',  // One-time at COD
        },
        format: 'currency',
        indent: 0,
        order: 43,
    },

    // ============================================================================
    // RESERVE ACCOUNTS
    // ============================================================================
    {
        id: 'dsra_target',
        label: 'DSRA Target',
        section: 'reserves',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{debt_service} * {dsra_months} / 12',
        },
        format: 'currency',
        indent: 0,
        order: 50,
    },
    {
        id: 'dsra_opening',
        label: 'DSRA Opening Balance',
        section: 'reserves',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: 'lag({dsra_closing}, 1)',
        },
        format: 'currency',
        indent: 0,
        order: 51,
    },
    {
        id: 'dsra_funding',
        label: 'DSRA Funding',
        section: 'reserves',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: 'max(0, {dsra_target} - {dsra_opening})',
        },
        format: 'currency',
        isNegative: true,
        indent: 0,
        order: 52,
    },
    {
        id: 'dsra_release',
        label: 'DSRA Release',
        section: 'reserves',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: 'max(0, {dsra_opening} - {dsra_target})',
        },
        format: 'currency',
        indent: 0,
        order: 53,
    },
    {
        id: 'dsra_closing',
        label: 'DSRA Closing Balance',
        section: 'reserves',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{dsra_opening} + {dsra_funding} - {dsra_release}',
        },
        format: 'currency',
        indent: 0,
        order: 54,
    },

    // ============================================================================
    // WORKING CAPITAL
    // ============================================================================
    {
        id: 'accounts_receivable',
        label: 'Accounts Receivable',
        section: 'working_capital',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{revenue} * {ar_days} / 365',
        },
        format: 'currency',
        indent: 0,
        order: 60,
    },
    {
        id: 'accounts_payable',
        label: 'Accounts Payable',
        section: 'working_capital',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{costs} * {ap_days} / 365',
        },
        format: 'currency',
        indent: 0,
        order: 61,
    },
    {
        id: 'working_capital',
        label: 'Working Capital',
        section: 'working_capital',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{accounts_receivable} - {accounts_payable}',
        },
        format: 'currency',
        indent: 0,
        order: 62,
    },
    {
        id: 'change_in_wc',
        label: 'Change in Working Capital',
        section: 'working_capital',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{working_capital} - lag({working_capital}, 1)',
        },
        format: 'currency',
        isNegative: true,
        indent: 0,
        order: 63,
    },

    // ============================================================================
    // CASH FLOW STATEMENT
    // ============================================================================
    {
        id: 'operating_cashflow',
        label: 'OPERATING CASH FLOW',
        section: 'cashflow',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{cfads} - {tax_expense} - {change_in_wc}',
        },
        format: 'currency',
        indent: 0,
        order: 70,
    },
    {
        id: 'investing_cashflow',
        label: 'INVESTING CASH FLOW',
        section: 'cashflow',
        parentId: null,
        calcType: 'sum_children',
        childIds: ['capex', 'decommissioning_provision'],
        operations: ['-', '-'],
        format: 'currency',
        isNegative: true,
        indent: 0,
        order: 71,
    },
    {
        id: 'capex',
        label: 'Capital Expenditure',
        section: 'cashflow',
        parentId: 'investing_cashflow',
        calcType: 'formula',
        calcParams: {
            formula: '{construction_capex} + {development_capex}',
        },
        format: 'currency',
        isNegative: true,
        indent: 1,
        order: 72,
    },
    {
        id: 'construction_capex',
        label: 'Construction Capex',
        section: 'cashflow',
        parentId: 'capex',
        calcType: 'schedule',
        calcParams: {
            values: [],  // User enters
        },
        format: 'currency',
        isNegative: true,
        indent: 2,
        order: 73,
    },
    {
        id: 'development_capex',
        label: 'Development Capex',
        section: 'cashflow',
        parentId: 'capex',
        calcType: 'constant',
        calcParams: {
            value: 0,
        },
        format: 'currency',
        isNegative: true,
        indent: 2,
        order: 74,
    },
    {
        id: 'decommissioning_provision',
        label: 'Decommissioning Provision',
        section: 'cashflow',
        parentId: 'investing_cashflow',
        calcType: 'constant',
        calcParams: {
            value: 0,
        },
        format: 'currency',
        isNegative: true,
        indent: 1,
        order: 75,
    },
    {
        id: 'financing_cashflow',
        label: 'FINANCING CASH FLOW',
        section: 'cashflow',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{equity_drawdown} + {debt_drawdown} - {debt_service} - {dsra_funding} + {dsra_release} - {dividends}',
        },
        format: 'currency',
        indent: 0,
        order: 76,
    },
    {
        id: 'equity_drawdown',
        label: 'Equity Drawdown',
        section: 'cashflow',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{capex} * 0.3 * {is_construction}',  // 30% equity during construction
        },
        format: 'currency',
        indent: 1,
        order: 77,
    },
    {
        id: 'dividends',
        label: 'Dividends',
        section: 'cashflow',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: 'max(0, {operating_cashflow} - {debt_service} - {dsra_funding}) * 0.5',  // 50% payout
        },
        format: 'currency',
        isNegative: true,
        indent: 1,
        order: 78,
    },
    {
        id: 'net_cashflow',
        label: 'NET CASH FLOW',
        section: 'cashflow',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '{operating_cashflow} + {investing_cashflow} + {financing_cashflow}',
        },
        format: 'currency',
        indent: 0,
        order: 79,
    },
    {
        id: 'cumulative_cash',
        label: 'Cumulative Cash',
        section: 'cashflow',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: 'cumulative({net_cashflow})',
        },
        format: 'currency',
        indent: 0,
        order: 80,
    },

    // ============================================================================
    // EQUITY CASHFLOW
    // ============================================================================
    {
        id: 'equity_cashflow',
        label: 'Equity Cash Flow',
        section: 'equity',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: '-{equity_drawdown} + {dividends} + {itc_benefit}',
        },
        format: 'currency',
        indent: 0,
        order: 90,
    },
    {
        id: 'cumulative_equity_cf',
        label: 'Cumulative Equity CF',
        section: 'equity',
        parentId: null,
        calcType: 'formula',
        calcParams: {
            formula: 'cumulative({equity_cashflow})',
        },
        format: 'currency',
        indent: 0,
        order: 91,
    },
]

/**
 * Section definitions
 */
export const sections = [
    { id: 'inputs', label: 'INPUTS', order: 1, fixed: true },
    { id: 'timing', label: 'TIMING', order: 2, fixed: true },
    { id: 'flags', label: 'FLAGS', order: 3, fixed: true },
    { id: 'pnl', label: 'P&L', order: 4 },
    { id: 'financing', label: 'FINANCING', order: 5 },
    { id: 'tax', label: 'TAX & DEPRECIATION', order: 6 },
    { id: 'reserves', label: 'RESERVE ACCOUNTS', order: 7 },
    { id: 'working_capital', label: 'WORKING CAPITAL', order: 8 },
    { id: 'cashflow', label: 'CASH FLOW STATEMENT', order: 9 },
    { id: 'balance', label: 'BALANCE SHEET', order: 10 },
    { id: 'equity', label: 'EQUITY RETURNS', order: 11 },
    { id: 'metrics', label: 'KEY METRICS', order: 12 },
]

/**
 * Calculation types for UI dropdown
 */
export const calcTypes = [
    { value: 'constant', label: 'Constant Value', description: 'Same value every period' },
    { value: 'escalating', label: 'Escalating', description: 'Grows by rate each year' },
    { value: 'degrading', label: 'Degrading', description: 'Declines by rate each year' },
    { value: 'formula', label: 'Formula', description: 'Reference other items with {id}' },
    { value: 'sum_children', label: 'Sum Children', description: 'Sum of child items (parent)' },
    { value: 'schedule', label: 'Schedule', description: 'User-defined array' },
    { value: 'amortizing', label: 'Amortizing Debt', description: 'Debt schedule calculation' },
    { value: 'lookup', label: 'Lookup', description: 'From external data source' },
]
