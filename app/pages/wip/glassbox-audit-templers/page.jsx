'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Search,
  AlertCircle,
  CheckCircle,
  Info,
  BatteryCharging,
  Loader2,
  Database,
  Calculator,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Calendar,
  Percent
} from 'lucide-react'
import { initialObjects } from '../glassbox-audit/utils/objectDefinitions'
import TimelineBar from '../glassbox-audit/components/TimelineBar'

const PORTFOLIO_ID = 'PRIe3oRLfO4uck35xwYFJ'

// Format currency
const formatCurrency = (value, decimals = 1) => {
  if (value === undefined || value === null || isNaN(value)) return 'N/A'
  const millions = value / 1_000_000
  if (Math.abs(millions) >= 1) {
    return `$${millions.toFixed(decimals)}M`
  }
  const thousands = value / 1_000
  if (Math.abs(thousands) >= 1) {
    return `$${thousands.toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

// Format percentage
const formatPercent = (value, decimals = 2) => {
  if (value === undefined || value === null || isNaN(value)) return 'N/A'
  return `${(value * 100).toFixed(decimals)}%`
}

// Format number
const formatNumber = (value, decimals = 1) => {
  if (value === undefined || value === null) return 'N/A'
  // Handle string values (like dates, names)
  if (typeof value === 'string') return value
  if (typeof value !== 'number' || isNaN(value)) return String(value)
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}K`
  }
  return value.toFixed(decimals)
}

