'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function UploadZebrePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleUpload = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/upload-zebre-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to upload ZEBRE data')
      }

      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Upload ZEBRE Data to MongoDB
            </h3>
            
            <p className="text-sm text-gray-600 mb-6">
              This will upload the ZEBRE asset data from the local JSON file to the MongoDB database.
              If ZEBRE portfolio already exists, it will be updated. Otherwise, a new portfolio will be created.
            </p>

            <button
              onClick={handleUpload}
              disabled={loading}
              className={`
                w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white
                ${loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                }
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Uploading...
                </>
              ) : (
                'Upload ZEBRE Data'
              )}
            </button>

            {result && (
              <div className="mt-6 rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Upload Successful!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p><strong>Action:</strong> {result.action}</p>
                      <p><strong>Document ID:</strong> {result.documentId}</p>
                      <p><strong>Assets Count:</strong> {result.assetsCount}</p>
                      {result.filePath && (
                        <p className="mt-2 text-xs text-green-600">
                          <strong>Source:</strong> {result.filePath}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <XCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Upload Failed
                    </h3>
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
  )
}






