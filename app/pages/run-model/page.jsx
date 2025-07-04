// app/pages/run-model/page.jsx
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, AlertCircle, CheckCircle, Loader2, Settings, FileText } from 'lucide-react';

const RunModelPage = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('ready'); // 'ready', 'running', 'success', 'error'
  const [scenarioFile, setScenarioFile] = useState('');
  const [scenarioId, setScenarioId] = useState('');
  const [runSensitivity, setRunSensitivity] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [backendUrl, setBackendUrl] = useState('');
  const logsEndRef = useRef(null);

  // Get backend URL on component mount
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-renew.onrender.com';
    setBackendUrl(url);
    addLog(`Backend URL: ${url}`, 'info');
  }, []);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { 
      id: Date.now() + Math.random(), 
      message, 
      type, 
      timestamp 
    }]);
  };

  const clearLogs = () => {
    setLogs([]);
    setStatus('ready');
    setStartTime(null);
    setEndTime(null);
  };

  const runModel = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setStatus('running');
    setStartTime(new Date());
    setEndTime(null);
    
    addLog('Starting model run...', 'info');
    
    try {
      // First, check backend status
      addLog('Checking backend status...', 'info');
      
      const statusResponse = await fetch(`${backendUrl}/`);
      if (!statusResponse.ok) {
        throw new Error(`Backend is not accessible (HTTP ${statusResponse.status})`);
      }
      
      const statusData = await statusResponse.json();
      addLog(`Backend status: ${statusData.status}`, 'success');
      addLog(`Connected to database: ${statusData.mongo_db}`, 'info');
      
      // Check import status
      const imports = statusData.imports || {};
      addLog(`Model imports available: ${Object.entries(imports).map(([k,v]) => `${k}:${v}`).join(', ')}`, 'info');
      
      if (!imports.run_cashflow_model) {
        throw new Error('Backend model functionality not available - import failed');
      }
      
      // Prepare request payload
      const payload = {};
      
      if (scenarioFile.trim()) {
        payload.scenario_file = scenarioFile.trim();
        addLog(`Using scenario file: ${scenarioFile}`, 'info');
      }
      
      if (scenarioId.trim()) {
        payload.scenario_id = scenarioId.trim();
        addLog(`Using scenario ID: ${scenarioId}`, 'info');
      }

      addLog('Sending request to run cash flow model...', 'info');
      addLog(`Request payload: ${JSON.stringify(payload)}`, 'info');

      // Make API call to run the model
      const response = await fetch(`${backendUrl}/api/run-model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      addLog(`Model API response status: ${response.status}`, 'info');

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          addLog(`API Error Details: ${JSON.stringify(errorData)}`, 'error');
        } catch (parseError) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
          addLog(`Raw Error Response: ${errorText}`, 'error');
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      addLog(`Model API response: ${JSON.stringify(result)}`, 'info');
      
      if (result.status === 'success') {
        addLog('✅ Model run completed successfully!', 'success');
        addLog(`Result: ${result.message}`, 'success');
        setStatus('success');
      } else {
        addLog(`❌ Model run failed: ${result.message}`, 'error');
        setStatus('error');
      }
      
      setEndTime(new Date());

      // Run sensitivity analysis if requested
      if (runSensitivity && result.status === 'success') {
        addLog('Starting sensitivity analysis...', 'info');
        
        try {
          const sensitivityResponse = await fetch(`${backendUrl}/api/sensitivity`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              config_file: 'config/sensitivity_config.json',
              prefix: 'sensitivity_results'
            }),
          });

          if (!sensitivityResponse.ok) {
            try {
              const errorData = await sensitivityResponse.json();
              addLog(`⚠️ Sensitivity analysis failed: ${errorData.message}`, 'warning');
            } catch (parseError) {
              addLog(`⚠️ Sensitivity analysis failed: HTTP ${sensitivityResponse.status}`, 'warning');
            }
          } else {
            const sensitivityResult = await sensitivityResponse.json();
            if (sensitivityResult.status === 'success') {
              addLog('✅ Sensitivity analysis completed!', 'success');
              addLog(`Sensitivity result: ${sensitivityResult.message}`, 'success');
            } else {
              addLog(`⚠️ Sensitivity analysis failed: ${sensitivityResult.message}`, 'warning');
            }
          }
        } catch (sensitivityError) {
          addLog(`⚠️ Sensitivity analysis error: ${sensitivityError.message}`, 'warning');
        }
      }

    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      setStatus('error');
      setEndTime(new Date());
    } finally {
      setIsRunning(false);
    }
  };

  const stopModel = () => {
    // Note: This won't actually stop the backend process, just the UI state
    setIsRunning(false);
    setStatus('ready');
    addLog('⚠️ Model run stopped by user', 'warning');
  };

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

  const getDuration = () => {
    if (!startTime) return null;
    const end = endTime || new Date();
    const duration = Math.round((end - startTime) / 1000);
    return duration;
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
            {getDuration() && (
              <div className="text-sm">
                Duration: {getDuration()}s
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scenario File (Optional)
                </label>
                <input
                  type="text"
                  value={scenarioFile}
                  onChange={(e) => setScenarioFile(e.target.value)}
                  placeholder="e.g., scenarios/base_case.json"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={isRunning}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to run base case without scenarios
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scenario ID (Optional)
                </label>
                <input
                  type="text"
                  value={scenarioId}
                  onChange={(e) => setScenarioId(e.target.value)}
                  placeholder="e.g., base_case_2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={isRunning}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier for this model run
                </p>
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
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 space-y-2">
                <button
                  onClick={runModel}
                  disabled={isRunning}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Running Model...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Run Cash Flow Model</span>
                    </>
                  )}
                </button>

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
                      <span className={`flex-1 ${
                        log.type === 'error' ? 'text-red-400' :
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