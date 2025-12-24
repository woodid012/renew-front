// Calculation functions for each object type

// Timeline calculation - produces year indices and milestone flags
export function calculateTimeline(object) {
  const constructionStartYear = object.inputs.find(i => i.id === 'construction_start_year')?.value ?? -1
  const constructionYears = object.inputs.find(i => i.id === 'construction_years')?.value || 2
  const operatingYears = object.inputs.find(i => i.id === 'operating_years')?.value || 20
  const terminalYearOffset = object.inputs.find(i => i.id === 'terminal_year_offset')?.value || 0

  const codYear = constructionStartYear + constructionYears
  const operationsEndYear = codYear + operatingYears
  const terminalYear = operationsEndYear + terminalYearOffset
  const totalModelYears = terminalYear - constructionStartYear + 1

  // Build year array
  const yearArray = []
  for (let y = constructionStartYear; y <= terminalYear; y++) {
    yearArray.push(y)
  }

  return {
    cod_year: codYear,
    operations_end_year: operationsEndYear,
    terminal_year: terminalYear,
    total_model_years: totalModelYears,
    year_array: yearArray,
    // Also return raw values for downstream use
    construction_start_year: constructionStartYear,
    construction_years: constructionYears,
    operating_years: operatingYears
  }
}

export function calculateYield(object) {
  const p50Yield = object.inputs.find(i => i.id === 'p50_yield')?.value || 0
  const degradationRate = object.inputs.find(i => i.id === 'degradation_rate')?.value || 0
  const availabilityFactor = object.inputs.find(i => i.id === 'availability_factor')?.value || 1
  const weatherAdjustment = object.inputs.find(i => i.id === 'weather_adjustment')?.value || 1

  const energyGenerated = p50Yield * Math.pow(1 - degradationRate / 100, 1)
  const adjustedEnergy = energyGenerated * availabilityFactor * weatherAdjustment

  return {
    annual_energy: Math.round(adjustedEnergy)
  }
}

export function calculateVolume(object) {
  const operatingYear = object.inputs.find(i => i.id === 'operating_year')?.value || 1
  const ratedPowerMw = object.inputs.find(i => i.id === 'rated_power_mw')?.value || 0
  const durationHours = object.inputs.find(i => i.id === 'duration_hours')?.value || 0
  const cyclesPerDay = object.inputs.find(i => i.id === 'cycles_per_day')?.value || 0
  const availabilityFactor = object.inputs.find(i => i.id === 'availability_factor')?.value || 1
  const degradationRate = object.inputs.find(i => i.id === 'degradation_rate')?.value || 0
  const roundTripEfficiency = object.inputs.find(i => i.id === 'round_trip_efficiency')?.value || 1

  const yearIndex = Math.max(1, operatingYear)

  const energyPerCycleMwh = ratedPowerMw * durationHours
  const grossDischargeMwh = energyPerCycleMwh * cyclesPerDay * 365
  const degradedDischargeMwh = grossDischargeMwh * Math.pow(1 - degradationRate / 100, yearIndex - 1)
  const annualDischargeMwh = degradedDischargeMwh * availabilityFactor
  const annualChargeMwh = roundTripEfficiency > 0 ? (annualDischargeMwh / roundTripEfficiency) : 0

  return {
    annual_discharge_mwh: Math.round(annualDischargeMwh),
    annual_charge_mwh: Math.round(annualChargeMwh)
  }
}

// Contracted Revenue (renamed from Commercial)
export function calculateContractedRevenue(object) {
  const operatingYear = object.inputs.find(i => i.id === 'operating_year')?.value || 1
  const contractYears = object.inputs.find(i => i.id === 'contract_years')?.value || 0
  const tollPaymentYear1 = object.inputs.find(i => i.id === 'toll_payment_year1')?.value || 0
  const tollEscalation = object.inputs.find(i => i.id === 'toll_escalation')?.value || 0
  const tollAvailabilityFactor = object.inputs.find(i => i.id === 'toll_availability_factor')?.value || 1

  const yearIndex = Math.max(1, operatingYear)
  const isContracted = yearIndex <= contractYears ? 1 : 0

  const tollPaymentCurrent = tollPaymentYear1 * Math.pow(1 + tollEscalation / 100, yearIndex - 1)
  const contractedRevenueRaw = isContracted ? tollPaymentCurrent : 0
  const contractedRevenue = contractedRevenueRaw * tollAvailabilityFactor

  return {
    is_contracted: isContracted,
    toll_payment_current_year: Math.round(tollPaymentCurrent),
    contracted_revenue: Math.round(contractedRevenue)
  }
}

