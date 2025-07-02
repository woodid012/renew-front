// app/assets/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Building2, 
  Zap, 
  MapPin,
  Calendar,
  DollarSign,
  Percent,
  Search,
  Filter,
  Download,
  AlertCircle,
  Loader2,
  Eye
} from 'lucide-react'

export default function AssetsPage() {
  const [assets, setAssets] = useState([])
  const [filteredAssets, setFilteredAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedAsset, setSelectedAsset] = useState(null)

  useEffect(() => {
    fetchAssets()
  }, [])

  useEffect(() => {
    filterAssets()
  }, [assets, searchTerm, selectedType, selectedRegion])

  const fetchAssets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/assets')
      
      if (!response.ok) {
        throw new Error('Failed to fetch assets')
      }
      
      const data = await response.json()
      setAssets(data.assets || [])
    } catch (err) {
      console.error('Assets fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filterAssets = () => {
    let filtered = assets

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(asset => 
        asset.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.asset_id?.toString().includes(searchTerm)
      )
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(asset => asset.type === selectedType)
    }

    // Filter by region
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(asset => asset.region === selectedRegion)
    }

    setFilteredAssets(filtered)
  }

  const getUniqueValues = (field) => {
    return [...new Set(assets.map(asset => asset[field]).filter(Boolean))]
  }

  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'N/A'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value * 1000000) // Convert from millions to actual dollars
  }

  const formatPercentage = (value) => {
    if (!value && value !== 0) return 'N/A'
    return `${(value * 100).toFixed(1)}%`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-AU')
    } catch {
      return dateString
    }
  }

  const getAssetTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'solar':
        return <div className="w-3 h-3 rounded-full bg-yellow-500" />
      case 'wind':
        return <div className="w-3 h-3 rounded-full bg-blue-500" />
      case 'storage':
        return <div className="w-3 h-3 rounded-full bg-green-500" />
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-500" />
    }
  }

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Asset Management</h1>
        <p className="text-gray-600 mt-2">Manage and view your renewable energy asset portfolio</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">{assets.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <Zap className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Total Capacity</p>
              <p className="text-2xl font-bold text-gray-900">
                {assets.reduce((sum, asset) => sum + (parseFloat(asset.capacity) || 0), 0).toFixed(0)} MW
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Total CAPEX</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(assets.reduce((sum, asset) => sum + (parseFloat(asset.cost_capex) || 0), 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <MapPin className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Regions</p>
              <p className="text-2xl font-bold text-gray-900">{getUniqueValues('region').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">All Types</option>
            {getUniqueValues('type').map(type => (
              <option key={type} value={type} className="capitalize">{type}</option>
            ))}
          </select>

          {/* Region Filter */}
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
          >
            <option value="all">All Regions</option>
            {getUniqueValues('region').map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>

          {/* Export Button */}
          <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CAPEX</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operating Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gearing</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssets.map((asset) => (
                <tr key={asset.asset_id || asset._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {asset.asset_name || asset.name || `Asset ${asset.asset_id}`}
                        </div>
                        <div className="text-sm text-gray-500">ID: {asset.asset_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getAssetTypeIcon(asset.type)}
                      <span className="text-sm text-gray-900 capitalize">{asset.type || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900">{asset.region || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {asset.capacity ? `${parseFloat(asset.capacity).toFixed(0)} MW` : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {formatCurrency(asset.cost_capex)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900">
                        {formatDate(asset.OperatingStartDate)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {formatPercentage(asset.cost_maxGearing)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => setSelectedAsset(asset)}
                      className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAssets.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
            <p className="text-gray-600">Try adjusting your search criteria</p>
          </div>
        )}
      </div>

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedAsset.asset_name || selectedAsset.name || `Asset ${selectedAsset.asset_id}`}
                </h3>
                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(selectedAsset).map(([key, value]) => {
                  if (key.startsWith('_') || !value) return null
                  
                  return (
                    <div key={key} className="border-b border-gray-200 pb-2">
                      <dt className="text-sm font-medium text-gray-500 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </dt>
                      <dd className="text-sm text-gray-900 mt-1">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </dd>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}