// Section Card Component
function SectionCard({ title, icon: Icon, color, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      <div className={`px-4 py-3 border-b border-gray-100 bg-gradient-to-r ${color}`}>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-white" />
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

// Data Row Component
// Note: For unit='%', pass values as decimals (0.65 for 65%) OR use unit='%raw' for already-percentage values (65 for 65%)
function DataRow({ label, inputValue, outputValue, unit = '', highlight = false }) {
  const hasComparison = outputValue !== undefined && outputValue !== null
  
  const formatValue = (val) => {
    if (val === undefined || val === null) return 'N/A'
    if (typeof val === 'string') return val
    if (unit === '$') return formatCurrency(val)
    if (unit === '%') return formatPercent(val) // Expects decimal (0.65 = 65%)
    if (unit === '%raw') return `${val}%` // Already a percentage (65 = 65%)
    return formatNumber(val)
  }
  
  const inputDisplay = formatValue(inputValue)
  const outputDisplay = hasComparison ? formatValue(outputValue) : null

  return (
    <div className={`flex items-center justify-between py-2 px-3 rounded-lg ${highlight ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
      <span className="text-sm text-gray-600 font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-xs text-gray-400 block">Input</span>
          <span className="text-sm font-semibold text-gray-900">{inputDisplay}</span>
        </div>
        {hasComparison && (
          <>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="text-right">
              <span className="text-xs text-green-600 block">Model Output</span>
              <span className="text-sm font-semibold text-green-700">{outputDisplay}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({ label, value, unit, icon: Icon, color = 'indigo', subtext }) {
  const colorClasses = {
    indigo: 'from-indigo-500 to-indigo-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600'
  }

  const displayValue = unit === '$' ? formatCurrency(value) 
    : unit === '%' ? formatPercent(value)
    : formatNumber(value)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{displayValue}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  )
}

export default function GlassboxAuditTemplersPage() {
  const [assetInput, setAssetInput] = useState(null)
  const [assetOutput, setAssetOutput] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch both asset inputs and outputs on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        
        // Fetch both inputs and outputs in parallel
        const [inputResponse, outputResponse] = await Promise.all([
          fetch(`/api/get-asset-data?unique_id=${PORTFOLIO_ID}`),
          fetch(`/api/dashboard/asset-output-summary?unique_id=${PORTFOLIO_ID}`)
        ])
        
        if (!inputResponse.ok) {
          throw new Error('Failed to fetch asset inputs')
        }
        
        const inputData = await inputResponse.json()
        const outputData = outputResponse.ok ? await outputResponse.json() : null
        
        // Get first asset (Templers - id: 1)
        const firstAsset = inputData.asset_inputs?.find(a => a.id === 1) || inputData.asset_inputs?.[0]
        if (!firstAsset) {
          throw new Error('No assets found in portfolio')
        }
        
        setAssetInput(firstAsset)
        
        // Find matching output by asset_id
        if (outputData?.assets) {
          const matchingOutput = outputData.assets.find(a => a.asset_id === firstAsset.id)
          setAssetOutput(matchingOutput || null)
        }
        
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Derived calculations from inputs
  const derived = useMemo(() => {
    if (!assetInput) return null
    
    const c = assetInput.costAssumptions || {}
    const contract = assetInput.contracts?.[0]
    
    // Calculate toll payment: strikePrice × capacity × 8760 hours
    const tollPaymentAnnual = parseFloat(contract?.strikePrice || 0) * parseFloat(assetInput.capacity || 0) * 8760
    
    // Back-calculate cycles from volume
    const capacity = parseFloat(assetInput.capacity) || 100
    const duration = parseFloat(assetInput.durationHours) || 2
    const dailyVolume = parseFloat(assetInput.volume) || 293
    const cyclesPerDay = dailyVolume / (capacity * duration) || 1
    
    // Annual discharge MWh
    const annualDischargeMwh = dailyVolume * 365 * (assetInput.volumeLossAdjustment || 95) / 100
    
    // CAPEX in dollars
    const capexTotal = (c.capex || 0) * 1_000_000
    
    // Gearing split
    const gearing = c.maxGearing || 0.65
    const debtAmount = capexTotal * gearing
    const equityAmount = capexTotal * (1 - gearing)
    
    // Operating costs
    const opexAnnual = (c.operatingCosts || 0) * 1_000_000
    
    // Contract duration
    const contractYears = Math.round(parseFloat(contract?.contractDuration || 120) / 12)
    
    // Construction duration in years
    const constructionYears = Math.round(parseFloat(assetInput.constructionDuration || 21) / 12)
    
    return {
      tollPaymentAnnual,
      cyclesPerDay,
      annualDischargeMwh,
      capexTotal,
      gearing,
      debtAmount,
      equityAmount,
      opexAnnual,
      contractYears,
      constructionYears,
      capacity,
      duration,
      interestRate: c.interestRate || 0.06,
      tenorYears: c.tenorYears || 20,
      targetDSCR: c.targetDSCRContract || 1.4,
      terminalValue: (c.terminalValue || 0) * 1_000_000
    }
  }, [assetInput])

  // Timeline outputs for TimelineBar
  const timelineOutputs = useMemo(() => {
    if (!assetInput || !derived) return null
    
    const constructionYears = derived.constructionYears
    const operatingYears = assetInput.assetLife || 25
    
    return {
      construction_start_year: -constructionYears + 1,
      cod_year: 1,
      operations_end_year: operatingYears,
      terminal_year: operatingYears,
      constructionPct: (constructionYears / (constructionYears + operatingYears)) * 100,
      operationsPct: (operatingYears / (constructionYears + operatingYears)) * 100
    }
  }, [assetInput, derived])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading Templers BESS data...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching inputs and model outputs...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl p-8 shadow-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!assetInput || !derived) return null

  const c = assetInput.costAssumptions || {}
  const contract = assetInput.contracts?.[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <BatteryCharging className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Glassbox Audit - {assetInput.name}
              </h1>
              <p className="text-gray-600 mt-1">
                {assetInput.capacity} MW | {assetInput.region} | {assetInput.type}
                {c.capex && ` | $${c.capex}M CAPEX`}
              </p>
            </div>
          </div>
          
          {/* Data Source Badges */}
          <div className="flex gap-3 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              <Database className="w-4 h-4" />
              Inputs: CONFIG_Inputs
            </div>
            {assetOutput && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                <Calculator className="w-4 h-4" />
                Outputs: ASSET_Output_Summary
              </div>
            )}
            {!assetOutput && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                No model outputs found - run model first
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics - Model Outputs */}
        {assetOutput && (
          <div className="grid grid-cols-6 gap-4 mb-8">
            <MetricCard 
              label="Equity IRR" 
              value={assetOutput.equity_irr} 
              unit="%" 
              icon={TrendingUp} 
              color={assetOutput.equity_irr > 0.10 ? 'green' : 'amber'}
              subtext="From model output"
            />
            <MetricCard 
              label="Total CAPEX" 
              value={assetOutput.total_capex * 1_000_000} 
              unit="$" 
              icon={DollarSign} 
              color="indigo"
              subtext="Model calculated"
            />
            <MetricCard 
              label="Total Debt" 
              value={assetOutput.total_debt * 1_000_000} 
              unit="$" 
              icon={DollarSign} 
              color="purple"
              subtext={`${formatPercent(assetOutput.gearing)} gearing`}
            />
            <MetricCard 
              label="Total Revenue" 
              value={assetOutput.total_revenue * 1_000_000} 
              unit="$" 
              icon={TrendingUp} 
              color="green"
              subtext="Lifetime total"
            />
            <MetricCard 
              label="Total OPEX" 
              value={assetOutput.total_opex * 1_000_000} 
              unit="$" 
              icon={DollarSign} 
              color="red"
              subtext="Lifetime total"
            />
            <MetricCard 
              label="Total CFADS" 
              value={assetOutput.total_cfads * 1_000_000} 
              unit="$" 
              icon={TrendingUp} 
              color="blue"
              subtext="Lifetime total"
            />
          </div>
        )}

        {/* Timeline */}
        {timelineOutputs && (
          <TimelineBar 
            timelineOutputs={timelineOutputs}
            contractYears={derived.contractYears}
            debtTerm={derived.tenorYears}
            majorCapexYear={10}
            majorCapexInterval={5}
          />
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6 mt-8">
          
          {/* Column 1: Asset Info & Timeline */}
          <div className="space-y-6">
            <SectionCard title="Asset Information" icon={BatteryCharging} color="from-indigo-500 to-indigo-600">
              <div className="space-y-1">
                <DataRow label="Asset Name" inputValue={assetInput.name} />
                <DataRow label="Asset ID" inputValue={assetInput.id} />
                <DataRow label="Region" inputValue={assetInput.region} />
                <DataRow label="Type" inputValue={assetInput.type} />
                <DataRow label="Capacity (MW)" inputValue={assetInput.capacity} />
                <DataRow label="Duration (hrs)" inputValue={assetInput.durationHours} />
                <DataRow label="Volume (MWh/day)" inputValue={assetInput.volume} />
              </div>
            </SectionCard>

            <SectionCard title="Timeline" icon={Calendar} color="from-blue-500 to-blue-600">
              <div className="space-y-1">
                <DataRow label="Construction Start" inputValue={assetInput.constructionStartDate} />
                <DataRow label="Construction Duration" inputValue={`${assetInput.constructionDuration} months`} />
                <DataRow label="Operations Start" inputValue={assetInput.OperatingStartDate} 
                  outputValue={assetOutput?.operations_start_date} />
                <DataRow label="Asset Life" inputValue={`${assetInput.assetLife} years`} />
                <DataRow label="Operations End" inputValue={null} 
                  outputValue={assetOutput?.operations_end_date} />
                <DataRow label="Annual Degradation" inputValue={assetInput.annualDegradation} unit="%raw" />
                <DataRow label="Volume Loss Adj" inputValue={assetInput.volumeLossAdjustment} unit="%raw" />
              </div>
            </SectionCard>

            <SectionCard title="Derived: BESS Throughput" icon={Calculator} color="from-cyan-500 to-cyan-600">
              <div className="space-y-1">
                <DataRow label="Cycles per Day" inputValue={derived.cyclesPerDay} highlight />
                <DataRow label="Annual Discharge (MWh)" inputValue={derived.annualDischargeMwh} highlight />
                <DataRow label="Implied Power×Duration" inputValue={derived.capacity * derived.duration} />
              </div>
            </SectionCard>
          </div>

          {/* Column 2: Financing & CAPEX */}
          <div className="space-y-6">
            <SectionCard title="CAPEX & Funding" icon={DollarSign} color="from-purple-500 to-purple-600">
              <div className="space-y-1">
                <DataRow label="Total CAPEX" inputValue={derived.capexTotal} unit="$" 
                  outputValue={assetOutput ? assetOutput.total_capex * 1_000_000 : null} highlight />
                <div className="border-t border-gray-100 my-2" />
                <DataRow label="Max Gearing" inputValue={derived.gearing} unit="%" 
                  outputValue={assetOutput?.gearing} />
                <DataRow label="Debt Amount" inputValue={derived.debtAmount} unit="$" 
                  outputValue={assetOutput ? assetOutput.total_debt * 1_000_000 : null} />
                <DataRow label="Equity Amount" inputValue={derived.equityAmount} unit="$" 
                  outputValue={assetOutput ? assetOutput.total_equity * 1_000_000 : null} />
              </div>
            </SectionCard>

            <SectionCard title="Debt Terms" icon={Percent} color="from-violet-500 to-violet-600">
              <div className="space-y-1">
                <DataRow label="Interest Rate" inputValue={derived.interestRate} unit="%" />
                <DataRow label="Tenor (years)" inputValue={derived.tenorYears} />
                <DataRow label="Target DSCR (Contract)" inputValue={c.targetDSCRContract} />
                <DataRow label="Target DSCR (Merchant)" inputValue={c.targetDSCRMerchant} />
                <DataRow label="Debt Structure" inputValue={c.debtStructure} />
              </div>
            </SectionCard>

            <SectionCard title="Operating Costs" icon={DollarSign} color="from-red-500 to-red-600">
              <div className="space-y-1">
                <DataRow label="Annual OPEX" inputValue={derived.opexAnnual} unit="$" />
                <DataRow label="OPEX Escalation" inputValue={c.operatingCostEscalation} unit="%raw" />
                <DataRow label="Total Lifetime OPEX" inputValue={null} 
                  outputValue={assetOutput ? assetOutput.total_opex * 1_000_000 : null} highlight />
              </div>
            </SectionCard>
          </div>

          {/* Column 3: Revenue & Returns */}
          <div className="space-y-6">
            <SectionCard title="Contract: Tolling Agreement" icon={TrendingUp} color="from-green-500 to-green-600">
              <div className="space-y-1">
                <DataRow label="Counterparty" inputValue={contract?.counterparty} />
                <DataRow label="Contract Type" inputValue={contract?.type} />
                <DataRow label="Buyer's %" inputValue={contract?.buyersPercentage} unit="%raw" />
                <DataRow label="Strike Price ($/MWh)" inputValue={contract?.strikePrice} />
                <DataRow label="Indexation" inputValue={contract?.indexation} unit="%raw" />
                <DataRow label="Start Date" inputValue={contract?.startDate} />
                <DataRow label="End Date" inputValue={contract?.endDate} />
                <DataRow label="Contract Duration" inputValue={`${derived.contractYears} years`} />
              </div>
            </SectionCard>

            <SectionCard title="Derived: Annual Revenue" icon={Calculator} color="from-emerald-500 to-emerald-600">
              <div className="space-y-1">
                <DataRow label="Toll Payment (Year 1)" inputValue={derived.tollPaymentAnnual} unit="$" highlight />
                <div className="text-xs text-gray-500 px-3 py-1">
                  = ${contract?.strikePrice}/MWh × {assetInput.capacity} MW × 8,760 hrs
                </div>
                <DataRow label="Total Lifetime Revenue" inputValue={null} 
                  outputValue={assetOutput ? assetOutput.total_revenue * 1_000_000 : null} highlight />
              </div>
            </SectionCard>

            <SectionCard title="Returns & Terminal Value" icon={TrendingUp} color="from-amber-500 to-amber-600">
              <div className="space-y-1">
                <DataRow label="Terminal Value (Input)" inputValue={derived.terminalValue} unit="$" 
                  outputValue={assetOutput ? assetOutput.terminal_value * 1_000_000 : null} />
                <div className="border-t border-gray-100 my-2" />
                <DataRow label="Equity IRR" inputValue={null} 
                  outputValue={assetOutput?.equity_irr} unit="%" highlight />
                <DataRow label="Total CFADS" inputValue={null} 
                  outputValue={assetOutput ? assetOutput.total_cfads * 1_000_000 : null} />
                <DataRow label="Total Equity Cash Flow" inputValue={null} 
                  outputValue={assetOutput ? assetOutput.total_equity_cash_flow * 1_000_000 : null} />
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Data Source Footer */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Flow Summary</h2>
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Database className="w-4 h-4" />
                1. Asset Inputs (CONFIG_Inputs)
              </h3>
              <ul className="text-gray-600 space-y-1 ml-6 list-disc">
                <li>Asset specifications (capacity, duration, volume)</li>
                <li>Cost assumptions (CAPEX, OPEX, gearing)</li>
                <li>Contract details (tolling terms, pricing)</li>
                <li>Timeline (construction, operations)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                2. Backend Model (run_cashflow_model)
              </h3>
              <ul className="text-gray-600 space-y-1 ml-6 list-disc">
                <li>Revenue calculation (contracted + merchant)</li>
                <li>OPEX/CAPEX timeseries</li>
                <li>Debt sizing & amortization</li>
                <li>Tax & depreciation</li>
                <li>Equity IRR calculation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                3. Model Outputs (ASSET_Output_Summary)
              </h3>
              <ul className="text-gray-600 space-y-1 ml-6 list-disc">
                <li>Total CAPEX, Debt, Equity</li>
                <li>Calculated gearing</li>
                <li>Lifetime revenue, OPEX, CFADS</li>
                <li>Terminal value</li>
                <li>Equity IRR</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-xs text-gray-500">
              <span><strong>Portfolio ID:</strong> {PORTFOLIO_ID}</span>
              <span><strong>Asset ID:</strong> {assetInput.id}</span>
              <span><strong>Last Updated:</strong> {assetInput.lastUpdated ? new Date(assetInput.lastUpdated).toLocaleString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Raw Data Viewer (Collapsed) */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            View Raw Data (JSON)
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-lg p-4 text-xs text-green-400 font-mono overflow-auto max-h-96">
              <div className="text-gray-500 mb-2">// Asset Input (from CONFIG_Inputs)</div>
              <pre>{JSON.stringify(assetInput, null, 2)}</pre>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 text-xs text-blue-400 font-mono overflow-auto max-h-96">
              <div className="text-gray-500 mb-2">// Model Output (from ASSET_Output_Summary)</div>
              <pre>{assetOutput ? JSON.stringify(assetOutput, null, 2) : '// No model output found - run model first'}</pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}