// Merchant Revenue = Yield × Merchant Price (when not contracted)
export function calculateMerchantRevenue(object, dependencies) {
  const merchantPrice = object.inputs.find(i => i.id === 'merchant_price')?.value || 0
  const annualDischargeMwh = dependencies.annual_discharge_mwh || 0
  const isContracted = dependencies.is_contracted || 0

  const merchantRevenueRaw = annualDischargeMwh * merchantPrice
  const merchantRevenue = isContracted ? 0 : merchantRevenueRaw

  return {
    merchant_revenue: Math.round(merchantRevenue)
  }
}

// Keep old function name for backwards compatibility
export function calculateCommercial(object) {
  return calculateContractedRevenue(object)
}

// Revenue Aggregator = Contracted Revenue + Merchant Revenue
export function calculateRevenue(object, dependencies) {
  const contractedRevenue = dependencies.contracted_revenue || 0
  const merchantRevenue = dependencies.merchant_revenue || 0

  const totalRevenue = contractedRevenue + merchantRevenue

  return {
    total_revenue: Math.round(totalRevenue),
    contracted_revenue: Math.round(contractedRevenue),
    merchant_revenue: Math.round(merchantRevenue)
  }
}

// Fixed Costs = O&M + Lease + Insurance + Other
export function calculateFixedCosts(object, dependencies) {
  const omBase = object.inputs.find(i => i.id === 'om_contract_base')?.value || 0
  const omEscalation = object.inputs.find(i => i.id === 'om_escalation')?.value || 0
  const landLease = object.inputs.find(i => i.id === 'land_lease')?.value || 0
  const insurance = object.inputs.find(i => i.id === 'insurance')?.value || 0
  const otherOpex = object.inputs.find(i => i.id === 'other_opex')?.value || 0

  // Get operating year from dependencies or default to 1
  const operatingYear = dependencies?.operating_year || 1

  const omYearN = omBase * Math.pow(1 + omEscalation / 100, operatingYear)
  const fixedCosts = omYearN + landLease + insurance + otherOpex

  return {
    fixed_costs: Math.round(fixedCosts),
    om_cost: Math.round(omYearN),
    lease_cost: Math.round(landLease),
    insurance_cost: Math.round(insurance)
  }
}

// OpEx Aggregator = Fixed Costs + Operational Capex
export function calculateOpEx(object, dependencies = {}) {
  const fixedCosts = dependencies?.fixed_costs || 0
  const operationalCapex = dependencies?.annual_operational_capex || 0

  const annualOpex = fixedCosts + operationalCapex

  return {
    annual_opex: Math.round(annualOpex),
    fixed_costs: Math.round(fixedCosts),
    operational_capex: Math.round(operationalCapex)
  }
}

export function calculateCAPEX(object) {
  const totalCapex = object.inputs.find(i => i.id === 'total_capex')?.value || 0
  const year0Percentage = object.inputs.find(i => i.id === 'year0_percentage')?.value || 0
  const year1Percentage = object.inputs.find(i => i.id === 'year1_percentage')?.value || 0
  const contingency = object.inputs.find(i => i.id === 'contingency')?.value || 0

  const capexWithContingency = totalCapex * (1 + contingency / 100)
  const year0Capex = capexWithContingency * (year0Percentage / 100)
  const year1Capex = capexWithContingency * (year1Percentage / 100)

  return {
    total_capex_amount: Math.round(capexWithContingency),
    year0_capex: Math.round(year0Capex),
    year1_capex: Math.round(year1Capex)
  }
}

export function calculateOperationalCapex(object) {
  const annualOpexCapex = object.inputs.find(i => i.id === 'annual_opex_capex')?.value || 0
  const opexCapexEscalation = object.inputs.find(i => i.id === 'opex_capex_escalation')?.value || 0
  const majorReplacementYear = object.inputs.find(i => i.id === 'major_replacement_year')?.value || 0
  const majorReplacementCost = object.inputs.find(i => i.id === 'major_replacement_cost')?.value || 0

  // Calculate base annual operational CAPEX with escalation (for Year 2, assuming operations start)
  const currentYear = 2 // Post-construction starts at Year 2
  const annualOpexCapexBase = annualOpexCapex * Math.pow(1 + opexCapexEscalation / 100, currentYear - 2)
  
  // Check if this is a major replacement year
  const majorReplacementCapex = (currentYear === majorReplacementYear) ? majorReplacementCost : 0
  
  const totalAnnualOperationalCapex = annualOpexCapexBase + majorReplacementCapex

  return {
    annual_operational_capex: Math.round(totalAnnualOperationalCapex)
  }
}

