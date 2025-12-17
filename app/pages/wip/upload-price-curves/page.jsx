
'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, Bot, Loader2, CheckCircle, AlertTriangle, FileText, BarChart, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function UploadPriceCurvesPage() {
    const [file, setFile] = useState(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [previewData, setPreviewData] = useState(null)
    const [curveName, setCurveName] = useState('')
    const [uploadResult, setUploadResult] = useState(null)
    const [lastMetadata, setLastMetadata] = useState(null)
    const [error, setError] = useState(null)

    const fileInputRef = useRef(null)

    const handleFileSelect = (e) => {
        const selected = e.target.files[0]
        if (selected) {
            setFile(selected)
            setPreviewData(null)
            setUploadResult(null)
            setLastMetadata(null)
            setError(null)
        }
    }

    const handleAnalyze = async () => {
        if (!file) return

        setAnalyzing(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/price-curves/analyze', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()

            if (data.status === 'success') {
                setPreviewData(data.data)
                setCurveName(data.data.suggestedName)
            } else {
                setError(data.message || 'Analysis failed')
            }
        } catch (err) {
            setError('Failed to analyze file: ' + err.message)
        } finally {
            setAnalyzing(false)
        }
    }

    const handleUpload = async () => {
        if (!file || !curveName) return

        setUploading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('curve_name', curveName)

            const res = await fetch('/api/price-curves/upload', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()

            if (data.status === 'success') {
                setUploadResult(data.message)
                if (previewData && previewData.metadata) {
                    setLastMetadata(previewData.metadata)
                }
                setPreviewData(null) // Clear preview on success
                setFile(null)       // Clear file
            } else {
                setError(data.message || 'Upload failed')
            }
        } catch (err) {
            setError('Failed to upload: ' + err.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Upload Price Curves</h1>
                <p className="text-gray-600 mt-1">
                    Import price curve data from Aurora Excel files.
                </p>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="text-red-700">{error}</div>
                </div>
            )}

            {/* SUCCESS MESSAGE */}
            {uploadResult && (
                <div className="mb-6 space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                            <h3 className="font-medium text-green-800">Upload Successful</h3>
                            <p className="text-green-700">{uploadResult}</p>
                        </div>
                    </div>

                    {/* LAST UPLOAD METADATA */}
                    {lastMetadata && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                Uploaded File Metadata
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {lastMetadata.map((item, idx) => (
                                    <div key={idx} className="bg-gray-50 p-2 rounded border border-gray-100">
                                        <p className="text-[10px] text-gray-500 font-medium uppercase">{item.label}</p>
                                        <p className="text-sm font-medium text-gray-900">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* FILE UPLOAD AREA - Visible when no preview is active (even if success shown) */}
            {!previewData && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    {!file ? (
                        <div
                            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xlsx,.xls"
                                onChange={handleFileSelect}
                            />
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Upload className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Click to Upload Excel File</h3>
                            <p className="text-gray-500">Supports Aurora Market Forecast files (.xlsx)</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6 w-full max-w-lg">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <FileSpreadsheet className="w-6 h-6 text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{file.name}</p>
                                    <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <button
                                    onClick={() => setFile(null)}
                                    className="p-2 hover:bg-gray-200 rounded-full text-gray-500"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={analyzing}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 shadow-sm disabled:opacity-50"
                            >
                                {analyzing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Analyzing File...
                                    </>
                                ) : (
                                    <>
                                        <Bot className="w-5 h-5" />
                                        Analyze File
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* PREVIEW SECTION */}
            {previewData && (
                <div className="space-y-6">
                    {/* CONFIRMATION CARD */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            Analysis Complete
                        </h2>

                        <div className="flex flex-col md:flex-row gap-6 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Curve Name (this will appear in selectors)
                                </label>
                                <input
                                    type="text"
                                    value={curveName}
                                    onChange={(e) => setCurveName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g. AC Oct 2025"
                                />
                                <p className="text-xs text-am-500 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Warning: Uploading will overwrite any existing curve with this name.
                                </p>
                            </div>

                            <div className="flex gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => setPreviewData(null)}
                                    className="px-6 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" />
                                            Upload to Database
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* METADATA CARD */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-600" />
                            File Metadata (Central Inputs)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {previewData.metadata && previewData.metadata.map((item, idx) => (
                                <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 font-medium uppercase">{item.label}</p>
                                    <p className="text-sm font-semibold text-gray-900">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PREVIEW CHARTS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* BASELOAD PREVIEW */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <BarChart className="w-4 h-4 text-blue-600" />
                                Preview: Baseload (FY Average)
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={previewData.preview.baseload}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis
                                            dataKey="fy"
                                            tick={{ fontSize: 12, fill: '#6B7280' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#6B7280' }}
                                            axisLine={false}
                                            tickLine={false}
                                            label={{ value: '$/MWh', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#9CA3AF' } }}
                                        />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="NSW" stroke="#2563EB" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="VIC" stroke="#16A34A" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="QLD" stroke="#DC2626" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="SA" stroke="#F59E0B" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* LGC PREVIEW */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <BarChart className="w-4 h-4 text-green-600" />
                                Preview: LGC (Green)
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={previewData.preview.lgc}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 12, fill: '#6B7280' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#6B7280' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip />
                                        <Line
                                            type="stepAfter"
                                            dataKey="price"
                                            stroke="#16A34A"
                                            strokeWidth={2}
                                            dot={{ r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
