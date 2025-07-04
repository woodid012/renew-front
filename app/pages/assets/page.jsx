// app/pages/assets/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Building2, 
  Plus,
  Edit3,
  X,
  Search,
  Filter,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  DollarSign,
  Zap,
  Percent,
  Clock,
  MapPin,
  Save,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Battery,
  Sun,
  Wind,
  Database,
  Check,
  Undo2
} from 'lucide-react'

// Import the context from the main page
import { useUnsavedChanges } from '../../page'

export default function AssetsPage() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [expandedAsset, setExpandedAsset] = useState(null)
  const [editingAsset, setEditingAsset] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Get unsaved changes context
  const { addUnsavedAsset, removeUnsavedAsset, unsavedAssets } = useUnsavedChanges()

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/asset-input-summary')
      if (!response.ok) {
        throw new Error('Failed to fetch assets')
      }
      
      const data = await response.json()
      setAssets(data.assets || [])
      setLastUpdated(new Date())
      
    } catch (err) {
      console.error('Assets fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayAssets = () => {
    // Merge original assets with unsaved changes
    return assets.map(asset => {
      const unsavedAsset = unsavedAssets.find(ua => ua.asset_id === asset.asset_id)
      return unsavedAsset || asset
    })
  }

  const getFilteredAssets = () => {
    return getDisplayAssets().filter(asset => {
      const matchesSearch = asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           asset.asset_id.toString().includes(searchTerm)
      const matchesType = selectedType === 'all' || asset.type === selectedType
      const matchesRegion = selectedRegion === 'all' || asset.region === selectedRegion
      
      return matchesSearch && matchesType && matchesRegion
    })
  }

  const isAssetUnsaved = (assetId) => {
    return unsavedAssets.some(ua => ua.asset_id === assetId)
  }

  const startEditing = (asset) => {
    setEditingAsset({ ...asset })
  }

  const cancelEditing = () => {
    setEditingAsset(null)
  }

  const saveLocalChanges = () => {
    if (!editingAsset) return
    
    // Add to unsaved changes
    addUnsavedAsset(editingAsset)
    
    // Update local state
    setAssets(prev => prev.map(asset => 
      asset.asset_id === editingAsset.asset_id ? editingAsset : asset
    ))
    
    setEditingAsset(null)
  }

  const discardLocalChanges = (assetId) => {
    removeUnsavedAsset(assetId)
    
    // Reload original asset data
    fetchAssets()
  }

  const updateEditingAsset = (field, value) => {
    setEditingAsset(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value * 1000000)
  }

  const formatCurrencyShort = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A'
    return `${Number(value).toFixed(1)}M`
  }

  const formatPercentage = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A'
    return `${(Number(value) * 100).toFixed(1)}%`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-AU')
  }

  const parseContracts = (contractsString) => {
    if (!contractsString) return []
    
    try {
      // Handle Python-style string format
      const cleanedString = contractsString
        .replace(/'/g, '"')
        .replace(/None/g, 'null')
        .replace(/True/g, 'true')
        .replace(/False/g, 'false')
      
      return JSON.parse(cleanedString)
    } catch (e) {
      console.warn('Failed to parse contracts:', e)
      return []
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'storage':
        return <Battery className="w-5 h-5" />
      case 'solar':
        return <Sun className="w-5 h-5" />
      case 'wind':
        return <Wind className="w-5 h-5" />
      default:
        return <Building2 className="w-5 h-5" />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'storage':
        return 'bg-green-500'
      case 'solar':
        return 'bg-yellow-500'
      case 'wind':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Get unique values for filters
  const uniqueTypes = [...new Set(assets.map(asset => asset.type))].filter(Boolean)
  const uniqueRegions = [...new Set(assets.map(asset => asset.region))].filter(Boolean)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <span className="text-gray-600">Loading assets...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Assets</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchAssets}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  const filteredAssets = getFilteredAssets()

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Asset Management</h1>
            <p className="text-gray-600 mt-2">
              View and manage your renewable energy asset portfolio
            </p>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString('en-AU')}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  {assets.length} assets
                </span>
              </div>
            </div>
            <button
              onClick={fetchAssets}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Regions</option>
              {uniqueRegions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedType('all')
                setSelectedRegion('all')
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <X className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Asset List */}
      <div className="space-y-4">
        {filteredAssets.map((asset) => (
          <div key={asset.asset_id} className={`bg-white rounded-lg shadow-sm border ${
            isAssetUnsaved(asset.asset_id) ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
          }`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className={`w-4 h-4 rounded-full ${getTypeColor(asset.type)}`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">{asset.asset_name}</h3>
                      {isAssetUnsaved(asset.asset_id) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Unsaved
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      ID: {asset.asset_id} • {asset.type} • {asset.region} • {asset.capacity} MW
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{formatCurrencyShort(asset.cost_capex)}</div>
                    <div className="text-xs text-gray-500">{formatPercentage(asset.debt_gearing)} gearing</div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center space-x-2">
                    {isAssetUnsaved(asset.asset_id) && (
                      <button
                        onClick={() => discardLocalChanges(asset.asset_id)}
                        className="flex items-center space-x-1 px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        title="Discard changes"
                      >
                        <Undo2 className="w-4 h-4" />
                        <span className="text-xs">Discard</span>
                      </button>
                    )}
                    
                    {editingAsset && editingAsset.asset_id === asset.asset_id ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={cancelEditing}
                          className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                        <button
                          onClick={saveLocalChanges}
                          className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(asset)}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => setExpandedAsset(expandedAsset === asset.asset_id ? null : asset.asset_id)}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      {expandedAsset === asset.asset_id ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          <span>Collapse</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>Expand</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Capacity</div>
                  <div className="text-lg font-semibold">{asset.capacity} MW</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">CAPEX</div>
                  <div className="text-lg font-semibold">{formatCurrencyShort(asset.cost_capex)}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Gearing</div>
                  <div className="text-lg font-semibold">{formatPercentage(asset.debt_gearing)}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Operations</div>
                  <div className="text-lg font-semibold">{formatDate(asset.OperatingStartDate)}</div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedAsset === asset.asset_id && (
                <div className="border-t border-gray-200 pt-6">
                  {editingAsset && editingAsset.asset_id === asset.asset_id ? (
                    /* Editing Form */
                    <div className="space-y-8">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Editing Mode</h4>
                        <p className="text-sm text-blue-700">Make changes below and click "Save" to store them locally, or "Save All" in the top right to commit to database.</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Asset Details */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                            <Building2 className="w-4 h-4 mr-2" />
                            Asset Details
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                              <input
                                type="text"
                                value={editingAsset.asset_name || ''}
                                onChange={(e) => updateEditingAsset('asset_name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (MW)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingAsset.capacity || ''}
                                onChange={(e) => updateEditingAsset('capacity', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Volume (MWh)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingAsset.volume || ''}
                                onChange={(e) => updateEditingAsset('volume', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Asset Life (Years)</label>
                              <input
                                type="number"
                                value={editingAsset.assetLife || ''}
                                onChange={(e) => updateEditingAsset('assetLife', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Financial Details */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                            <DollarSign className="w-4 h-4 mr-2" />
                            Financial Details
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">CAPEX ($M)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingAsset.cost_capex || ''}
                                onChange={(e) => updateEditingAsset('cost_capex', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Max Gearing</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={editingAsset.cost_maxGearing || ''}
                                onChange={(e) => updateEditingAsset('cost_maxGearing', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={editingAsset.cost_interestRate || ''}
                                onChange={(e) => updateEditingAsset('cost_interestRate', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Tenor (Years)</label>
                              <input
                                type="number"
                                value={editingAsset.cost_tenorYears || ''}
                                onChange={(e) => updateEditingAsset('cost_tenorYears', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Operating Costs ($M/year)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editingAsset.cost_operatingCosts || ''}
                                onChange={(e) => updateEditingAsset('cost_operatingCosts', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Operational Parameters */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                            <Zap className="w-4 h-4 mr-2" />
                            Operational Parameters
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Volume Loss Adjustment (%)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingAsset.volumeLossAdjustment || ''}
                                onChange={(e) => updateEditingAsset('volumeLossAdjustment', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Annual Degradation (%)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingAsset.annualDegradation || ''}
                                onChange={(e) => updateEditingAsset('annualDegradation', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Construction Start Date</label>
                              <input
                                type="date"
                                value={editingAsset.constructionStartDate || ''}
                                onChange={(e) => updateEditingAsset('constructionStartDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Operations Start Date</label>
                              <input
                                type="date"
                                value={editingAsset.OperatingStartDate || ''}
                                onChange={(e) => updateEditingAsset('OperatingStartDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {/* Asset Details */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                          <Building2 className="w-4 h-4 mr-2" />
                          Asset Details
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Type:</span>
                            <span className="font-medium capitalize">{asset.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Region:</span>
                            <span className="font-medium">{asset.region}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Capacity:</span>
                            <span className="font-medium">{asset.capacity} MW</span>
                          </div>
                          {asset.volume && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Volume:</span>
                              <span className="font-medium">{asset.volume} MWh</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Asset Life:</span>
                            <span className="font-medium">{asset.assetLife} years</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Construction Duration:</span>
                            <span className="font-medium">{asset.constructionDuration} months</span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Details */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Financial Details
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total CAPEX:</span>
                            <span className="font-medium">{formatCurrencyShort(asset.cost_capex)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Max Gearing:</span>
                            <span className="font-medium">{formatPercentage(asset.cost_maxGearing)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Interest Rate:</span>
                            <span className="font-medium">{formatPercentage(asset.cost_interestRate)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tenor:</span>
                            <span className="font-medium">{asset.cost_tenorYears} years</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Terminal Value:</span>
                            <span className="font-medium">{formatCurrencyShort(asset.cost_terminalValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">OPEX:</span>
                            <span className="font-medium">{formatCurrencyShort(asset.cost_operatingCosts)}/year</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">OPEX Escalation:</span>
                            <span className="font-medium">{asset.cost_operatingCostEscalation}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Debt Structure */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                          <Percent className="w-4 h-4 mr-2" />
                          Debt Structure
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Debt Amount:</span>
                            <span className="font-medium">{formatCurrencyShort(asset.debt_debt_amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Equity Amount:</span>
                            <span className="font-medium">{formatCurrencyShort(asset.debt_equity_amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Actual Gearing:</span>
                            <span className="font-medium">{formatPercentage(asset.debt_gearing)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Calculated Gearing:</span>
                            <span className="font-medium">{formatPercentage(asset.cost_calculatedGearing)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Debt Structure:</span>
                            <span className="font-medium capitalize">{asset.cost_debtStructure}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Target DSCR (Contract):</span>
                            <span className="font-medium">{asset.cost_targetDSCRContract}x</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Target DSCR (Merchant):</span>
                            <span className="font-medium">{asset.cost_targetDSCRMerchant}x</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Operational Parameters */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                      <Zap className="w-4 h-4 mr-2" />
                      Operational Parameters
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Volume Loss Adjustment</div>
                        <div className="text-lg font-semibold">{asset.volumeLossAdjustment}%</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Annual Degradation</div>
                        <div className="text-lg font-semibold">{asset.annualDegradation}%</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Construction Start</div>
                        <div className="text-lg font-semibold">{formatDate(asset.constructionStartDate)}</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Operations Start</div>
                        <div className="text-lg font-semibold">{formatDate(asset.OperatingStartDate)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Contracts */}
                  {asset.contracts && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Revenue Contracts
                      </h4>
                      <div className="space-y-4">
                        {parseContracts(asset.contracts).map((contract, index) => (
                          <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <div className="text-sm text-gray-600">Counterparty</div>
                                <div className="font-medium">{contract.counterparty}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Type</div>
                                <div className="font-medium capitalize">{contract.type}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Buyer's Percentage</div>
                                <div className="font-medium">{contract.buyersPercentage}%</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Strike Price</div>
                                <div className="font-medium">${contract.strikePrice}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Indexation</div>
                                <div className="font-medium">{contract.indexation}%</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Term</div>
                                <div className="font-medium">
                                  {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedType !== 'all' || selectedRegion !== 'all' 
              ? 'Try adjusting your filters' 
              : 'No assets available in the system'
            }
          </p>
        </div>
      )}

      {/* Summary Footer */}
      {filteredAssets.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Portfolio Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Assets:</span>
              <span className="ml-2 font-medium">{filteredAssets.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Capacity:</span>
              <span className="ml-2 font-medium">
                {filteredAssets.reduce((sum, asset) => sum + asset.capacity, 0).toFixed(1)} MW
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total CAPEX:</span>
              <span className="ml-2 font-medium">
                {formatCurrencyShort(filteredAssets.reduce((sum, asset) => sum + asset.cost_capex, 0))}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Avg Gearing:</span>
              <span className="ml-2 font-medium">
                {filteredAssets.length > 0 ? 
                  formatPercentage(filteredAssets.reduce((sum, asset) => sum + asset.debt_gearing, 0) / filteredAssets.length) : 
                  'N/A'
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}