export function calculateFunding(object, dependencies) {
  const equityYear0Pct = object.inputs.find(i => i.id === 'equity_year0_pct')?.value || 0
  const debtYear0Pct = object.inputs.find(i => i.id === 'debt_year0_pct')?.value || 0

  const totalEquity = dependencies.construction_equity_total || 0
  const totalDebt = dependencies.construction_debt_total || 0
  const totalCapexAmount = dependencies.total_capex_amount || 0

  // Calculate equity drawdowns
  const equityYear0 = totalEquity * (equityYear0Pct / 100)
  const equityYear1 = totalEquity * (1 - equityYear0Pct / 100)

  // Calculate debt drawdowns
  const debtYear0 = totalDebt * (debtYear0Pct / 100)
  const debtYear1 = totalDebt * (1 - debtYear0Pct / 100)

  // Total funding
  const totalFunding = totalEquity + totalDebt
  const sourcesUsesDelta = totalFunding - totalCapexAmount

  return {
    total_funding: Math.round(totalFunding),
    equity_contribution: Math.round(totalEquity),
    debt_drawdown: Math.round(totalDebt),
    sources_uses_delta: Math.round(sourcesUsesDelta)
  }
}

export function calculateTaxDepreciation(object, dependencies) {
  const taxRate = object.inputs.find(i => i.id === 'tax_rate')?.value || 0
  const deprYears = object.inputs.find(i => i.id === 'depr_years')?.value || 1
  const interestProxyPct = object.inputs.find(i => i.id === 'interest_proxy_pct')?.value || 0

  const totalCapexAmount = dependencies.total_capex_amount || 0
  const debtService = dependencies.debt_service || 0
  const cfbdYear0 = dependencies.cashflow_before_debt_year0 ?? dependencies.cashflow_before_debt ?? 0
  const cfbdYear1 = dependencies.cashflow_before_debt_year1 ?? dependencies.cashflow_before_debt ?? 0

  const annualDepreciation = totalCapexAmount / Math.max(1, deprYears)
  const interestProxy = debtService * (interestProxyPct / 100)

  const taxable0 = cfbdYear0 - interestProxy - annualDepreciation
  const taxable1 = cfbdYear1 - interestProxy - annualDepreciation

  const tax0 = Math.max(0, taxable0 * (taxRate / 100))
  const tax1 = Math.max(0, taxable1 * (taxRate / 100))

  return {
    annual_depreciation: Math.round(annualDepreciation),
    tax_year0: Math.round(tax0),
    tax_year1: Math.round(tax1)
  }
}

export function calculateConstructionDebt(object, dependencies) {
  const amount = object.inputs.find(i => i.id === 'construction_debt_amount')?.value || 0
  const feePct = object.inputs.find(i => i.id === 'construction_debt_fee_pct')?.value || 0

  const upfrontFee = amount * (feePct / 100)
  const total = amount + upfrontFee

  return {
    construction_debt_total: Math.round(total)
  }
}

export function calculateConstructionEquity(object, dependencies) {
  const equity = object.inputs.find(i => i.id === 'construction_equity_amount')?.value || 0
  const itcPercentage = object.inputs.find(i => i.id === 'itc_percentage')?.value || 0
  const totalCapexAmount = dependencies.total_capex_amount || 0

  const itcValue = totalCapexAmount * (itcPercentage / 100)

  return {
    construction_equity_total: Math.round(equity),
    itc_value: Math.round(itcValue)
  }
}

export function calculateOperatingDebt(object, dependencies) {
  const debtAmount = object.inputs.find(i => i.id === 'debt_amount')?.value || 0
  const debtRate = object.inputs.find(i => i.id === 'debt_rate')?.value || 0
  const debtTerm = object.inputs.find(i => i.id === 'debt_term')?.value || 0

  const monthlyRate = debtRate / 100 / 12
  const numPayments = debtTerm * 12
  const annualDebtService = debtAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1) * 12

  return {
    debt_service: Math.round(annualDebtService)
  }
}

export function calculateFinancing(object, dependencies) {
  const debtAmount = object.inputs.find(i => i.id === 'debt_amount')?.value || 0
  const debtRate = object.inputs.find(i => i.id === 'debt_rate')?.value || 0
  const debtTerm = object.inputs.find(i => i.id === 'debt_term')?.value || 0
  const itcPercentage = object.inputs.find(i => i.id === 'itc_percentage')?.value || 0
  const totalCapexAmount = dependencies.total_capex_amount || 0
  // Cashflow before debt is available but not used in calculation yet (for future debt capacity logic)

  const itcValue = totalCapexAmount * (itcPercentage / 100)
  const monthlyRate = debtRate / 100 / 12
  const numPayments = debtTerm * 12
  const annualDebtService = debtAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1) * 12

  return {
    debt_service: Math.round(annualDebtService),
    itc_value: Math.round(itcValue)
  }
}

