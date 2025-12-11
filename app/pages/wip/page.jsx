'use client'

import { useState, useEffect } from 'react'
import { Download, FileDown, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export default function ExportPage() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  // Selections
  const [selectedGranularity, setSelectedGranularity] = useState('monthly')
  const [includePrice, setIncludePrice] = useState(true)
  const [includeAssets, setIncludeAssets] = useState(true)
  const [includePlatform, setIncludePlatform] = useState(true)
  const [includeSensitivity, setIncludeSensitivity] = useState(false)

  // Data options
  const [sensitivityScenarios, setSensitivityScenarios] = useState([])
  const [selectedSensitivityId, setSelectedSensitivityId] = useState('')
  const [assets, setAssets] = useState([])

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      // Fetch Assets
      const assetsRes = await fetch('/api/assets')
      if (assetsRes.ok) {
        const assetsData = await assetsRes.json()
        setAssets(assetsData)
      }

      // Fetch Sensitivity Scenarios
      const sensRes = await fetch('/api/get-sensitivity-output')
      if (sensRes.ok) {
        const sensData = await sensRes.json()
        if (sensData.uniqueScenarioIds) {
          setSensitivityScenarios(sensData.uniqueScenarioIds)
          if (sensData.uniqueScenarioIds.length > 0) {
            setSelectedSensitivityId(sensData.uniqueScenarioIds[0])
          }
        }
      }
    } catch (err) {
      console.error('Error fetching initial data:', err)
      setError('Failed to load initial data')
    }
  }

  const convertToCSV = (data) => {
    if (!data || !data.length) return ''

    // Flatten nested objects (especially _id structures from MongoDB aggregations)
    const flattenRow = (obj, prefix = '') => {
      const flattened = {}
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}_${key}` : key
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          // Recursively flatten nested objects
          Object.assign(flattened, flattenRow(value, newKey))
        } else {
          flattened[newKey] = value
        }
      }
      return flattened
    }

    const flattenedData = data.map(row => flattenRow(row))

    // Get all unique headers
    const headers = Array.from(new Set(flattenedData.flatMap(Object.keys)))

    // Create CSV rows
    const csvRows = [
      headers.join(','),
      ...flattenedData.map(row => headers.map(header => {
        const val = row[header]
        // Handle strings with commas, nulls, etc.
        if (val === null || val === undefined) return ''
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`
        if (val instanceof Date) return val.toISOString().split('T')[0]
        return val
      }).join(','))
    ]

    return csvRows.join('\n')
  }

  const handleExport = async () => {
    setLoading(true)
    setStatus('Starting export...')
    setError('')

    try {
      const zip = new JSZip()
      const folderName = `export_${selectedGranularity}_${new Date().toISOString().split('T')[0]}`
      const folder = zip.folder(folderName)

      // 1. Export Price Curves
      if (includePrice) {
        setStatus('Fetching Price Curves...')
        const res = await fetch(`/api/price-curves2?period=${selectedGranularity}`)
        if (!res.ok) throw new Error('Failed to fetch price curves')
        const data = await res.json()
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.warn('Price curves data is empty or invalid:', data)
          folder.file('price_curves.csv', 'No data available')
        } else {
          const csvContent = convertToCSV(data)
          if (!csvContent || csvContent.trim() === '') {
            console.warn('Price curves CSV conversion resulted in empty content')
            folder.file('price_curves.csv', 'No data available')
          } else {
            folder.file('price_curves.csv', csvContent)
          }
        }
      }

      // 2. Export Asset Data & Platform Data
      let assetData = null;
      if (includeAssets || includePlatform) {
        setStatus('Fetching Asset Data...')
        const res = await fetch(`/api/export-data?granularity=${selectedGranularity}`)
        if (!res.ok) throw new Error('Failed to fetch asset data')
        assetData = await res.json()

        if (includeAssets) {
          folder.file('all_assets_cashflow.csv', convertToCSV(assetData))
        }
      }

      // 3. Export Platform Data
      if (includePlatform && assetData) {
        setStatus('Processing Platform Data...')
        // Aggregate by date
        const platformMap = new Map()

        assetData.forEach(row => {
          const date = row.date
          if (!platformMap.has(date)) {
            platformMap.set(date, { date, asset_id: 'Platform' })
          }
          const platformRow = platformMap.get(date)

          Object.keys(row).forEach(key => {
            if (key !== 'date' && key !== 'asset_id' && typeof row[key] === 'number') {
              platformRow[key] = (platformRow[key] || 0) + row[key]
            }
          })
        })

        const platformData = Array.from(platformMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date))
        folder.file('platform_cashflow.csv', convertToCSV(platformData))
      }

      // 4. Export Sensitivity
      if (includeSensitivity && selectedSensitivityId) {
        setStatus(`Fetching Sensitivity: ${selectedSensitivityId}...`)
        const res = await fetch(`/api/export-data?granularity=${selectedGranularity}&scenario_id=${selectedSensitivityId}&collection=sensitivity`)
        if (!res.ok) throw new Error('Failed to fetch sensitivity data')
        const data = await res.json()
        folder.file(`sensitivity_${selectedSensitivityId}.csv`, convertToCSV(data))
      }

      setStatus('Compressing...')
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, `${folderName}.zip`)

      setStatus('Export Complete!')
      setTimeout(() => setStatus(''), 3000)
    } catch (err) {
      console.error('Export failed:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <Download className="mr-2 h-5 w-5 text-green-600" />
              Bulk Data Export
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Select the data you wish to export. All files will be compiled into a single ZIP archive.</p>
            </div>

            <div className="mt-8 space-y-6">
              {/* Granularity Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Time Series Granularity</label>
                <select
                  value={selectedGranularity}
                  onChange={(e) => setSelectedGranularity(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="fiscal_yearly">Fiscal Yearly</option>
                </select>
              </div>

              {/* Data Selection */}
              <div className="space-y-4">
                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="price"
                      type="checkbox"
                      checked={includePrice}
                      onChange={(e) => setIncludePrice(e.target.checked)}
                      className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="price" className="font-medium text-gray-700">Price Curves</label>
                    <p className="text-gray-500">Export merchant price curves and spreads.</p>
                  </div>
                </div>

                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="assets"
                      type="checkbox"
                      checked={includeAssets}
                      onChange={(e) => setIncludeAssets(e.target.checked)}
                      className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="assets" className="font-medium text-gray-700">Asset Data</label>
                    <p className="text-gray-500">Export cash flow data for all assets.</p>
                  </div>
                </div>

                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="platform"
                      type="checkbox"
                      checked={includePlatform}
                      onChange={(e) => setIncludePlatform(e.target.checked)}
                      className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="platform" className="font-medium text-gray-700">Platform Data</label>
                    <p className="text-gray-500">Export aggregated platform cash flows.</p>
                  </div>
                </div>

                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="sensitivity"
                      type="checkbox"
                      checked={includeSensitivity}
                      onChange={(e) => setIncludeSensitivity(e.target.checked)}
                      className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm w-full">
                    <label htmlFor="sensitivity" className="font-medium text-gray-700">Sensitivity Analysis</label>
                    <p className="text-gray-500 mb-2">Export results from a specific sensitivity run.</p>

                    {includeSensitivity && (
                      <select
                        value={selectedSensitivityId}
                        onChange={(e) => setSelectedSensitivityId(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                      >
                        {sensitivityScenarios.map((id) => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-5">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={loading}
                  className={`
                    w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white 
                    ${loading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'}
                  `}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileDown className="-ml-1 mr-2 h-5 w-5" />
                      Export Data
                    </>
                  )}
                </button>
              </div>

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
                      <h3 className="text-sm font-medium text-red-800">Export Failed</h3>
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