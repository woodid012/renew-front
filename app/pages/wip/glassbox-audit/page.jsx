'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  AlertCircle,
  CheckCircle,
  Info,
  BatteryCharging
} from 'lucide-react'
import { initialObjects } from './utils/objectDefinitions'
import TimelineBar from './components/TimelineBar'
import TimelineObject from './components/TimelineObject'
import AggregatorGroup from './components/AggregatorGroup'
import VolumeObject from './components/VolumeObject'
import ContractedRevenueObject from './components/ContractedRevenueObject'
import MerchantRevenueObject from './components/MerchantRevenueObject'
import RevenueObject from './components/RevenueObject'
import FixedCostsObject from './components/FixedCostsObject'
import OpExObject from './components/OpExObject'
import CAPEXObject from './components/CAPEXObject'
import OperationalCapexObject from './components/OperationalCapexObject'
import FundingObject from './components/FundingObject'
import ConstructionDebtObject from './components/ConstructionDebtObject'
import ConstructionEquityObject from './components/ConstructionEquityObject'
import OperatingDebtObject from './components/OperatingDebtObject'
import DebtSizingObject from './components/DebtSizingObject'
import CashflowBeforeDebtObject from './components/CashflowBeforeDebtObject'
import CashflowSummaryObject from './components/CashflowSummaryObject'
import TaxDepreciationObject from './components/TaxDepreciationObject'
import TerminalValueObject from './components/TerminalValueObject'
import EquityCashflowObject from './components/EquityCashflowObject'
import { 
  calculateTimeline,
  calculateContractedRevenue,
  calculateMerchantRevenue,
  calculateVolume, 
  calculateRevenue, 
  calculateFixedCosts,
  calculateOpEx, 
  calculateCAPEX, 
  calculateOperationalCapex, 
  calculateFunding, 
  calculateConstructionDebt, 
  calculateConstructionEquity, 
  calculateOperatingDebt, 
  calculateDebtSizing,
  calculateCashflowBeforeDebt, 
  calculateTaxDepreciation, 
  calculateCashflowSummary, 
  calculateTerminalValue,
  calculateEquityCashflow
} from './utils/calculations'