export function calculateCashflowBeforeDebt(object, dependencies) {
  const totalRevenue = dependencies.total_revenue || 0
  const annualOpex = dependencies.annual_opex || 0
  const year0Capex = dependencies.year0_capex || 0
  const year1Capex = dependencies.year1_capex || 0
  const annualOperationalCapex = dependencies.annual_operational_capex || 0
  const totalFunding = dependencies.total_funding || 0

  // Cashflow before debt for Year 0 (construction - includes funding inflow)
  const cashflowBeforeDebtYear0 = totalFunding - year0Capex
  
  // Cashflow before debt for Year 1 (construction)
  const cashflowBeforeDebtYear1 = -year1Capex

  // Cashflow before debt for operational years (includes operational CAPEX)
  const cashflowBeforeDebtOperational = totalRevenue - annualOpex - annualOperationalCapex

  return {
    cashflow_before_debt_year0: Math.round(cashflowBeforeDebtYear0),
    cashflow_before_debt_year1: Math.round(cashflowBeforeDebtYear1),
    cashflow_before_debt: Math.round(cashflowBeforeDebtOperational) // Default to operational year
  }
}

export function calculateCashflowSummary(object, dependencies) {
  const cashflowBeforeDebtYear0 = dependencies.cashflow_before_debt_year0 || 0
  const cashflowBeforeDebtYear1 = dependencies.cashflow_before_debt_year1 || 0
  const debtService = dependencies.debt_service || 0
  const itcValue = dependencies.itc_value || 0
  const terminalValue = dependencies.terminal_value || 0
  const taxYear0 = dependencies.tax_year0 || 0
  const taxYear1 = dependencies.tax_year1 || 0

  // Net cash flow after debt for Year 0 (includes ITC)
  const netCashFlowYear0 = cashflowBeforeDebtYear0 - debtService + itcValue - taxYear0
  
  // Net cash flow after debt for Year 1
  const netCashFlowYear1 = cashflowBeforeDebtYear1 - debtService - taxYear1
  
  // Cumulative (includes terminal value)
  const cumulativeCashFlow = netCashFlowYear0 + netCashFlowYear1 + terminalValue

  // Simple IRR calculation (simplified - would need proper NPV calculation for real IRR)
  // For demonstration, using a simplified approach
  const irr = netCashFlowYear0 < 0 && netCashFlowYear1 > 0 
    ? ((netCashFlowYear1 / Math.abs(netCashFlowYear0)) - 1) * 100 
    : 0

  return {
    net_cash_flow: Math.round(netCashFlowYear0), // Year 0 for now
    cumulative_cash_flow: Math.round(cumulativeCashFlow),
    irr: Math.round(irr * 100) / 100
  }
}

export function calculateTerminalValue(object, dependencies) {
  const terminalMultiple = object.inputs.find(i => i.id === 'terminal_multiple')?.value || 0
  const discountRate = object.inputs.find(i => i.id === 'discount_rate')?.value || 0
  
  // Terminal year comes from timeline
  const terminalYear = dependencies.terminal_year || 20
  
  // Simplified: Use final year EBITDA (revenue - opex) as base
  const finalYearEBITDA = dependencies.final_year_ebitda || 10000000 // Placeholder
  const terminalValue = finalYearEBITDA * terminalMultiple
  const presentValueTerminal = terminalValue / Math.pow(1 + discountRate / 100, Math.max(1, terminalYear))

  return {
    terminal_value: Math.round(terminalValue),
    present_value_terminal: Math.round(presentValueTerminal)
  }
}

