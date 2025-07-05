
// app/pages/asset_2/page.jsx
'use client'
import { useState, useEffect } from 'react'

export default function Asset2Page() {
  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch initial asset data
    const fetchAssetData = async () => {
      try {
        const response = await fetch('/api/get-asset-data')
        if (!response.ok) {
          throw new Error('Failed to fetch asset data')
        }
        const data = await response.json()
        setAsset(data)
      } catch (error) {
        alert('Error fetching asset data: ' + error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAssetData()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setAsset(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    try {
      const response = await fetch('/api/save-asset-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(asset),
      })

      if (!response.ok) {
        throw new Error('Failed to save asset data')
      }

      alert('Asset data saved.')
    } catch (error) {
      alert('Error saving asset data: ' + error.message)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!asset) {
    return <div className="p-8">No asset data found.</div>
  }

  return (
    <div className="p-8">
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">Asset Definition</h1>
        <div>
          <label className="block text-sm font-medium text-gray-700">Asset Name</label>
          <input name="name" value={asset.name} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">State</label>
          <input name="state" value={asset.state} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Asset Start Date</label>
          <input name="assetStartDate" value={asset.assetStartDate} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Capacity</label>
          <input name="capacity" value={asset.capacity} onChange={handleInputChange} type="number" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <input name="type" value={asset.type} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Volume Loss Adjustment</label>
          <input name="volumeLossAdjustment" value={asset.volumeLossAdjustment} onChange={handleInputChange} type="number" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Annual Degradation</label>
          <input name="annualDegradation" value={asset.annualDegradation} onChange={handleInputChange} type="number" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Asset Life</label>
          <input name="assetLife" value={asset.assetLife} onChange={handleInputChange} type="number" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Construction Duration</label>
          <input name="constructionDuration" value={asset.constructionDuration} onChange={handleInputChange} type="number" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Construction Start Date</label>
          <input name="constructionStartDate" value={asset.constructionStartDate} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <button onClick={handleSave} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Save</button>
      </div>
    </div>
  )
}
