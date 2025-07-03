// app/assets/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

export default function AssetsPage() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/inputs-summary')
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch assets: ${response.status} ${errorText}`)
        }
        
        const data = await response.json()
        setAssets(Array.isArray(data) ? data : [])
        setError(null)
        
      } catch (err) {
        console.error('Assets fetch error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAssets()
  }, [])

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
        <div className="text-center p-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Assets</h2>
          <p className="text-gray-600 mb-4 break-words">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const headers = assets.length > 0 ? Object.keys(assets[0]) : []

  const renderCell = (value) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">N/A</span>;
    }
    if (typeof value === 'object') {
      return <pre className="text-xs bg-gray-100 p-1 rounded">{JSON.stringify(value, null, 2)}</pre>;
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Asset Inputs Summary</h1>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        {assets.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                {headers.map(header => (
                  <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    {header.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assets.map((asset, index) => (
                <tr key={asset?._id?.$oid || asset?.asset_id || index} className="hover:bg-gray-50">
                  {headers.map(header => (
                    <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="max-w-xs truncate" title={typeof asset[header] === 'object' ? JSON.stringify(asset[header]) : asset[header]}>
                        {renderCell(asset[header])}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No asset data available.</p>
          </div>
        )}
      </div>
    </div>
  )
}