// Debt Sizing - back-solve max debt from CFADS using target DSCR
export function calculateDebtSizing(object, dependencies) {
  const targetDscr = object.inputs.find(i => i.id === 'target_dscr')?.value || 1.35
  const debtRate = object.inputs.find(i => i.id === 'debt_rate')?.value || 5.5
  const debtTerm = object.inputs.find(i => i.id === 'debt_term')?.value || 15

  // Get CFADS - use the operating period cashflow
  const cfads = dependencies.cashflow_before_debt || 0
  
  // For simplicity, assume uniform CFADS across debt term
  // Max annual DS that satisfies DSCR constraint
  const maxAnnualDs = cfads / targetDscr

  // Calculate max debt using PV of annuity formula
  // PV = PMT × [(1 - (1 + r)^-n) / r]
  const monthlyRate = debtRate / 100 / 12
  const numPayments = debtTerm * 12
  
  let maxDebt = 0
  if (monthlyRate > 0 && numPayments > 0 && maxAnnualDs > 0) {
    const annuityFactor = (1 - Math.pow(1 + monthlyRate, -numPayments)) / monthlyRate
    maxDebt = (maxAnnualDs / 12) * annuityFactor
  }

  // Calculate actual debt service for the sized debt
  let actualAnnualDs = 0
  if (maxDebt > 0 && monthlyRate > 0 && numPayments > 0) {
    actualAnnualDs = maxDebt * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1) * 12
  }

  // Achievable DSCR
  const achievableDscr = actualAnnualDs > 0 ? cfads / actualAnnualDs : 0

  return {
    max_debt: Math.round(maxDebt),
    max_annual_ds: Math.round(maxAnnualDs),
    achievable_dscr: Math.round(achievableDscr * 100) / 100
  }
}

// Equity Cashflow - builds full CF vector and calculates IRR
export function calculateEquityCashflow(object, dependencies) {
  const equityContribution = dependencies.equity_contribution || 0
  const cfads = dependencies.cashflow_before_debt || 0
  const debtService = dependencies.debt_service || 0
  const itcValue = dependencies.itc_value || 0
  const terminalValue = dependencies.terminal_value || 0
  const taxYear0 = dependencies.tax_year0 || 0
  const taxYear1 = dependencies.tax_year1 || 0
  const constructionYears = dependencies.construction_years || 2
  const operatingYears = dependencies.operating_years || 20

  // Build simplified cashflow vector
  // Construction: equity outflows
  const equityCfConstruction = -equityContribution

  // Operating years: CFADS - DS - Tax + ITC (year 1 only)
  const operatingCfYear1 = cfads - debtService - taxYear1 + itcValue
  const operatingCfSubsequent = cfads - debtService - taxYear1 // Simplified: same tax

  // Average operating CF
  const avgOperatingCf = operatingYears > 0 
    ? (operatingCfYear1 + (operatingYears - 1) * operatingCfSubsequent) / operatingYears 
    : 0

  // Terminal CF
  const equityCfTerminal = terminalValue

  // Build cashflow vector for IRR calculation
  const cashflows = []
  
  // Construction period (equity outflows, spread across construction years)
  for (let i = 0; i < constructionYears; i++) {
    cashflows.push(-equityContribution / constructionYears)
  }
  
  // Operating period
  for (let i = 0; i < operatingYears; i++) {
    if (i === 0) {
      cashflows.push(operatingCfYear1)
    } else {
      cashflows.push(operatingCfSubsequent)
    }
  }
  
  // Terminal value in final year
  cashflows[cashflows.length - 1] += terminalValue

  // Calculate IRR using Newton-Raphson method
  const irr = calculateIRR(cashflows)

  // Calculate MOIC
  const totalInflows = cashflows.filter(cf => cf > 0).reduce((sum, cf) => sum + cf, 0)
  const totalOutflows = Math.abs(cashflows.filter(cf => cf < 0).reduce((sum, cf) => sum + cf, 0))
  const moic = totalOutflows > 0 ? totalInflows / totalOutflows : 0

  return {
    equity_cf_construction: Math.round(equityCfConstruction),
    equity_cf_operations: Math.round(avgOperatingCf),
    equity_cf_terminal: Math.round(equityCfTerminal),
    equity_irr: Math.round(irr * 10000) / 100, // Convert to percentage with 2 decimals
    equity_moic: Math.round(moic * 100) / 100
  }
}

// IRR calculation using Newton-Raphson method
function calculateIRR(cashflows, guess = 0.1, maxIterations = 100, tolerance = 0.0001) {
  if (!cashflows || cashflows.length === 0) return 0
  
  // Check if there are both positive and negative cashflows
  const hasNegative = cashflows.some(cf => cf < 0)
  const hasPositive = cashflows.some(cf => cf > 0)
  if (!hasNegative || !hasPositive) return 0

  let rate = guess

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0
    let dnpv = 0 // derivative of NPV

    for (let j = 0; j < cashflows.length; j++) {
      const cf = cashflows[j]
      const discountFactor = Math.pow(1 + rate, j)
      npv += cf / discountFactor
      dnpv -= j * cf / Math.pow(1 + rate, j + 1)
    }

    if (Math.abs(dnpv) < 1e-10) break // Avoid division by zero

    const newRate = rate - npv / dnpv

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate
    }

    rate = newRate

    // Bound the rate to reasonable values
    if (rate < -0.99) rate = -0.99
    if (rate > 10) rate = 10
  }

  return rate
}

