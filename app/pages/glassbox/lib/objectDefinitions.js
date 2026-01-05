import { DollarSign, TrendingUp, Calculator, Building2, Wallet, Flag, Landmark, PiggyBank, Shield, BatteryCharging, FileText, Clock, Target, TrendingDown } from 'lucide-react'

// Initial object definitions with structure
export const initialObjects = {
  timeline: {
    name: 'Timeline',
    description: 'Project timeline with construction, operations, and terminal milestones',
    color: 'blue',
    icon: <Clock className="w-5 h-5" />,
    timePeriod: 'all',
    inputs: [
      { id: 'construction_start_year', label: 'Construction Start Year', value: -1, unit: 'year', description: 'Year index when construction begins (typically -1 or 0)', required: true },
      { id: 'construction_years', label: 'Construction Duration', value: 2, unit: 'years', description: 'Number of years for construction period', required: true },
      { id: 'operating_years', label: 'Operating Years', value: 20, unit: 'years', description: 'Number of operating years after COD', required: true },
      { id: 'terminal_year_offset', label: 'Terminal Year Offset', value: 0, unit: 'years', description: 'Terminal value calculated at end of operations + offset', required: false }
    ],
    logic: [
      'COD_Year = Construction_Start_Year + Construction_Years',
      'Operations_End_Year = COD_Year + Operating_Years',
      'Terminal_Year = Operations_End_Year + Terminal_Year_Offset',
      'Total_Model_Years = Terminal_Year - Construction_Start_Year + 1',
      'Year_Array = [Construction_Start_Year ... Terminal_Year]'
    ],
    outputs: [
      { id: 'cod_year', label: 'COD Year', unit: 'year', usedBy: ['volume', 'commercial', 'revenue'] },
      { id: 'operations_end_year', label: 'Operations End Year', unit: 'year', usedBy: ['terminalValue'] },
      { id: 'terminal_year', label: 'Terminal Year', unit: 'year', usedBy: ['terminalValue', 'equityCashflow'] },
      { id: 'total_model_years', label: 'Total Model Years', unit: 'years', usedBy: [] },
      { id: 'year_array', label: 'Year Array', unit: 'array', usedBy: ['equityCashflow'] }
    ]
  },
  volume: {
    name: 'Volume (BESS)',
    description: 'Logic for power, duration, cycles, availability, degradation = discharge MWh',
    color: 'blue',
    icon: <BatteryCharging className="w-5 h-5" />,
    timePeriod: 'technical',
    inputs: [
      { id: 'operating_year', label: 'Operating Year', value: 1, unit: 'years', description: 'Operating year index used for phase switch + degradation (1 = first operating year)', required: true },
      { id: 'rated_power_mw', label: 'Rated Power', value: 100, unit: 'MW', description: 'Nameplate power capacity', required: true },
      { id: 'duration_hours', label: 'Duration', value: 2, unit: 'hours', description: 'Energy duration at rated power', required: true },
      { id: 'cycles_per_day', label: 'Cycles per Day', value: 1, unit: 'cycles/day', description: 'Average equivalent full cycles per day', required: true },
      { id: 'availability_factor', label: 'Availability Factor', value: 0.95, unit: 'ratio', description: 'Availability multiplier applied to throughput', required: true },
      { id: 'degradation_rate', label: 'Degradation Rate', value: 2.0, unit: '%/year', description: 'Annual throughput capability decline', required: true },
      { id: 'round_trip_efficiency', label: 'Round Trip Efficiency', value: 0.88, unit: 'ratio', description: 'Used to estimate charging energy (optional)', required: false }
    ],
    logic: [
      'Energy_per_Cycle_MWh = Rated_Power_MW × Duration_hours',
      'Gross_Discharge_MWh = Energy_per_Cycle_MWh × Cycles_per_Day × 365',
      'Degraded_Discharge_MWh = Gross_Discharge_MWh × (1 - Degradation_Rate)^(Operating_Year - 1)',
      'Annual_Discharge_MWh = Degraded_Discharge_MWh × Availability_Factor',
      'Annual_Charge_MWh = Annual_Discharge_MWh / RoundTripEfficiency'
    ],
    outputs: [
      { id: 'annual_discharge_mwh', label: 'Annual Discharge', unit: 'MWh', usedBy: ['revenue'] },
      { id: 'annual_charge_mwh', label: 'Annual Charge (proxy)', unit: 'MWh', usedBy: [] }
    ]
  },
  contractedRevenue: {
    name: 'Contracted Revenue',
    description: 'Fixed annual toll payment (escalating) for contract period (Years 1-10)',
    color: 'amber',
    icon: <FileText className="w-5 h-5" />,
    timePeriod: 'post-construction',
    inputs: [
      { id: 'operating_year', label: 'Operating Year', value: 1, unit: 'years', description: 'Operating year index (1 = first operating year)', required: true },
      { id: 'contract_years', label: 'Contract Years', value: 10, unit: 'years', description: 'Length of tolling contract', required: true },
      { id: 'toll_payment_year1', label: 'Toll Payment (Year 1)', value: 15000000, unit: '$/year', description: 'Fixed annual toll payment in operating year 1', required: true },
      { id: 'toll_escalation', label: 'Toll Escalation', value: 2.0, unit: '%/year', description: 'Annual escalation applied to toll payment', required: true },
      { id: 'toll_availability_factor', label: 'Toll Availability Factor', value: 1.0, unit: 'ratio', description: 'Penalty/adjustment applied to toll revenue (1.0 = no penalty)', required: false }
    ],
    logic: [
      'Is_Contracted = Operating_Year ≤ Contract_Years',
      'Toll_Payment_Current = Toll_Payment_Year1 × (1 + Toll_Escalation)^(Operating_Year - 1)',
      'Contracted_Revenue_Raw = if Is_Contracted then Toll_Payment_Current else 0',
      'Contracted_Revenue = Contracted_Revenue_Raw × Toll_Availability_Factor'
    ],
    outputs: [
      { id: 'is_contracted', label: 'Is Contracted (1/0)', unit: 'ratio', usedBy: ['revenue', 'merchantRevenue'] },
      { id: 'toll_payment_current_year', label: 'Toll Payment (Current Year)', unit: '$', usedBy: [] },
      { id: 'contracted_revenue', label: 'Contracted Revenue', unit: '$', usedBy: ['revenue'] }
    ]
  },
  merchantRevenue: {
    name: 'Merchant Revenue',
    description: 'Merchant period revenue = Yield × Merchant Price (Year 11+)',
    color: 'green',
    icon: <TrendingUp className="w-5 h-5" />,
    timePeriod: 'post-construction',
    inputs: [
      { id: 'merchant_price', label: 'Merchant Price', value: 70, unit: '$/MWh', description: 'Net merchant price applied to discharge volume', required: true }
    ],
    logic: [
      'Is_Merchant = NOT Is_Contracted (from Contracted Revenue)',
      'Merchant_Revenue_Raw = Annual_Discharge_MWh × Merchant_Price',
      'Merchant_Revenue = if Is_Merchant then Merchant_Revenue_Raw else 0'
    ],
    outputs: [
      { id: 'merchant_revenue', label: 'Merchant Revenue', unit: '$', usedBy: ['revenue'] }
    ]
  },
  revenue: {
    name: 'Revenue (Aggregator)',
    description: 'Total Revenue = Contracted Revenue + Merchant Revenue',
    color: 'green',
    icon: <DollarSign className="w-5 h-5" />,
    timePeriod: 'post-construction',
    isAggregator: true,
    childObjects: ['contractedRevenue', 'merchantRevenue'],
    inputs: [],
    logic: [
      '// Revenue = Σ(Child Revenue Objects)',
      'Contracted_Revenue = from Contracted Revenue object',
      'Merchant_Revenue = from Merchant Revenue object',
      'Total_Revenue = Contracted_Revenue + Merchant_Revenue'
    ],
    outputs: [
      { id: 'total_revenue', label: 'Total Revenue', unit: '$', usedBy: ['cashflowBeforeDebt', 'cfads'] },
      { id: 'contracted_revenue', label: 'Contracted Revenue', unit: '$', usedBy: [] },
      { id: 'merchant_revenue', label: 'Merchant Revenue', unit: '$', usedBy: [] }
    ]
  },
  fixedCosts: {
    name: 'Fixed Costs',
    description: 'Fixed operating costs: O&M, Lease, Insurance',
    color: 'orange',
    icon: <TrendingUp className="w-5 h-5" />,
    timePeriod: 'post-construction',
    inputs: [
      { id: 'om_contract_base', label: 'O&M Contract Base', value: 5000000, unit: '$/year', description: 'Base annual operations and maintenance cost', required: true },
      { id: 'om_escalation', label: 'O&M Escalation', value: 2.5, unit: '%/year', description: 'Annual escalation rate for O&M', required: true },
      { id: 'land_lease', label: 'Land Lease', value: 200000, unit: '$/year', description: 'Annual land lease payment', required: true },
      { id: 'insurance', label: 'Insurance', value: 300000, unit: '$/year', description: 'Annual insurance premium', required: true },
      { id: 'other_opex', label: 'Other OpEx', value: 100000, unit: '$/year', description: 'Miscellaneous operating expenses', required: false }
    ],
    logic: [
      'O&M_Year_N = O&M_Contract_Base × (1 + O&M_Escalation)^Year',
      'Land_Lease = Land_Lease (fixed)',
      'Insurance = Insurance (fixed)',
      'Other_OpEx = Other_OpEx',
      'Fixed_Costs = O&M + Land_Lease + Insurance + Other_OpEx'
    ],
    outputs: [
      { id: 'fixed_costs', label: 'Fixed Costs', unit: '$', usedBy: ['opex'] },
      { id: 'om_cost', label: 'O&M Cost', unit: '$', usedBy: [] },
      { id: 'lease_cost', label: 'Lease Cost', unit: '$', usedBy: [] },
      { id: 'insurance_cost', label: 'Insurance Cost', unit: '$', usedBy: [] }
    ]
  },
  opex: {
    name: 'OpEx (Aggregator)',
    description: 'Total OpEx = Fixed Costs + Operational Capex',
    color: 'orange',
    icon: <TrendingUp className="w-5 h-5" />,
    timePeriod: 'post-construction',
    isAggregator: true,
    childObjects: ['fixedCosts', 'operationalCapex'],
    inputs: [],
    logic: [
      '// OpEx = Σ(Child OpEx Objects)',
      'Fixed_Costs = from Fixed Costs object',
      'Operational_Capex = from Operational Capex object',
      'Annual_OpEx = Fixed_Costs + Operational_Capex'
    ],
    outputs: [
      { id: 'annual_opex', label: 'Annual OpEx', unit: '$', usedBy: ['cashflowBeforeDebt', 'cfads'] },
      { id: 'fixed_costs', label: 'Fixed Costs', unit: '$', usedBy: [] },
      { id: 'operational_capex', label: 'Operational Capex', unit: '$', usedBy: [] }
    ]
  },
  capex: {
    name: 'CAPEX Object',
    description: 'Logic for capital expenditures and phasing',
    color: 'teal',
    icon: <Building2 className="w-5 h-5" />,
    timePeriod: 'construction',
    inputs: [
      { id: 'total_capex', label: 'Total CAPEX', value: 100000000, unit: '$', description: 'Total capital expenditure', required: true },
      { id: 'year0_percentage', label: 'Year 0 Percentage', value: 80, unit: '%', description: 'Percentage of CAPEX in Year 0', required: true },
      { id: 'year1_percentage', label: 'Year 1 Percentage', value: 20, unit: '%', description: 'Percentage of CAPEX in Year 1', required: true },
      { id: 'contingency', label: 'Contingency', value: 5, unit: '%', description: 'Contingency percentage', required: false }
    ],
    logic: [
      'CAPEX_with_Contingency = Total_CAPEX × (1 + Contingency)',
      'Year_0_CAPEX = CAPEX_with_Contingency × Year_0_Percentage',
      'Year_1_CAPEX = CAPEX_with_Contingency × Year_1_Percentage',
      'Annual_CAPEX = Year_N_CAPEX (based on year)'
    ],
    outputs: [
      { id: 'total_capex_amount', label: 'Total CAPEX Amount', unit: '$', usedBy: ['funding', 'constructionDebt', 'constructionEquity', 'taxDepreciation'] },
      { id: 'year0_capex', label: 'Year 0 CAPEX', unit: '$', usedBy: ['cashflowBeforeDebt'] },
      { id: 'year1_capex', label: 'Year 1 CAPEX', unit: '$', usedBy: ['cashflowBeforeDebt'] }
    ]
  },
  funding: {
    name: 'Funding Object',
    description: 'Sources of funds: Equity contributions + Debt drawdowns',
    color: 'indigo',
    icon: <Landmark className="w-5 h-5" />,
    timePeriod: 'construction',
    inputs: [
      { id: 'equity_year0_pct', label: 'Equity Year 0 %', value: 80, unit: '%', description: 'Percentage of equity in Year 0', required: true },
      { id: 'debt_year0_pct', label: 'Debt Year 0 %', value: 80, unit: '%', description: 'Percentage of debt drawn in Year 0', required: true }
    ],
    logic: [
      'Total_Equity = Construction_Equity_Total (from Construction Equity object)',
      'Total_Debt = Construction_Debt_Total (from Construction Debt object)',
      'Equity_Year0 = Total_Equity × Equity_Year0_Pct',
      'Equity_Year1 = Total_Equity × (1 - Equity_Year0_Pct)',
      'Debt_Year0 = Total_Debt × Debt_Year0_Pct',
      'Debt_Year1 = Total_Debt × (1 - Debt_Year0_Pct)',
      'Total_Funding = Total_Equity + Total_Debt',
      'Sources_Uses_Delta = Total_Funding - Total_CAPEX_Amount'
    ],
    outputs: [
      { id: 'total_funding', label: 'Total Funding', unit: '$', usedBy: ['cashflowBeforeDebt'] },
      { id: 'equity_contribution', label: 'Equity Contribution', unit: '$', usedBy: ['cashflowBeforeDebt'] },
      { id: 'debt_drawdown', label: 'Debt Drawdown', unit: '$', usedBy: ['cashflowBeforeDebt'] },
      { id: 'sources_uses_delta', label: 'Sources - Uses (Delta)', unit: '$', usedBy: [] }
    ]
  },
  operationalCapex: {
    name: 'Operational CAPEX',
    description: 'Logic for ongoing capital expenditures during operations',
    color: 'teal',
    icon: <Building2 className="w-5 h-5" />,
    timePeriod: 'post-construction',
    inputs: [
      { id: 'annual_opex_capex', label: 'Annual OpEx CAPEX', value: 500000, unit: '$/year', description: 'Annual operational capital expenditure', required: true },
      { id: 'opex_capex_escalation', label: 'OpEx CAPEX Escalation', value: 2.5, unit: '%/year', description: 'Annual escalation rate for operational CAPEX', required: true },
      { id: 'major_replacement_year', label: 'Major Replacement Year', value: 10, unit: 'years', description: 'Year when major equipment replacement occurs', required: false },
      { id: 'major_replacement_cost', label: 'Major Replacement Cost', value: 5000000, unit: '$', description: 'Cost of major equipment replacement', required: false }
    ],
    logic: [
      'Annual_OpEx_CAPEX_Base = Annual_OpEx_CAPEX × (1 + OpEx_CAPEX_Escalation)^Year',
      'Major_Replacement_CAPEX = if Year == Major_Replacement_Year then Major_Replacement_Cost else 0',
      'Total_Annual_OpEx_CAPEX = Annual_OpEx_CAPEX_Base + Major_Replacement_CAPEX'
    ],
    outputs: [
      { id: 'annual_operational_capex', label: 'Annual Operational CAPEX', unit: '$', usedBy: ['cashflowBeforeDebt'] }
    ]
  },
  constructionDebt: {
    name: 'Construction Debt',
    description: 'Build-period debt stack and fees (no operating debt service)',
    color: 'purple',
    icon: <Shield className="w-5 h-5" />,
    timePeriod: 'construction',
    inputs: [
      { id: 'construction_debt_amount', label: 'Construction Debt Amount', value: 80000000, unit: '$', description: 'Total construction debt commitment', required: true },
      { id: 'construction_debt_fee_pct', label: 'Upfront Fee', value: 1.0, unit: '%', description: 'Upfront fee as % of construction debt', required: false }
    ],
    logic: [
      'Upfront_Fee = Construction_Debt_Amount × Upfront_Fee_%',
      'Construction_Debt_Total = Construction_Debt_Amount + Upfront_Fee'
    ],
    outputs: [
      { id: 'construction_debt_total', label: 'Construction Debt Total', unit: '$', usedBy: [] }
    ]
  },
  constructionEquity: {
    name: 'Construction Equity',
    description: 'Build-period equity / tax equity and ITC value',
    color: 'indigo',
    icon: <PiggyBank className="w-5 h-5" />,
    timePeriod: 'construction',
    inputs: [
      { id: 'construction_equity_amount', label: 'Construction Equity Amount', value: 25000000, unit: '$', description: 'Total construction equity', required: true },
      { id: 'itc_percentage', label: 'ITC Percentage', value: 30, unit: '%', description: 'Investment Tax Credit percentage', required: true }
    ],
    logic: [
      'ITC_Value = Total_CAPEX_Amount × ITC_Percentage',
      'Construction_Equity_Total = Construction_Equity_Amount'
    ],
    outputs: [
      { id: 'construction_equity_total', label: 'Construction Equity Total', unit: '$', usedBy: [] },
      { id: 'itc_value', label: 'ITC Value', unit: '$', usedBy: ['cashflowSummary'] }
    ]
  },
  operatingDebt: {
    name: 'Operating Debt',
    description: 'Operating term debt amortization (produces annual debt service)',
    color: 'purple',
    icon: <Calculator className="w-5 h-5" />,
    timePeriod: 'all',
    isAggregator: true,
    childObjects: ['debtSizing'],
    inputs: [
      { id: 'debt_amount', label: 'Debt Amount', value: 80000000, unit: '$', description: 'Total operating term debt', required: true },
      { id: 'debt_rate', label: 'Debt Interest Rate', value: 5.5, unit: '%/year', description: 'Annual interest rate on debt', required: true },
      { id: 'debt_term', label: 'Debt Term', value: 20, unit: 'years', description: 'Loan repayment period', required: true }
    ],
    logic: [
      'Debt_Amount = from Debt Sizing (max debt based on DSCR) or manual input',
      'Monthly_Rate = Debt_Rate / 12',
      'Num_Payments = Debt_Term × 12',
      'Annual_Debt_Service = Debt_Amount × (Monthly_Rate × (1 + Monthly_Rate)^Num_Payments) / ((1 + Monthly_Rate)^Num_Payments - 1) × 12'
    ],
    outputs: [
      { id: 'debt_service', label: 'Debt Service', unit: '$', usedBy: ['cashflowSummary', 'taxDepreciation'] }
    ]
  },
  cashflowBeforeDebt: {
    name: 'Cashflow (Before Debt)',
    description: 'Aggregates Revenue, OpEx, and CAPEX to show cashflow available for debt service',
    color: 'cyan',
    icon: <Wallet className="w-5 h-5" />,
    timePeriod: 'all',
    inputs: [],
    logic: [
      'Cashflow_Before_Debt_Year0 = Total_Revenue - Annual_OpEx - Year_0_CAPEX',
      'Cashflow_Before_Debt_Year1 = Total_Revenue - Annual_OpEx - Year_1_CAPEX',
      'Cashflow_Available_for_Debt = Cashflow_Before_Debt'
    ],
    outputs: [
      { id: 'cashflow_before_debt_year0', label: 'Cashflow Before Debt (Year 0)', unit: '$', usedBy: ['operatingDebt', 'taxDepreciation', 'cashflowSummary'] },
      { id: 'cashflow_before_debt_year1', label: 'Cashflow Before Debt (Year 1)', unit: '$', usedBy: ['cashflowSummary'] },
      { id: 'cashflow_before_debt', label: 'Cashflow Before Debt', unit: '$', usedBy: ['operatingDebt', 'taxDepreciation'] }
    ]
  },
  cashflowSummary: {
    name: 'Cashflow Summary (After Debt)',
    description: 'Final summary showing cashflows after debt service',
    color: 'indigo',
    icon: <Wallet className="w-5 h-5" />,
    inputs: [],
    logic: [
      'Net_Cash_Flow_Year0 = Cashflow_Before_Debt_Year0 - Debt_Service + ITC_Value',
      'Net_Cash_Flow_Year1 = Cashflow_Before_Debt_Year1 - Debt_Service',
      'Cumulative_Cash_Flow = Sum of Net_Cash_Flow over all years',
      'IRR = Internal Rate of Return (calculated from cash flows)'
    ],
    outputs: [
      { id: 'net_cash_flow', label: 'Net Cash Flow', unit: '$', usedBy: [] },
      { id: 'cumulative_cash_flow', label: 'Cumulative Cash Flow', unit: '$', usedBy: [] },
      { id: 'irr', label: 'IRR', unit: '%', usedBy: [] }
    ],
    timePeriod: 'all' // Spans all periods
  },
  taxDepreciation: {
    name: 'Tax & Depreciation',
    description: 'Tax + depreciation engine (wired to CFBD + CAPEX + Financing only)',
    color: 'red',
    icon: <Calculator className="w-5 h-5" />,
    timePeriod: 'all',
    inputs: [
      { id: 'tax_rate', label: 'Tax Rate', value: 30, unit: '%', description: 'Corporate tax rate', required: true },
      { id: 'depr_years', label: 'Depreciation Life', value: 20, unit: 'years', description: 'Straight-line depreciation life', required: true },
      { id: 'interest_proxy_pct', label: 'Interest Proxy (% of Debt Service)', value: 50, unit: '%', description: 'Approximate interest portion of debt service (demo)', required: false }
    ],
    logic: [
      'Annual_Depreciation = Total_CAPEX_Amount / Depreciation_Life',
      'Interest_Proxy = Debt_Service × Interest_Proxy_%',
      'Taxable_Base = Cashflow_Before_Debt - Interest_Proxy - Annual_Depreciation',
      'Tax = max(0, Taxable_Base × Tax_Rate)'
    ],
    outputs: [
      { id: 'annual_depreciation', label: 'Annual Depreciation', unit: '$', usedBy: ['cashflowSummary'] },
      { id: 'tax_year0', label: 'Tax (Year 0)', unit: '$', usedBy: ['cashflowSummary'] },
      { id: 'tax_year1', label: 'Tax (Year 1)', unit: '$', usedBy: ['cashflowSummary'] }
    ]
  },
  terminalValue: {
    name: 'Terminal Value',
    description: 'Post-operation terminal value calculation',
    color: 'amber',
    icon: <Flag className="w-5 h-5" />,
    inputs: [
      { id: 'terminal_multiple', label: 'Terminal Multiple', value: 10, unit: 'x', description: 'EBITDA multiple for terminal value', required: true },
      { id: 'discount_rate', label: 'Discount Rate', value: 8, unit: '%', description: 'Discount rate for terminal value', required: true }
    ],
    logic: [
      'Terminal_Year = from Timeline object',
      'Terminal_EBITDA = Final_Year_EBITDA',
      'Terminal_Value = Terminal_EBITDA × Terminal_Multiple',
      'Present_Value_Terminal = Terminal_Value / (1 + Discount_Rate)^Terminal_Year'
    ],
    outputs: [
      { id: 'terminal_value', label: 'Terminal Value', unit: '$', usedBy: ['equityCashflow'] },
      { id: 'present_value_terminal', label: 'Present Value Terminal', unit: '$', usedBy: [] }
    ],
    timePeriod: 'post-operation'
  },
  debtSizing: {
    name: 'Debt Sizing (Target DSCR)',
    description: 'Back-solve max debt from CFADS using target DSCR constraint',
    color: 'purple',
    icon: <Target className="w-5 h-5" />,
    timePeriod: 'all',
    inputs: [
      { id: 'target_dscr', label: 'Target DSCR', value: 1.35, unit: 'x', description: 'Minimum debt service coverage ratio constraint', required: true },
      { id: 'debt_rate', label: 'Debt Interest Rate', value: 5.5, unit: '%/year', description: 'Annual interest rate for debt sizing', required: true },
      { id: 'debt_term', label: 'Debt Term', value: 15, unit: 'years', description: 'Loan repayment period for sizing', required: true }
    ],
    logic: [
      'CFADS_Array = from cashflowBeforeDebt (operating years only)',
      'Max_Annual_DS = Min(CFADS_Array) / Target_DSCR',
      'Max_Debt = PV(Max_Annual_DS, Debt_Rate, Debt_Term)',
      'Achievable_DSCR = Min(CFADS_Array) / Annual_Debt_Service'
    ],
    outputs: [
      { id: 'max_debt', label: 'Max Debt (Target DSCR)', unit: '$', usedBy: ['operatingDebt'] },
      { id: 'max_annual_ds', label: 'Max Annual Debt Service', unit: '$', usedBy: [] },
      { id: 'achievable_dscr', label: 'Achievable DSCR', unit: 'x', usedBy: [] }
    ]
  },
  equityCashflow: {
    name: 'Equity Cashflow',
    description: 'Full equity cashflow vector: contributions, distributions, terminal',
    color: 'indigo',
    icon: <TrendingDown className="w-5 h-5" />,
    timePeriod: 'all',
    inputs: [],
    logic: [
      'Construction_CF = -Equity_Contribution (phased by year)',
      'Operating_CF = CFADS - Debt_Service - Tax + ITC (year 1 only)',
      'Terminal_CF = Terminal_Value (in final year)',
      'Equity_CF_Vector = [Construction_CF..., Operating_CF..., Terminal_CF]'
    ],
    outputs: [
      { id: 'equity_cf_construction', label: 'Equity CF (Construction)', unit: '$', usedBy: [] },
      { id: 'equity_cf_operations', label: 'Equity CF (Operations Avg)', unit: '$', usedBy: [] },
      { id: 'equity_cf_terminal', label: 'Equity CF (Terminal)', unit: '$', usedBy: [] },
      { id: 'equity_irr', label: 'Equity IRR', unit: '%', usedBy: [] },
      { id: 'equity_moic', label: 'Equity MOIC', unit: 'x', usedBy: [] }
    ]
  }
}

// (Dependency map removed by request)

