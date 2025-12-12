'use client'

import { useState, useEffect } from 'react'
import { FileSpreadsheet, Download, Loader2, AlertCircle, CheckCircle, Building2 } from 'lucide-react'
import { usePortfolio } from '../../context/PortfolioContext'
import {
  EXCEL_EXPORT_RULES,
  applyNumberFormatToWorksheet,
  autoFitWorksheetColumns,
  coerceISODateStringsToExcelDates,
} from '../../utils/excelExportRules'

export default function BuildExcelPage() {
  const { selectedPortfolio, getPortfolioUniqueId } = usePortfolio()
  const [assets, setAssets] = useState([])
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAssets()
  }, [selectedPortfolio])

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const uniqueId = getPortfolioUniqueId(selectedPortfolio) || selectedPortfolio || 'ZEBRE'
      if (!uniqueId) {
        console.error('Build Excel page - No unique_id found for portfolio:', selectedPortfolio)
        setLoading(false)
        return
      }
      
      const response = await fetch(`/api/assets?unique_id=${encodeURIComponent(uniqueId)}`)
      if (!response.ok) throw new Error('Failed to fetch assets')
      
      const data = await response.json()
      const assetsList = data.assets || []
      setAssets(assetsList)
      
      // Auto-select first asset if available
      if (assetsList.length > 0 && !selectedAssetId) {
        setSelectedAssetId(assetsList[0].asset_id.toString())
      }
    } catch (err) {
      console.error('Error fetching assets:', err)
      setError('Failed to load assets: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateExcel = async () => {
    if (!selectedAssetId) {
      setError('Please select an asset')
      return
    }

    setGenerating(true)
    setStatus('Fetching asset data...')
    setError('')

    try {
      const uniqueId = getPortfolioUniqueId(selectedPortfolio) || selectedPortfolio || 'ZEBRE'
      
      // Fetch asset inputs
      setStatus('Fetching asset inputs...')
      const inputsResponse = await fetch(`/api/get-asset-data?unique_id=${encodeURIComponent(uniqueId)}`)
      if (!inputsResponse.ok) throw new Error('Failed to fetch asset inputs')
      
      const inputsData = await inputsResponse.json()
      const assetInputs = inputsData.asset_inputs || []
      const selectedAsset = assetInputs.find(a => a.id === parseInt(selectedAssetId))
      
      if (!selectedAsset) {
        throw new Error('Selected asset not found in inputs')
      }

      // Fetch monthly cashflows
      setStatus('Fetching monthly cashflows...')
      const cashflowResponse = await fetch(
        `/api/output-asset-data?asset_id=${selectedAssetId}&period=monthly&unique_id=${encodeURIComponent(uniqueId)}`
      )
      if (!cashflowResponse.ok) throw new Error('Failed to fetch cashflow data')
      
      const cashflowData = await cashflowResponse.json()
      const monthlyCashflows = cashflowData.data || []

      // Fetch 3-way statement data
      setStatus('Fetching 3-way financial statements...')
      const threeWayResponse = await fetch(
        `/api/three-way-forecast?asset_id=${selectedAssetId}&period=monthly&unique_id=${encodeURIComponent(uniqueId)}`
      )
      if (!threeWayResponse.ok) throw new Error('Failed to fetch 3-way statement data')
      
      const threeWayData = await threeWayResponse.json()
      const threeWayStatements = threeWayData.data || []

      // Prepare Inputs sheet data
      setStatus('Preparing Excel file...')
      const inputsSheetData = prepareInputsSheet(selectedAsset)
      
      // Prepare Monthly Cashflows sheet data (transposed)
      const cashflowsSheetData = prepareCashflowsSheetTransposed(monthlyCashflows)
      
      // Prepare 3-way statement sheet data (transposed)
      const threeWaySheetData = prepareThreeWaySheetTransposed(threeWayStatements)

      // Dynamically import xlsx to avoid SSR issues
      const XLSX = await import('xlsx')
      
      // Create workbook
      const workbook = XLSX.utils.book_new()
      
      // Add Inputs sheet
      const inputsWS = XLSX.utils.json_to_sheet(inputsSheetData)
      coerceISODateStringsToExcelDates(XLSX, inputsWS, EXCEL_EXPORT_RULES)
      if (EXCEL_EXPORT_RULES.autoFitColumns) autoFitWorksheetColumns(XLSX, inputsWS, EXCEL_EXPORT_RULES)
      XLSX.utils.book_append_sheet(workbook, inputsWS, 'Inputs')
      
      // Add Monthly Cashflows sheet (transposed)
      const cashflowsWS = XLSX.utils.json_to_sheet(cashflowsSheetData)
      applyNumberFormatToWorksheet(XLSX, cashflowsWS, EXCEL_EXPORT_RULES.numberFormat)
      if (EXCEL_EXPORT_RULES.autoFitColumns) autoFitWorksheetColumns(XLSX, cashflowsWS, EXCEL_EXPORT_RULES)
      XLSX.utils.book_append_sheet(workbook, cashflowsWS, 'Monthly Cashflows')
      
      // Add 3-Way Statement sheet (transposed)
      const threeWayWS = XLSX.utils.json_to_sheet(threeWaySheetData)
      applyNumberFormatToWorksheet(XLSX, threeWayWS, EXCEL_EXPORT_RULES.numberFormat)
      if (EXCEL_EXPORT_RULES.autoFitColumns) autoFitWorksheetColumns(XLSX, threeWayWS, EXCEL_EXPORT_RULES)
      XLSX.utils.book_append_sheet(workbook, threeWayWS, '3-Way Statement')

      // Generate Excel file
      setStatus('Generating Excel file...')
      const assetName = selectedAsset.name || `Asset_${selectedAssetId}`
      const fileName = `${assetName}_Financial_Model_${new Date().toISOString().split('T')[0]}.xlsx`
      
      XLSX.writeFile(workbook, fileName, EXCEL_EXPORT_RULES.writeOptions)
      
      setStatus('Excel file generated successfully!')
      setTimeout(() => setStatus(''), 3000)
    } catch (err) {
      console.error('Error generating Excel:', err)
      setError('Failed to generate Excel: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const prepareInputsSheet = (asset) => {
    const stringifyValue = (v) => {
      if (v === null || v === undefined) return ''
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v
      try {
        return JSON.stringify(v)
      } catch {
        return String(v)
      }
    }

    const flattenAny = (value, prefix, out) => {
      if (value === null || value === undefined) {
        out[prefix] = ''
        return
      }

      // Primitive
      if (typeof value !== 'object' || value instanceof Date) {
        out[prefix] = value
        return
      }

      // Array
      if (Array.isArray(value)) {
        if (value.length === 0) {
          out[prefix] = '[]'
          return
        }

        // Array of primitives → join
        const allPrimitive = value.every((x) => x === null || x === undefined || (typeof x !== 'object' || x instanceof Date))
        if (allPrimitive) {
          out[prefix] = value.map((x) => (x === null || x === undefined ? '' : String(x))).join(', ')
          return
        }

        // Array of objects → index and recurse
        value.forEach((item, idx) => {
          const nextPrefix = `${prefix}[${idx + 1}]`
          flattenAny(item, nextPrefix, out)
        })
        return
      }

      // Plain object
      const keys = Object.keys(value)
      if (keys.length === 0) {
        out[prefix] = '{}'
        return
      }
      keys.forEach((k) => {
        const nextPrefix = prefix ? `${prefix}.${k}` : k
        flattenAny(value[k], nextPrefix, out)
      })
    }

    const findContractArrays = (obj) => {
      const candidates = []
      if (!obj || typeof obj !== 'object') return candidates

      Object.entries(obj).forEach(([key, val]) => {
        if (!val) return
        const keyLower = key.toLowerCase()
        if (!keyLower.includes('contract')) return

        if (Array.isArray(val)) {
          candidates.push({ key, value: val })
        } else if (typeof val === 'object') {
          // Some schemas store a single contract object
          candidates.push({ key, value: [val] })
        }
      })

      // Ensure the canonical field is included first if present
      if (Array.isArray(obj.contracts) && !candidates.some((c) => c.key === 'contracts')) {
        candidates.unshift({ key: 'contracts', value: obj.contracts })
      }
      if (obj.contracts && typeof obj.contracts === 'object' && !Array.isArray(obj.contracts) && !candidates.some((c) => c.key === 'contracts')) {
        candidates.unshift({ key: 'contracts', value: [obj.contracts] })
      }

      return candidates
    }

    // Flatten asset data into key-value pairs for the Inputs sheet
    const inputs = []
    
    // Basic Information
    inputs.push({ Parameter: 'Asset ID', Value: asset.id || '' })
    inputs.push({ Parameter: 'Asset Name', Value: asset.name || '' })
    inputs.push({ Parameter: 'Asset Type', Value: asset.assetType || '' })
    inputs.push({ Parameter: 'Region', Value: asset.region || asset.state || '' })
    inputs.push({ Parameter: 'Capacity (MW)', Value: asset.capacity || '' })
    inputs.push({ Parameter: 'Operating Start Date', Value: asset.OperatingStartDate || '' })
    inputs.push({ Parameter: 'Construction Start Date', Value: asset.constructionStartDate || '' })
    inputs.push({ Parameter: 'Asset Life (years)', Value: asset.assetLife || '' })
    
    // Cost Assumptions
    if (asset.costAssumptions) {
      inputs.push({ Parameter: '', Value: '' }) // Separator
      inputs.push({ Parameter: 'Cost Assumptions', Value: '' })
      inputs.push({ Parameter: 'CAPEX (M$)', Value: asset.costAssumptions.capex || '' })
      inputs.push({ Parameter: 'Max Gearing (%)', Value: asset.costAssumptions.maxGearing ? (asset.costAssumptions.maxGearing * 100).toFixed(2) + '%' : '' })
      inputs.push({ Parameter: 'Interest Rate (%)', Value: asset.costAssumptions.interestRate ? (asset.costAssumptions.interestRate * 100).toFixed(2) + '%' : '' })
      inputs.push({ Parameter: 'Tenor Years', Value: asset.costAssumptions.tenorYears || '' })
      inputs.push({ Parameter: 'Target DSCR Contract', Value: asset.costAssumptions.targetDSCRContract || '' })
      inputs.push({ Parameter: 'Target DSCR Merchant', Value: asset.costAssumptions.targetDSCRMerchant || '' })
      inputs.push({ Parameter: 'Operating Costs (M$)', Value: asset.costAssumptions.operatingCosts || '' })
      inputs.push({ Parameter: 'Operating Cost Escalation (%)', Value: asset.costAssumptions.operatingCostEscalation ? (asset.costAssumptions.operatingCostEscalation * 100).toFixed(2) + '%' : '' })
      inputs.push({ Parameter: 'Terminal Value', Value: asset.costAssumptions.terminalValue || '' })
    }
    
    // Performance Parameters
    inputs.push({ Parameter: '', Value: '' }) // Separator
    inputs.push({ Parameter: 'Performance Parameters', Value: '' })
    inputs.push({ Parameter: 'Capacity Factor (%)', Value: asset.capacityFactor || '' })
    inputs.push({ Parameter: 'Annual Degradation (%)', Value: asset.annualDegradation || '' })
    inputs.push({ Parameter: 'Volume Loss Adjustment (%)', Value: asset.volumeLossAdjustment || '' })
    
    // Contracts (export EVERYTHING saved so nothing goes missing; you can cull later)
    const contractArrays = findContractArrays(asset)
    if (contractArrays.length > 0) {
      inputs.push({ Parameter: '', Value: '' }) // Separator
      inputs.push({ Parameter: 'Contracts (All Saved Inputs)', Value: '' })

      contractArrays.forEach(({ key, value }) => {
        inputs.push({ Parameter: '', Value: '' })
        inputs.push({ Parameter: `Contracts Source: ${key}`, Value: '' })

        value.forEach((contract, index) => {
          inputs.push({ Parameter: `Contract ${index + 1} - Raw JSON`, Value: stringifyValue(contract) })

          const flat = {}
          // If a contract is a primitive (rare), still export it.
          if (contract === null || contract === undefined || typeof contract !== 'object') {
            flat.value = contract
          } else {
            flattenAny(contract, '', flat)
          }

          Object.entries(flat).forEach(([flatKey, flatVal]) => {
            inputs.push({
              Parameter: `Contract ${index + 1} - ${flatKey}`,
              Value: stringifyValue(flatVal),
            })
          })
        })
      })
    }
    
    return inputs
  }

  const prepareCashflowsSheetTransposed = (cashflows) => {
    if (!cashflows || cashflows.length === 0) {
      return [{ '': 'No data available' }]
    }

    // Define all fields we want to include
    const fieldMapping = {
      revenue: 'Revenue',
      contractedGreenRevenue: 'Contracted Green Revenue',
      contractedEnergyRevenue: 'Contracted Energy Revenue',
      merchantGreenRevenue: 'Merchant Green Revenue',
      merchantEnergyRevenue: 'Merchant Energy Revenue',
      monthlyGeneration: 'Monthly Generation (MWh)',
      opex: 'OPEX',
      capex: 'CAPEX',
      debt_capex: 'Debt CAPEX',
      equity_capex: 'Equity CAPEX',
      cfads: 'CFADS',
      principal: 'Principal Payment',
      interest: 'Interest Payment',
      debt_service: 'Debt Service',
      ending_balance: 'Ending Debt Balance',
      equity_cash_flow: 'Equity Cash Flow',
      net_income: 'Net Income',
      d_and_a: 'Depreciation & Amortization',
      ebit: 'EBIT',
      ebt: 'EBT',
      tax_expense: 'Tax Expense'
    }

    // Extract dates and create a map of date -> data
    const dateMap = new Map()
    const dates = []
    
    cashflows.forEach(item => {
      const date = item._id ? formatDateFromId(item._id) : item.date || ''
      if (date && !dateMap.has(date)) {
        dates.push(date)
        dateMap.set(date, item)
      }
    })
    
    // Sort dates chronologically
    dates.sort((a, b) => {
      // Compare as strings in YYYY-MM format
      return a.localeCompare(b)
    })

    // Create transposed structure: each row is a field, columns are dates
    const transposedData = []
    
    // First row: header with dates
    const headerRow = { '': 'Period' }
    dates.forEach(date => {
      headerRow[date] = date
    })
    transposedData.push(headerRow)

    // Subsequent rows: one row per field
    Object.entries(fieldMapping).forEach(([fieldKey, fieldLabel]) => {
      const row = { '': fieldLabel }
      dates.forEach(date => {
        const item = dateMap.get(date)
        row[date] = (item && item[fieldKey] !== undefined) ? item[fieldKey] : ''
      })
      transposedData.push(row)
    })

    return transposedData
  }

  const prepareThreeWaySheetTransposed = (threeWayData) => {
    if (!threeWayData || threeWayData.length === 0) {
      return [{ '': 'No data available' }]
    }

    // Define field mappings for 3-way statements
    const profitLossFields = {
      revenue: 'Revenue',
      opex: 'OPEX',
      ebitda: 'EBITDA',
      d_and_a: 'Depreciation & Amortization',
      ebit: 'EBIT',
      interest: 'Interest',
      ebt: 'EBT',
      tax_expense: 'Tax Expense',
      net_income: 'Net Income'
    }

    const balanceSheetFields = {
      cash: 'Cash',
      fixed_assets: 'Fixed Assets',
      total_assets: 'Total Assets',
      debt: 'Debt',
      total_liabilities: 'Total Liabilities',
      equity: 'Equity',
      share_capital: 'Share Capital',
      retained_earnings: 'Retained Earnings'
    }

    const cashFlowFields = {
      cfads: 'CFADS',
      operating_cash_flow: 'Operating Cash Flow',
      capex: 'CAPEX',
      terminal_value: 'Terminal Value',
      investing_cash_flow: 'Investing Cash Flow',
      drawdowns: 'Drawdowns',
      principal: 'Principal',
      equity_injection: 'Equity Injection',
      distributions: 'Distributions',
      dividends: 'Dividends',
      redistributed_capital: 'Redistributed Capital',
      financing_cash_flow: 'Financing Cash Flow',
      equity_cash_flow_pre_distributions: 'Equity Cash Flow (Pre-Distributions)',
      equity_cash_flow: 'Equity Cash Flow',
      net_cash_flow: 'Net Cash Flow',
      debt_service: 'Debt Service',
      beginning_balance: 'Beginning Balance',
      ending_balance: 'Ending Balance'
    }

    // Extract dates and create a map
    const dateMap = new Map()
    const dates = []
    
    threeWayData.forEach(item => {
      const date = item._id ? formatDateFromId(item._id) : item.date || ''
      if (date && !dateMap.has(date)) {
        dates.push(date)
        dateMap.set(date, item)
      }
    })
    
    // Sort dates chronologically
    dates.sort((a, b) => {
      // Compare as strings in YYYY-MM format
      return a.localeCompare(b)
    })

    // Create transposed structure
    const transposedData = []
    
    // First row: header with dates
    const headerRow = { '': 'Period' }
    dates.forEach(date => {
      headerRow[date] = date
    })
    transposedData.push(headerRow)

    // Add separator and section header for P&L
    transposedData.push({ '': 'PROFIT & LOSS STATEMENT', ...Object.fromEntries(dates.map(d => [d, ''])) })
    
    // P&L rows
    Object.entries(profitLossFields).forEach(([fieldKey, fieldLabel]) => {
      const row = { '': fieldLabel }
      dates.forEach(date => {
        const item = dateMap.get(date)
        row[date] = (item && item[fieldKey] !== undefined) ? item[fieldKey] : ''
      })
      transposedData.push(row)
    })

    // Add separator and section header for Balance Sheet
    transposedData.push({ '': '', ...Object.fromEntries(dates.map(d => [d, ''])) })
    transposedData.push({ '': 'BALANCE SHEET', ...Object.fromEntries(dates.map(d => [d, ''])) })
    
    // Balance Sheet rows
    Object.entries(balanceSheetFields).forEach(([fieldKey, fieldLabel]) => {
      const row = { '': fieldLabel }
      dates.forEach(date => {
        const item = dateMap.get(date)
        row[date] = (item && item[fieldKey] !== undefined) ? item[fieldKey] : ''
      })
      transposedData.push(row)
    })

    // Add separator and section header for Cash Flow
    transposedData.push({ '': '', ...Object.fromEntries(dates.map(d => [d, ''])) })
    transposedData.push({ '': 'CASH FLOW STATEMENT', ...Object.fromEntries(dates.map(d => [d, ''])) })
    
    // Cash Flow rows
    Object.entries(cashFlowFields).forEach(([fieldKey, fieldLabel]) => {
      const row = { '': fieldLabel }
      dates.forEach(date => {
        const item = dateMap.get(date)
        row[date] = (item && item[fieldKey] !== undefined) ? item[fieldKey] : ''
      })
      transposedData.push(row)
    })

    return transposedData
  }

  const formatDateFromId = (id) => {
    if (!id) return ''
    if (id.year && id.month) {
      return `${id.year}-${String(id.month).padStart(2, '0')}`
    }
    if (id.year && id.quarter) {
      return `${id.year}-Q${id.quarter}`
    }
    if (id.year) {
      return `${id.year}`
    }
    return ''
  }


  const selectedAsset = assets.find(a => a.asset_id === parseInt(selectedAssetId))

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <FileSpreadsheet className="mr-2 h-5 w-5 text-green-600" />
              Build Excel Model
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Select an asset to generate a financial model Excel file with Inputs, Monthly Cashflows (transposed), and 3-Way Statement (transposed) sheets.</p>
            </div>

            <div className="mt-8 space-y-6">
              {/* Asset Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Asset
                </label>
                {loading ? (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading assets...</span>
                  </div>
                ) : (
                  <select
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                    disabled={generating}
                  >
                    <option value="">-- Select an asset --</option>
                    {assets.map((asset) => (
                      <option key={asset.asset_id} value={asset.asset_id}>
                        {asset.asset_name || asset.name || `Asset ${asset.asset_id}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selected Asset Info */}
              {selectedAsset && (
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Selected Asset</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Name:</span> {selectedAsset.asset_name || selectedAsset.name}</p>
                    <p><span className="font-medium">Type:</span> {selectedAsset.type || 'N/A'}</p>
                    <p><span className="font-medium">Capacity:</span> {selectedAsset.capacity || 'N/A'} MW</p>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <div className="pt-5">
                <button
                  type="button"
                  onClick={generateExcel}
                  disabled={!selectedAssetId || generating || loading}
                  className={`
                    w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white 
                    ${(!selectedAssetId || generating || loading)
                      ? 'bg-green-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                    }
                  `}
                >
                  {generating ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="-ml-1 mr-2 h-5 w-5" />
                      Generate Excel File
                    </>
                  )}
                </button>
              </div>

              {/* Status Messages */}
              {status && (
                <div className="rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3 flex-1 md:flex md:justify-between">
                      <p className="text-sm text-blue-700">{status}</p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

