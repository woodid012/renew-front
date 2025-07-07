'use client'

import { useState, useEffect } from 'react'

export default function DefaultsPage() {
  const [defaults, setDefaults] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  useEffect(() => {
    async function fetchDefaults() {
      try {
        const res = await fetch('/api/get-defaults')
        if (res.ok) {
          const data = await res.json()
          setDefaults(data)
        } else {
          const { error } = await res.json()
          setStatus(`Error: ${error}`)
        }
      } catch (error) {
        console.error('Error fetching defaults:', error)
        setStatus('Error fetching defaults')
      }
      setLoading(false)
    }

    fetchDefaults()
  }, [])

  const handleValueChange = (settingName, newValue) => {
    setDefaults(defaults.map(s => s.name === settingName ? { ...s, currentValue: newValue } : s))
  }

  const handleSave = async () => {
    setStatus('Saving...')
    try {
      const res = await fetch('/api/save-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaults }),
      })

      if (res.ok) {
        setStatus('Saved successfully!')
      } else {
        const { error } = await res.json()
        setStatus(`Error: ${error}`)
      }
    } catch (error) {
      console.error('Error saving defaults:', error)
      setStatus('Error saving defaults')
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">CONFIG Defaults</h1>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Save Changes
        </button>
      </div>
      {status && <div className="mb-4 text-sm text-gray-600">{status}</div>}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Setting
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Value
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                New Value
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {defaults.map((setting) => (
              <tr key={setting.name}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{setting.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{setting.currentValue}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {setting.options ? (
                    <select
                      value={setting.currentValue}
                      onChange={(e) => handleValueChange(setting.name, e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      {setting.options.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={setting.currentValue}
                      onChange={(e) => handleValueChange(setting.name, e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