export default function GlassboxAuditPage() {
  const [objects, setObjects] = useState(initialObjects)
  const [expandedObjects, setExpandedObjects] = useState({})
  const [expandedChildren, setExpandedChildren] = useState({
    funding: true,
    revenue: true,
    opex: true,
    cfads: true,
    operatingDebt: true
  })
  const [activeInput, setActiveInput] = useState(null)

  // Toggle child visibility for aggregator groups
  const toggleChildren = (parentKey) => {
    setExpandedChildren(prev => ({
      ...prev,
      [parentKey]: !prev[parentKey]
    }))
  }

  // Calculate all outputs in dependency order
  const calculatedObjects = useMemo(() => {
    const calc = { ...objects }
    
    // Step 0: Calculate Timeline (no dependencies)
    const timelineOutputs = calculateTimeline(calc.timeline)
    calc.timeline.outputs = calc.timeline.outputs.map(output => ({
      ...output,
      value: output.id === 'year_array' 
        ? timelineOutputs[output.id]?.length || 0 
        : timelineOutputs[output.id] || 0
    }))

    // Step 1: Volume (BESS throughput - in Technical section, first)
    const volumeOutputs = calculateVolume(calc.volume, {})
    calc.volume.outputs = calc.volume.outputs.map(output => ({
      ...output,
      value: volumeOutputs[output.id] || 0
    }))

    // Step 2: Calculate CAPEX (no dependencies)
    const capexOutputs = calculateCAPEX(calc.capex)
    calc.capex.outputs = calc.capex.outputs.map(output => ({
      ...output,
      value: capexOutputs[output.id] || 0
    }))

    // Step 3: Construction Debt (build-period)
    const constructionDebtOutputs = calculateConstructionDebt(calc.constructionDebt, {})
    calc.constructionDebt.outputs = calc.constructionDebt.outputs.map(output => ({
      ...output,
      value: constructionDebtOutputs[output.id] || 0
    }))

    // Step 4: Construction Equity (build-period, depends on CAPEX for ITC)
    const constructionEquityDeps = { total_capex_amount: capexOutputs.total_capex_amount }
    const constructionEquityOutputs = calculateConstructionEquity(calc.constructionEquity, constructionEquityDeps)
    calc.constructionEquity.outputs = calc.constructionEquity.outputs.map(output => ({
      ...output,
      value: constructionEquityOutputs[output.id] || 0
    }))

    // Step 5: Funding (depends on CAPEX + construction debt/equity totals)
    const fundingDeps = {
      total_capex_amount: capexOutputs.total_capex_amount,
      construction_debt_total: constructionDebtOutputs.construction_debt_total,
      construction_equity_total: constructionEquityOutputs.construction_equity_total
    }
    const fundingOutputs = calculateFunding(calc.funding, fundingDeps)
    calc.funding.outputs = calc.funding.outputs.map(output => ({
      ...output,
      value: fundingOutputs[output.id] || 0
    }))

    // Step 6: Contracted Revenue (tolling)
    const contractedRevenueOutputs = calculateContractedRevenue(calc.contractedRevenue)
    calc.contractedRevenue.outputs = calc.contractedRevenue.outputs.map(output => ({
      ...output,
      value: contractedRevenueOutputs[output.id] || 0
    }))

    // Step 7: Merchant Revenue (depends on Volume + contracted status)
    const merchantRevenueDeps = {
      annual_discharge_mwh: volumeOutputs.annual_discharge_mwh,
      is_contracted: contractedRevenueOutputs.is_contracted
    }
    const merchantRevenueOutputs = calculateMerchantRevenue(calc.merchantRevenue, merchantRevenueDeps)
    calc.merchantRevenue.outputs = calc.merchantRevenue.outputs.map(output => ({
      ...output,
      value: merchantRevenueOutputs[output.id] || 0
    }))

    // Step 8: Revenue Aggregator (depends on Contracted + Merchant)
    const revenueDeps = {
      contracted_revenue: contractedRevenueOutputs.contracted_revenue,
      merchant_revenue: merchantRevenueOutputs.merchant_revenue
    }
    const revenueOutputs = calculateRevenue(calc.revenue, revenueDeps)
    calc.revenue.outputs = calc.revenue.outputs.map(output => ({
      ...output,
      value: revenueOutputs[output.id] || 0
    }))

    // Step 9: Fixed Costs
    const fixedCostsOutputs = calc.fixedCosts ? calculateFixedCosts(calc.fixedCosts, {}) : { fixed_costs: 0 }
    if (calc.fixedCosts) {
      calc.fixedCosts.outputs = calc.fixedCosts.outputs.map(output => ({
        ...output,
        value: fixedCostsOutputs[output.id] || 0
      }))
    }

    // Step 10: Operational CAPEX (no dependencies)
    const operationalCapexOutputs = calculateOperationalCapex(calc.operationalCapex)
    calc.operationalCapex.outputs = calc.operationalCapex.outputs.map(output => ({
      ...output,
      value: operationalCapexOutputs[output.id] || 0
    }))

    // Step 11: OpEx Aggregator (depends on Fixed Costs + Operational Capex)
    const opexDeps = {
      fixed_costs: fixedCostsOutputs.fixed_costs,
      annual_operational_capex: operationalCapexOutputs.annual_operational_capex
    }
    const opexOutputs = calculateOpEx(calc.opex, opexDeps)
    calc.opex.outputs = calc.opex.outputs.map(output => ({
      ...output,
      value: opexOutputs[output.id] || 0
    }))

    // Step 12: Cashflow Before Debt / CFADS (depends on Revenue - OpEx)
    const cashflowBeforeDebtDeps = {
      total_funding: fundingOutputs.total_funding,
      total_revenue: revenueOutputs.total_revenue,
      annual_opex: opexOutputs.annual_opex,
      year0_capex: capexOutputs.year0_capex,
      year1_capex: capexOutputs.year1_capex,
      annual_operational_capex: operationalCapexOutputs.annual_operational_capex
    }
    const cashflowBeforeDebtOutputs = calculateCashflowBeforeDebt(calc.cashflowBeforeDebt, cashflowBeforeDebtDeps)
    calc.cashflowBeforeDebt.outputs = calc.cashflowBeforeDebt.outputs.map(output => ({
      ...output,
      value: cashflowBeforeDebtOutputs[output.id] || 0
    }))

    // Step 9.5: Debt Sizing (target DSCR → max debt)
    const debtSizingDeps = {
      cashflow_before_debt: cashflowBeforeDebtOutputs.cashflow_before_debt
    }
    const debtSizingOutputs = calculateDebtSizing(calc.debtSizing, debtSizingDeps)
    calc.debtSizing.outputs = calc.debtSizing.outputs.map(output => ({
      ...output,
      value: debtSizingOutputs[output.id] || 0
    }))

    // Step 10: Operating Debt (term debt amortization)
    const operatingDebtDeps = {
      cashflow_before_debt: cashflowBeforeDebtOutputs.cashflow_before_debt
    }
    const operatingDebtOutputs = calculateOperatingDebt(calc.operatingDebt, operatingDebtDeps)
    calc.operatingDebt.outputs = calc.operatingDebt.outputs.map(output => ({
      ...output,
      value: operatingDebtOutputs[output.id] || 0
    }))

    // Step 10.5: Tax & Depreciation (depends on CAPEX, Operating Debt, and Cashflow Before Debt)
    const taxDepDeps = {
      total_capex_amount: capexOutputs.total_capex_amount,
      debt_service: operatingDebtOutputs.debt_service,
      cashflow_before_debt_year0: cashflowBeforeDebtOutputs.cashflow_before_debt_year0,
      cashflow_before_debt_year1: cashflowBeforeDebtOutputs.cashflow_before_debt_year1,
      cashflow_before_debt: cashflowBeforeDebtOutputs.cashflow_before_debt
    }
    const taxDepOutputs = calculateTaxDepreciation(calc.taxDepreciation, taxDepDeps)
    calc.taxDepreciation.outputs = calc.taxDepreciation.outputs.map(output => ({
      ...output,
      value: taxDepOutputs[output.id] || 0
    }))

    // Step 11: Terminal Value (depends on Revenue, OpEx, and Timeline)
    const terminalValueDeps = {
      final_year_ebitda: revenueOutputs.total_revenue - opexOutputs.annual_opex,
      terminal_year: timelineOutputs.terminal_year
    }
    const terminalValueOutputs = calculateTerminalValue(calc.terminalValue, terminalValueDeps)
    calc.terminalValue.outputs = calc.terminalValue.outputs.map(output => ({
      ...output,
      value: terminalValueOutputs[output.id] || 0
    }))

    // Step 12: Equity Cashflow (full CF vector + IRR)
    const equityCashflowDeps = {
      equity_contribution: fundingOutputs.equity_contribution,
      cashflow_before_debt: cashflowBeforeDebtOutputs.cashflow_before_debt,
      debt_service: operatingDebtOutputs.debt_service,
      itc_value: constructionEquityOutputs.itc_value,
      terminal_value: terminalValueOutputs.terminal_value,
      tax_year0: taxDepOutputs.tax_year0,
      tax_year1: taxDepOutputs.tax_year1,
      construction_years: timelineOutputs.construction_years,
      operating_years: timelineOutputs.operating_years
    }
    const equityCashflowOutputs = calculateEquityCashflow(calc.equityCashflow, equityCashflowDeps)
    calc.equityCashflow.outputs = calc.equityCashflow.outputs.map(output => ({
      ...output,
      value: equityCashflowOutputs[output.id] || 0
    }))

    // Step 13: Cashflow Summary (legacy, keeping for compatibility)
    const cashflowSummaryDeps = {
      cashflow_before_debt_year0: cashflowBeforeDebtOutputs.cashflow_before_debt_year0,
      cashflow_before_debt_year1: cashflowBeforeDebtOutputs.cashflow_before_debt_year1,
      debt_service: operatingDebtOutputs.debt_service,
      itc_value: constructionEquityOutputs.itc_value,
      terminal_value: terminalValueOutputs.terminal_value,
      tax_year0: taxDepOutputs.tax_year0,
      tax_year1: taxDepOutputs.tax_year1
    }
    const cashflowSummaryOutputs = calculateCashflowSummary(calc.cashflowSummary, cashflowSummaryDeps)
    calc.cashflowSummary.outputs = calc.cashflowSummary.outputs.map(output => ({
      ...output,
      value: cashflowSummaryOutputs[output.id] || 0
    }))

    // Store timeline outputs for TimelineBar
    calc._timelineOutputs = timelineOutputs

    return calc
  }, [objects])

  // Validation
  const validation = useMemo(() => {
    const issues = []
    const circularRefs = []

    // Check for missing required inputs
    Object.keys(calculatedObjects).forEach(objKey => {
      if (objKey.startsWith('_')) return // Skip internal properties
      const obj = calculatedObjects[objKey]
      if (!obj.inputs) return
      obj.inputs.forEach(input => {
        if (input.required && (input.value === undefined || input.value === null)) {
          issues.push({
            object: objKey,
            type: 'missing_input',
            message: `Missing required input: ${input.label}`
          })
        }
      })
    })

    // Check Sources = Uses
    const fundingObj = calculatedObjects.funding
    const sourcesUsesDelta = fundingObj?.outputs?.find(o => o.id === 'sources_uses_delta')?.value || 0
    if (Math.abs(sourcesUsesDelta) > 1) {
      issues.push({
        object: 'funding',
        type: 'sources_uses_mismatch',
        message: `Sources ≠ Uses: Delta = $${sourcesUsesDelta.toLocaleString()}`
      })
    }

    return {
      isValid: issues.length === 0 && circularRefs.length === 0,
      issues,
      circularRefs
    }
  }, [calculatedObjects])

  const handleInputChange = (objectKey, inputId, value) => {
    setObjects(prev => ({
      ...prev,
      [objectKey]: {
        ...prev[objectKey],
        inputs: prev[objectKey].inputs.map(input =>
          input.id === inputId
            ? { ...input, value: input.type === 'select' ? value : (parseFloat(value) || 0) }
            : input
        )
      }
    }))
  }

  const toggleExpand = (objectKey) => {
    setExpandedObjects(prev => ({
      ...prev,
      [objectKey]: !prev[objectKey]
    }))
  }

  // Get dependencies for each object
  const getDependencies = (objectKey) => {
    const deps = {}
    
    if (objectKey === 'merchantRevenue') {
      const volumeObj = calculatedObjects.volume
      const contractedRevenueObj = calculatedObjects.contractedRevenue
      deps.annual_discharge_mwh = volumeObj.outputs.find(o => o.id === 'annual_discharge_mwh')?.value || 0
      deps.is_contracted = contractedRevenueObj.outputs.find(o => o.id === 'is_contracted')?.value || 0
    }

    if (objectKey === 'revenue') {
      const contractedRevenueObj = calculatedObjects.contractedRevenue
      const merchantRevenueObj = calculatedObjects.merchantRevenue
      deps.contracted_revenue = contractedRevenueObj.outputs.find(o => o.id === 'contracted_revenue')?.value || 0
      deps.merchant_revenue = merchantRevenueObj.outputs.find(o => o.id === 'merchant_revenue')?.value || 0
    }

    if (objectKey === 'opex') {
      const fixedCostsObj = calculatedObjects.fixedCosts
      const operationalCapexObj = calculatedObjects.operationalCapex
      deps.fixed_costs = fixedCostsObj.outputs.find(o => o.id === 'fixed_costs')?.value || 0
      deps.annual_operational_capex = operationalCapexObj.outputs.find(o => o.id === 'annual_operational_capex')?.value || 0
    }
    
    if (objectKey === 'funding') {
      const capexObj = calculatedObjects.capex
      deps.total_capex_amount = capexObj.outputs.find(o => o.id === 'total_capex_amount')?.value || 0

      const constructionDebtObj = calculatedObjects.constructionDebt
      const constructionEquityObj = calculatedObjects.constructionEquity
      deps.construction_debt_total = constructionDebtObj.outputs.find(o => o.id === 'construction_debt_total')?.value || 0
      deps.construction_equity_total = constructionEquityObj.outputs.find(o => o.id === 'construction_equity_total')?.value || 0
    }
    
    if (objectKey === 'cashflowBeforeDebt') {
      const fundingObj = calculatedObjects.funding
      const revenueObj = calculatedObjects.revenue
      const opexObj = calculatedObjects.opex
      const capexObj = calculatedObjects.capex
      const operationalCapexObj = calculatedObjects.operationalCapex
      deps.total_funding = fundingObj.outputs.find(o => o.id === 'total_funding')?.value || 0
      deps.total_revenue = revenueObj.outputs.find(o => o.id === 'total_revenue')?.value || 0
      deps.annual_opex = opexObj.outputs.find(o => o.id === 'annual_opex')?.value || 0
      deps.year0_capex = capexObj.outputs.find(o => o.id === 'year0_capex')?.value || 0
      deps.year1_capex = capexObj.outputs.find(o => o.id === 'year1_capex')?.value || 0
      deps.annual_operational_capex = operationalCapexObj.outputs.find(o => o.id === 'annual_operational_capex')?.value || 0
    }
    
    if (objectKey === 'constructionDebt') {
      const capexObj = calculatedObjects.capex
      deps.total_capex_amount = capexObj.outputs.find(o => o.id === 'total_capex_amount')?.value || 0
    }

    if (objectKey === 'constructionEquity') {
      const capexObj = calculatedObjects.capex
      deps.total_capex_amount = capexObj.outputs.find(o => o.id === 'total_capex_amount')?.value || 0
    }

    if (objectKey === 'debtSizing') {
      const cashflowBeforeDebtObj = calculatedObjects.cashflowBeforeDebt
      deps.cashflow_before_debt = cashflowBeforeDebtObj.outputs.find(o => o.id === 'cashflow_before_debt')?.value || 0
    }

    if (objectKey === 'operatingDebt') {
      const cashflowBeforeDebtObj = calculatedObjects.cashflowBeforeDebt
      deps.cashflow_before_debt = cashflowBeforeDebtObj.outputs.find(o => o.id === 'cashflow_before_debt')?.value || 0
    }

    if (objectKey === 'taxDepreciation') {
      const capexObj = calculatedObjects.capex
      const cashflowBeforeDebtObj = calculatedObjects.cashflowBeforeDebt
      const operatingDebtObj = calculatedObjects.operatingDebt
      deps.total_capex_amount = capexObj.outputs.find(o => o.id === 'total_capex_amount')?.value || 0
      deps.debt_service = operatingDebtObj.outputs.find(o => o.id === 'debt_service')?.value || 0
      deps.cashflow_before_debt_year0 = cashflowBeforeDebtObj.outputs.find(o => o.id === 'cashflow_before_debt_year0')?.value || 0
      deps.cashflow_before_debt_year1 = cashflowBeforeDebtObj.outputs.find(o => o.id === 'cashflow_before_debt_year1')?.value || 0
      deps.cashflow_before_debt = cashflowBeforeDebtObj.outputs.find(o => o.id === 'cashflow_before_debt')?.value || 0
    }
    
    if (objectKey === 'terminalValue') {
      const revenueObj = calculatedObjects.revenue
      const opexObj = calculatedObjects.opex
      const timelineObj = calculatedObjects.timeline
      deps.final_year_ebitda = (revenueObj.outputs.find(o => o.id === 'total_revenue')?.value || 0) - (opexObj.outputs.find(o => o.id === 'annual_opex')?.value || 0)
      deps.terminal_year = timelineObj.outputs.find(o => o.id === 'terminal_year')?.value || 20
    }

    if (objectKey === 'equityCashflow') {
      const fundingObj = calculatedObjects.funding
      const cashflowBeforeDebtObj = calculatedObjects.cashflowBeforeDebt
      const operatingDebtObj = calculatedObjects.operatingDebt
      const constructionEquityObj = calculatedObjects.constructionEquity
      const terminalValueObj = calculatedObjects.terminalValue
      const taxDepObj = calculatedObjects.taxDepreciation
      const timelineObj = calculatedObjects.timeline
      deps.equity_contribution = fundingObj.outputs.find(o => o.id === 'equity_contribution')?.value || 0
      deps.cashflow_before_debt = cashflowBeforeDebtObj.outputs.find(o => o.id === 'cashflow_before_debt')?.value || 0
      deps.debt_service = operatingDebtObj.outputs.find(o => o.id === 'debt_service')?.value || 0
      deps.itc_value = constructionEquityObj.outputs.find(o => o.id === 'itc_value')?.value || 0
      deps.terminal_value = terminalValueObj.outputs.find(o => o.id === 'terminal_value')?.value || 0
      deps.tax_year0 = taxDepObj.outputs.find(o => o.id === 'tax_year0')?.value || 0
      deps.tax_year1 = taxDepObj.outputs.find(o => o.id === 'tax_year1')?.value || 0
      deps.construction_years = calculatedObjects._timelineOutputs?.construction_years || 2
      deps.operating_years = calculatedObjects._timelineOutputs?.operating_years || 20
    }
    
    if (objectKey === 'cashflowSummary') {
      const cashflowBeforeDebtObj = calculatedObjects.cashflowBeforeDebt
      const terminalValueObj = calculatedObjects.terminalValue
      const operatingDebtObj = calculatedObjects.operatingDebt
      const constructionEquityObj = calculatedObjects.constructionEquity
      const taxDepObj = calculatedObjects.taxDepreciation
      deps.cashflow_before_debt_year0 = cashflowBeforeDebtObj.outputs.find(o => o.id === 'cashflow_before_debt_year0')?.value || 0
      deps.cashflow_before_debt_year1 = cashflowBeforeDebtObj.outputs.find(o => o.id === 'cashflow_before_debt_year1')?.value || 0
      deps.debt_service = operatingDebtObj.outputs.find(o => o.id === 'debt_service')?.value || 0
      deps.itc_value = constructionEquityObj.outputs.find(o => o.id === 'itc_value')?.value || 0
      deps.tax_year0 = taxDepObj.outputs.find(o => o.id === 'tax_year0')?.value || 0
      deps.tax_year1 = taxDepObj.outputs.find(o => o.id === 'tax_year1')?.value || 0
      deps.terminal_value = terminalValueObj.outputs.find(o => o.id === 'terminal_value')?.value || 0
    }
    
    return deps
  }

  // Organize objects by cashflow waterfall hierarchy
  // Now structured as parent → children relationships
  const objectHierarchy = useMemo(() => {
    return {
      timeline: ['timeline'],
      technical: ['volume'], // NEW: Technical section with Volume
      construction: {
        uses: { parent: 'capex', children: [] },
        sources: { parent: 'funding', children: ['constructionEquity', 'constructionDebt'] }
      },
      operations: {
        revenue: { parent: 'revenue', children: ['contractedRevenue', 'merchantRevenue'] },
        costs: { parent: 'opex', children: ['fixedCosts', 'operationalCapex'] },
        cfads: { parent: 'cashflowBeforeDebt', children: [] }
      },
      financing: {
        operatingDebt: { parent: 'operatingDebt', children: ['debtSizing'] },
        taxDepreciation: { parent: 'taxDepreciation', children: [] }
      },
      equity: ['equityCashflow', 'terminalValue', 'cashflowSummary']
    }
  }, [])

  // Render object component
  const renderObject = (objectKey, obj) => {
    if (!obj) return null
    
    const props = {
      objectData: obj,
      isExpanded: expandedObjects[objectKey],
      onToggleExpand: () => toggleExpand(objectKey),
      onInputChange: handleInputChange,
      activeInput,
      setActiveInput,
      allObjects: calculatedObjects,
      dependencies: getDependencies(objectKey)
    }

    switch (objectKey) {
      case 'timeline':
        return <TimelineObject key={objectKey} {...props} />
      case 'volume':
        return <VolumeObject key={objectKey} {...props} />
      case 'contractedRevenue':
        return <ContractedRevenueObject key={objectKey} {...props} />
      case 'merchantRevenue':
        return <MerchantRevenueObject key={objectKey} {...props} />
      case 'revenue':
        return <RevenueObject key={objectKey} {...props} />
      case 'fixedCosts':
        return <FixedCostsObject key={objectKey} {...props} />
      case 'opex':
        return <OpExObject key={objectKey} {...props} />
      case 'capex':
        return <CAPEXObject key={objectKey} {...props} />
      case 'operationalCapex':
        return <OperationalCapexObject key={objectKey} {...props} />
      case 'funding':
        return <FundingObject key={objectKey} {...props} />
      case 'constructionDebt':
        return <ConstructionDebtObject key={objectKey} {...props} />
      case 'constructionEquity':
        return <ConstructionEquityObject key={objectKey} {...props} />
      case 'debtSizing':
        return <DebtSizingObject key={objectKey} {...props} />
      case 'operatingDebt':
        return <OperatingDebtObject key={objectKey} {...props} />
      case 'cashflowBeforeDebt':
        return <CashflowBeforeDebtObject key={objectKey} {...props} />
      case 'cashflowSummary':
        return <CashflowSummaryObject key={objectKey} {...props} />
      case 'taxDepreciation':
        return <TaxDepreciationObject key={objectKey} {...props} />
      case 'terminalValue':
        return <TerminalValueObject key={objectKey} {...props} />
      case 'equityCashflow':
        return <EquityCashflowObject key={objectKey} {...props} />
      default:
        return null
    }
  }

  // Get equity IRR for display
  const equityIrr = calculatedObjects.equityCashflow?.outputs?.find(o => o.id === 'equity_irr')?.value || 0
  const equityMoic = calculatedObjects.equityCashflow?.outputs?.find(o => o.id === 'equity_moic')?.value || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <BatteryCharging className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">BESS Project Finance Model</h1>
              <p className="text-gray-600 mt-1">
                Hierarchical cashflow model with target-DSCR debt sizing and equity IRR
              </p>
            </div>
          </div>
          
          {/* Key Metrics Bar */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Equity IRR</div>
              <div className={`text-2xl font-bold ${equityIrr > 10 ? 'text-green-600' : equityIrr > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                {equityIrr.toFixed(2)}%
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Equity MOIC</div>
              <div className="text-2xl font-bold text-indigo-600">{equityMoic.toFixed(2)}x</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Max Debt (DSCR)</div>
              <div className="text-2xl font-bold text-purple-600">
                ${((calculatedObjects.debtSizing?.outputs?.find(o => o.id === 'max_debt')?.value || 0) / 1000000).toFixed(1)}M
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Sources - Uses</div>
              <div className={`text-2xl font-bold ${Math.abs(calculatedObjects.funding?.outputs?.find(o => o.id === 'sources_uses_delta')?.value || 0) < 1 ? 'text-green-600' : 'text-red-600'}`}>
                ${((calculatedObjects.funding?.outputs?.find(o => o.id === 'sources_uses_delta')?.value || 0) / 1000000).toFixed(1)}M
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Bar */}
        <TimelineBar 
          timelineOutputs={calculatedObjects._timelineOutputs} 
          contractYears={calculatedObjects.contractedRevenue?.inputs?.find(i => i.id === 'contract_years')?.value || 10}
          debtTerm={calculatedObjects.debtSizing?.inputs?.find(i => i.id === 'debt_term')?.value || 15}
          majorCapexYear={calculatedObjects.operationalCapex?.inputs?.find(i => i.id === 'major_replacement_year')?.value || 10}
          majorCapexInterval={5}
        />

        {/* Validation Section */}
        {!validation.isValid && (
          <div className="mb-6 p-4 rounded-lg border-2 bg-red-50 border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-900">Issues Found</h3>
            </div>
            <div className="mt-2 space-y-1">
              {validation.issues.map((issue, idx) => (
                <div key={idx} className="text-sm text-red-700">
                  • {issue.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cashflow Waterfall Layout */}
        <div className="space-y-8">
          
          {/* Timeline Settings */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              Timeline Settings
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {objectHierarchy.timeline.map(key => (
                <div key={key}>{renderObject(key, calculatedObjects[key])}</div>
              ))}
            </div>
          </div>

          {/* Technical Section - Volume */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              Technical: BESS Volume & Throughput
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {objectHierarchy.technical.map(key => (
                <div key={key}>{renderObject(key, calculatedObjects[key])}</div>
              ))}
            </div>
          </div>

          {/* Construction Period: Sources & Uses */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              Construction: Sources & Uses
            </h2>
            <div className="grid grid-cols-2 gap-6">
              {/* Sources (Funding = Equity + Debt) */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Sources (Funding)</div>
                <AggregatorGroup
                  parentKey="funding"
                  parentObject={calculatedObjects.funding}
                  childKeys={['constructionEquity', 'constructionDebt']}
                  allObjects={calculatedObjects}
                  renderObject={renderObject}
                  expandedChildren={expandedChildren}
                  onToggleChildren={toggleChildren}
                />
              </div>
              
              {/* Uses (Capex) */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Uses (Capex)</div>
                <AggregatorGroup
                  parentKey="capex"
                  parentObject={calculatedObjects.capex}
                  childKeys={[]} // No children yet for capex
                  allObjects={calculatedObjects}
                  renderObject={renderObject}
                  expandedChildren={expandedChildren}
                  onToggleChildren={toggleChildren}
                />
              </div>
            </div>
          </div>

          {/* Operations Period */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              Operations: Revenue → Costs → CFADS
            </h2>
            <div className="grid grid-cols-3 gap-6">
              {/* Revenue = Contracted + Merchant */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Revenue</div>
                <AggregatorGroup
                  parentKey="revenue"
                  parentObject={calculatedObjects.revenue}
                  childKeys={['contractedRevenue', 'merchantRevenue']}
                  allObjects={calculatedObjects}
                  renderObject={renderObject}
                  expandedChildren={expandedChildren}
                  onToggleChildren={toggleChildren}
                />
              </div>
              
              {/* Costs = Fixed Costs + Operational Capex */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Costs</div>
                <AggregatorGroup
                  parentKey="opex"
                  parentObject={calculatedObjects.opex}
                  childKeys={['fixedCosts', 'operationalCapex']}
                  allObjects={calculatedObjects}
                  renderObject={renderObject}
                  expandedChildren={expandedChildren}
                  onToggleChildren={toggleChildren}
                />
              </div>
              
              {/* CFADS = Revenue - Costs */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">CFADS</div>
                <AggregatorGroup
                  parentKey="cashflowBeforeDebt"
                  parentObject={calculatedObjects.cashflowBeforeDebt}
                  childKeys={[]}
                  allObjects={calculatedObjects}
                  renderObject={renderObject}
                  expandedChildren={expandedChildren}
                  onToggleChildren={toggleChildren}
                />
              </div>
            </div>
          </div>

          {/* Financing */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              Financing: Debt Sizing & Service
            </h2>
            <div className="grid grid-cols-2 gap-6">
              {/* Operating Debt with Debt Sizing as child */}
              <div className="space-y-4">
                <AggregatorGroup
                  parentKey="operatingDebt"
                  parentObject={calculatedObjects.operatingDebt}
                  childKeys={['debtSizing']}
                  allObjects={calculatedObjects}
                  renderObject={renderObject}
                  expandedChildren={expandedChildren}
                  onToggleChildren={toggleChildren}
                />
              </div>
              
              {/* Tax & Depreciation */}
              <div className="space-y-4">
                <AggregatorGroup
                  parentKey="taxDepreciation"
                  parentObject={calculatedObjects.taxDepreciation}
                  childKeys={[]}
                  allObjects={calculatedObjects}
                  renderObject={renderObject}
                  expandedChildren={expandedChildren}
                  onToggleChildren={toggleChildren}
                />
              </div>
            </div>
          </div>

          {/* Equity Returns */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              Equity Returns: IRR & MOIC
            </h2>
            <div className="grid grid-cols-3 gap-6">
              {objectHierarchy.equity.map(key => (
                <div key={key}>
                  <AggregatorGroup
                    parentKey={key}
                    parentObject={calculatedObjects[key]}
                    childKeys={[]}
                    allObjects={calculatedObjects}
                    renderObject={renderObject}
                    expandedChildren={expandedChildren}
                    onToggleChildren={toggleChildren}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Instructions Section */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">How to Use</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p>• <strong>Timeline:</strong> Set construction duration, operating years, and terminal year</p>
            <p>• <strong>Construction:</strong> Define Capex (Uses) and Funding (Sources = Equity + Debt)</p>
            <p>• <strong>Operations:</strong> Revenue = Volume × Price (Tolling for 10y, then Merchant); Costs = OpEx + OpCapex</p>
            <p>• <strong>Financing:</strong> Target DSCR back-solves max debt; Debt Service calculated from amortization</p>
            <p>• <strong>Equity:</strong> Full cashflow vector produces IRR and MOIC</p>
            <p>• Click any object card to expand and see inputs, logic, and outputs</p>
          </div>
        </div>
      </div>
    </div>
  )
}
