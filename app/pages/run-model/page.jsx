// app/pages/run-model/page.jsx
"use client"

import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, AlertCircle, CheckCircle, Loader2, Settings, FileText } from 'lucide-react';
import { useRunModel } from '../../context/RunModelContext';

const RunModelPage = () => {
  const {
    isRunning,
    logs,
    status,
    runSensitivity,
    setRunSensitivity,
    sensitivityConfig,
    showAdvanced,
    setShowAdvanced,
    backendUrl,
    addLog,
    clearLogs,
    runModel,
    runSensitivityAnalysis,
    stopModel,
    getDuration,
    logsEndRef,
    currentRunTime,
    baseResultsExist,
    scenarioId
  } = useRunModel();

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const [priceCurves, setPriceCurves] = useState([]);
  const [selectedPriceCurve, setSelectedPriceCurve] = useState('');
  const [isLoadingCurves, setIsLoadingCurves] = useState(false);

  useEffect(() => {
    const fetchCurvesAndSettings = async () => {
      setIsLoadingCurves(true);
      try {
        // Fetch curve names
        const metaResponse = await fetch('/api/price-curves/meta');
        const metaData = await metaResponse.json();

        let curves = [];
        if (metaData.curveNames && Array.isArray(metaData.curveNames)) {
          curves = metaData.curveNames;
          setPriceCurves(curves);
        }

        // Fetch saved settings for default
        const settingsResponse = await fetch('/api/model-settings');
        const settingsData = await settingsResponse.json();
        const savedDefault = settingsData.settings?.defaultPriceCurve;

        // Determine selection
        if (savedDefault && curves.includes(savedDefault)) {
          setSelectedPriceCurve(savedDefault);
        } else if (curves.length > 0) {
          // Fallback to last one if no default saved or saved default not found
          setSelectedPriceCurve(curves[curves.length - 1]);
        }
      } catch (error) {
        console.error("Failed to fetch price curves or settings:", error);
        addLog("Failed to fetch price curves or settings", "warning");
      } finally {
        setIsLoadingCurves(false);
      }
    };

    fetchCurvesAndSettings();
  }, [backendUrl]);

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Play className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Run Cash Flow Model</h1>
        <p className="text-gray-600">Execute the renewable finance cash flow model with optional scenario configurations</p>
        {backendUrl && (
          <p className="text-sm text-gray-500 mt-1">Backend: {backendUrl}</p>
        )}
      </div>

      {/* Status Bar */}
      <div className={`mb-6 p-4 rounded-lg border flex items-center justify-between ${getStatusColor()}`}>
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <div className="font-medium capitalize">{status}</div>
            {getDuration() !== null && (
              <div className="text-sm">
                Duration: {getDuration()}s
              </div>
            )}
            {status === 'running' && (
              <div className="text-sm">
                Current Run Time: {currentRunTime}s
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearLogs}
            disabled={isRunning}
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Clear Logs
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            <span>Advanced</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Model Configuration</h2>

            {/* Basic Controls */}
            <div className="space-y-4">

              {/* Price Curve Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Curve
                </label>
                <select
                  value={selectedPriceCurve}
                  onChange={(e) => setSelectedPriceCurve(e.target.value)}
                  disabled={isRunning || isLoadingCurves}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                >
                  {isLoadingCurves ? (
                    <option>Loading curves...</option>
                  ) : priceCurves.length === 0 ? (
                    <option value="">No curves found</option>
                  ) : (
                    priceCurves.map((curve) => (
                      <option key={curve} value={curve}>
                        {curve}
                      </option>
                    ))
                  )}
                </select>
                <div className="mt-1 flex justify-between">
                  <p className="text-xs text-gray-500">
                    Select the market price scenario.
                  </p>

                </div>
              </div>


              {/* Advanced Options */}
              {showAdvanced && (
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Advanced Options</h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={runSensitivity}
                        onChange={(e) => setRunSensitivity(e.target.checked)}
                        disabled={isRunning}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">Run sensitivity analysis after main model</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">
                      This will run multiple scenarios based on sensitivity_config.json
                    </p>
                    {sensitivityConfig && (
                      <div className="mt-4 p-3 bg-gray-100 rounded-md text-xs font-mono overflow-auto max-h-48">
                        <h4 className="font-semibold mb-2">Current Sensitivity Config:</h4>
                        <pre>{JSON.stringify(sensitivityConfig, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 space-y-2">
                <button
                  onClick={() => runModel({ priceCurve: selectedPriceCurve })}
                  disabled={isRunning || (priceCurves.length === 0 && !isLoadingCurves)} // Disable if no curves? Or allow default? The user said "Before i had no selection - just 1 price cruve in the mongo db". I should probably allow it if user wants to try default behavior, but modifying backend to FAIL if no curve is selected suggests I should maybe force selection. But backend has "if no price curve specified... defaulting". So safe to enable. 
                  // Actually, to be safe and clear, let's keep it enabled but warn if empty.
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Running Base Model...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Run Base Model</span>
                    </>
                  )}
                </button>

                {baseResultsExist && (
                  <button
                    onClick={runSensitivityAnalysis}
                    disabled={isRunning}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Running Sensitivity...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Run Sensitivity Analysis</span>
                      </>
                    )}
                  </button>
                )}

                {isRunning && (
                  <button
                    onClick={stopModel}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    <Square className="w-4 h-4" />
                    <span>Stop (UI Only)</span>
                  </button>
                )}
              </div>

              {/* Quick Info */}
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-700 mb-2">What this does:</h3>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Loads asset data from MongoDB</li>
                  <li>• Calculates revenue, OPEX, and CAPEX</li>
                  <li>• Sizes debt based on DSCR constraints</li>
                  <li>• Generates cash flow projections</li>
                  <li>• Calculates portfolio IRR</li>
                  <li>• Saves results to MongoDB</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Logs Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Console Output</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <FileText className="w-4 h-4" />
                  <span>{logs.length} logs</span>
                </div>
              </div>
            </div>

            <div className="h-96 overflow-y-auto p-4 bg-gray-900 text-green-400 font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  <div className="mb-4">
                    <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  </div>
                  <p>No logs yet. Click "Run Cash Flow Model" to start.</p>
                  <p className="text-xs mt-2">The model will execute on the backend and show progress here.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-2">
                      <span className="text-gray-500 text-xs whitespace-nowrap font-sans">
                        {log.timestamp}
                      </span>
                      <span className={`flex-1 ${log.type === 'error' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-yellow-400' :
                          log.type === 'success' ? 'text-green-400' :
                            'text-gray-300'
                        }`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Result Summary */}
      {status === 'success' && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900">Model Run Completed Successfully</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <div className="text-gray-600">Duration</div>
              <div className="font-semibold text-gray-900">{getDuration()}s</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-gray-600">Scenario ID</div>
              <div className="font-semibold text-gray-900">{scenarioId || 'Base Case'}</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-gray-600">Next Steps</div>
              <div className="font-semibold text-gray-900">Check Dashboard for Results</div>
            </div>
          </div>
        </div>
      )}

      {/* Error Summary */}
      {status === 'error' && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Model Run Failed</h3>
          </div>
          <div className="text-sm text-red-700">
            <p className="mb-2">Check the console output above for detailed error information.</p>
            <p>Common issues:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Backend service not responding</li>
              <li>Invalid scenario file path</li>
              <li>Database connection issues</li>
              <li>Missing asset data or configuration</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default RunModelPage;