// app/assets/page.jsx
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
  Save
} from 'lucide-react'


export default function AssetsPage() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [editingAsset, setEditingAsset] = useState(null)

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/asset-inputs-summary')
      
      if (!response.ok) {
        throw new Error('Failed to fetch assets')
      }
      
      const data = await response.json()
      setAssets(data.assets || [])
      setError(null)
      
    } catch (err) {
      console.error('Assets fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const saveAllChanges = async () => {
    if (!editingAsset) return
    
    try {
      
      const response = await fetch('/api/assets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetId: editingAsset.asset_id,
          asset: editingAsset
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save asset')
      }
      
      // Update local state
      setAssets(prev => prev.map(asset => 
        asset.asset_id === editingAsset.asset_id ? editingAsset : asset
      ))
      
      setEditingAsset(null)
      
    } catch (err) {
      console.error('Save error:', err)
      setError(err.message)
    } finally {
      
    }
  }

  const startEditing = (asset) => {
    setEditingAsset({ ...asset })
  }

  const cancelEditing = () => {
    setEditingAsset(null)
  }

  const updateEditingAsset = (field, value) => {
    setEditingAsset(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getFilteredAssets = () => {
    return assets.filter(asset => {
      const matchesSearch = asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           asset.asset_id.toString().includes(searchTerm)
      const matchesType = selectedType === 'all' || asset.type === selectedType
      const matchesRegion = selectedRegion === 'all' || asset.region === selectedRegion
      
      return matchesSearch && matchesType && matchesRegion
    })
  }

  const formatCurrency = (value) => {
    if (!value && value !== 0) return ''
    return value.toFixed(2)
  }

  const formatPercentage = (value) => {
    if (!value && value !== 0) return ''
    return (value * 100).toFixed(2)
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return dateString.split('T')[0] // Remove time part
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
            <p className="text-gray-600 mt-2">Configure and manage your renewable energy assets</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              <Plus className="w-4 h-4" />
              <span>Add Asset</span>
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
          <div key={asset.asset_id} className="bg-white rounded-lg shadow-sm border border-gray-200">
            {editingAsset && editingAsset.asset_id === asset.asset_id ? (
              /* Editing Mode */
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Editing: {asset.asset_name}</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={cancelEditing}
                      className="flex items-center space-x-1 px-3 py-1 text-gray-600 hover:text-gray-800"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={saveAllChanges}
                      className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 flex items-center">
                      <Building2 className="w-4 h-4 mr-2" />
                      Basic Information
                    </h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                      <input
                        type="text"
                        value={editingAsset.asset_name}
                        onChange={(e) => updateEditingAsset('asset_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={editingAsset.type}
                        onChange={(e) => updateEditingAsset('type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="solar">Solar</option>
                        <option value="wind">Wind</option>
                        <option value="storage">Storage</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                      <select
                        value={editingAsset.region}
                        onChange={(e) => updateEditingAsset('region', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="NSW">NSW</option>
                        <option value="VIC">VIC</option>
                        <option value="QLD">QLD</option>
                        <option value="SA">SA</option>
                        <option value="WA">WA</option>
                        <option value="TAS">TAS</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (MW)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editingAsset.capacity}
                        onChange={(e) => updateEditingAsset('capacity', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* Financial Parameters */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Financial Parameters
                    </h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CAPEX ($M)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editingAsset.cost_capex}
                        onChange={(e) => updateEditingAsset('cost_capex', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Gearing (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formatPercentage(editingAsset.cost_max_gearing)}
                        onChange={(e) => updateEditingAsset('cost_max_gearing', parseFloat(e.target.value) / 100)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formatPercentage(editingAsset.cost_interest_rate)}
                        onChange={(e) => updateEditingAsset('cost_interest_rate', parseFloat(e.target.value) / 100)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tenor (Years)</label>
                      <input
                        type="number"
                        value={editingAsset.cost_tenor_years}
                        onChange={(e) => updateEditingAsset('cost_tenor_years', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Terminal Value ($M)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editingAsset.cost_terminal_value}
                        onChange={(e) => updateEditingAsset('cost_terminal_value', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* Operational Parameters */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 flex items-center">
                      <Zap className="w-4 h-4 mr-2" />
                      Operational Parameters
                    </h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Capacity Factor (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={editingAsset.capacity_factor}
                        onChange={(e) => updateEditingAsset('capacity_factor', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Annual Degradation (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingAsset.annual_degradation}
                        onChange={(e) => updateEditingAsset('annual_degradation', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Volume Loss Adjustment (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editingAsset.volume_loss_adjustment}
                        onChange={(e) => updateEditingAsset('volume_loss_adjustment', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Asset Life (Years)</label>
                      <input
                        type="number"
                        value={editingAsset.asset_life}
                        onChange={(e) => updateEditingAsset('asset_life', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Operating Costs ($M/year)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editingAsset.cost_operating_costs}
                        onChange={(e) => updateEditingAsset('cost_operating_costs', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">OPEX Escalation (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editingAsset.cost_operating_cost_escalation}
                        onChange={(e) => updateEditingAsset('cost_operating_cost_escalation', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Dates Section */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 flex items-center mb-4">
                    <Calendar className="w-4 h-4 mr-2" />
                    Project Timeline
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Construction Start Date</label>
                      <input
                        type="date"
                        value={formatDate(editingAsset.construction_start_date)}
                        onChange={(e) => updateEditingAsset('construction_start_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Operations Start Date</label>
                      <input
                        type="date"
                        value={formatDate(editingAsset.operating_start_date)}
                        onChange={(e) => updateEditingAsset('operating_start_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Display Mode */
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-4 h-4 rounded-full ${
                      asset.type === 'solar' ? 'bg-yellow-500' :
                      asset.type === 'wind' ? 'bg-blue-500' :
                      asset.type === 'storage' ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{asset.asset_name}</h3>
                      <p className="text-sm text-gray-600">
                        ID: {asset.asset_id} • {asset.type} • {asset.region}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => startEditing(asset)}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Technical Specs */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Zap className="w-4 h-4 mr-2" />
                      Technical
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Capacity:</span>
                        <span>{asset.capacity} MW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Capacity Factor:</span>
                        <span>{asset.capacity_factor}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Degradation:</span>
                        <span>{asset.annual_degradation}%/year</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Asset Life:</span>
                        <span>{asset.asset_life} years</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Financial
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">CAPEX:</span>
                        <span>${formatCurrency(asset.cost_capex)}M</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max Gearing:</span>
                        <span>{formatPercentage(asset.cost_max_gearing)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Interest Rate:</span>
                        <span>{formatPercentage(asset.cost_interest_rate)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tenor:</span>
                        <span>{asset.cost_tenor_years} years</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Operational
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">OPEX:</span>
                        <span>${formatCurrency(asset.cost_operating_costs)}M/year</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">OPEX Escalation:</span>
                        <span>{asset.cost_operating_cost_escalation}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Volume Loss:</span>
                        <span>{asset.volume_loss_adjustment}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Terminal Value:</span>
                        <span>${formatCurrency(asset.cost_terminal_value)}M</span>
                      </div>
                    </div>
                  </div>

                  {/* Debt Results */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Percent className="w-4 h-4 mr-2" />
                      Debt Results
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Debt Amount:</span>
                        <span>${formatCurrency(asset.debt_amount)}M</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Equity:</span>
                        <span>${formatCurrency(asset.debt_equity_amount)}M</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gearing:</span>
                        <span>{formatPercentage(asset.debt_gearing)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Equity IRR:</span>
                        <span>{asset.equity_irr ? formatPercentage(asset.equity_irr) + '%' : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Project Timeline
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Construction Start:</span>
                      <span>{formatDate(asset.construction_start_date) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Operations Start:</span>
                      <span>{formatDate(asset.operating_start_date) || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Contracts Summary */}
                {asset.contracts && asset.contracts.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Revenue Contracts</h4>
                    <div className="text-sm text-gray-600">
                      {asset.contracts.length} contract{asset.contracts.length !== 1 ? 's' : ''} configured
                    </div>
                  </div>
                )}
              </div>
            )}
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
              : 'Get started by adding your first asset'
            }
          </p>
          {!searchTerm && selectedType === 'all' && selectedRegion === 'all' && (
            <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 mx-auto">
              <Plus className="w-4 h-4" />
              <span>Add First Asset</span>
            </button>
          )}
        </div>
      )}

      {/* Summary Footer */}
      {filteredAssets.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Selection Summary</h4>
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
                ${filteredAssets.reduce((sum, asset) => sum + asset.cost_capex, 0).toFixed(1)}M
              </span>
            </div>
            <div>
              <span className="text-gray-600">Avg Gearing:</span>
              <span className="ml-2 font-medium">
                {(filteredAssets.reduce((sum, asset) => sum + asset.debt_gearing, 0) / filteredAssets.length * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}