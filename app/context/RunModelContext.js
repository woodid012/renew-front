// frontend-renew/app/context/RunModelContext.js
'use client'

import React, { createContext, useState, useContext, useRef, useEffect } from 'react';

const RunModelContext = createContext(null);

export const RunModelProvider = ({ children }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('ready'); // 'ready', 'running', 'success', 'error'
  const [scenarioId, setScenarioId] = useState('Base Case'); // Default to 'Base Case'
  const [baseResultsExist, setBaseResultsExist] = useState(false);
  const [runSensitivity, setRunSensitivity] = useState(false);
  const [sensitivityConfig, setSensitivityConfig] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [currentRunTime, setCurrentRunTime] = useState(0); // In seconds
  const [backendUrl, setBackendUrl] = useState('');

  // Timer for current run time
  useEffect(() => {
    let timer;
    if (isRunning && startTime) {
      timer = setInterval(() => {
        setCurrentRunTime(Math.round((new Date() - startTime) / 1000));
      }, 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isRunning, startTime]);

  const logsEndRef = useRef(null);

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

  // Get backend URL and check base results on component mount
  useEffect(() => {
    // Use Next.js API route for local development, direct URL for production
    const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const url = isDevelopment
      ? '' // Use relative path to Next.js API route
      : (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-renew.onrender.com');
    setBackendUrl(url);
    addLog(`Backend mode: ${isDevelopment ? 'Local (via Next.js API)' : 'Remote'}`, 'info');

    const fetchInitialData = async () => {
      try {
        // Fetch sensitivity config
        const sensConfigResponse = await fetch('/api/get-sensitivity-config');
        if (!sensConfigResponse.ok) {
          throw new Error(`HTTP error! status: ${sensConfigResponse.status}`);
        }
        const config = await sensConfigResponse.json();
        setSensitivityConfig(config);
        addLog('Sensitivity config loaded.', 'info');

        // Check if base results exist
        const baseResultsResponse = await fetch('/api/check-base-results');
        if (!baseResultsResponse.ok) {
          throw new Error(`HTTP error! status: ${baseResultsResponse.status}`);
        }
        const baseResultsData = await baseResultsResponse.json();
        setBaseResultsExist(baseResultsData.exists);
        if (baseResultsData.exists) {
          addLog('Base model results found in database.', 'info');
        } else {
          addLog('No base model results found in database.', 'warning');
        }

      } catch (error) {
        addLog(`Error fetching initial data: ${error.message}`, 'error');
      }
    };

    fetchInitialData();
  }, []); // Empty dependency array to run only once on mount

  const runModel = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setStatus('running');
    setStartTime(new Date());
    setEndTime(null);

    addLog('Starting base model run...', 'info');

    try {
      // Use Next.js API route (which proxies to local backend) or direct backend URL
      const apiEndpoint = backendUrl
        ? `${backendUrl}/api/run-model`
        : '/api/run-model';

      // Check backend status if using direct URL
      if (backendUrl) {
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
        addLog(`Model imports available: ${Object.entries(imports).map(([k, v]) => `${k}:${v}`).join(', ')}`, 'info');

        if (!imports.run_cashflow_model) {
          throw new Error('Backend model functionality not available - import failed');
        }
      } else {
        addLog('Using local backend via Next.js API route...', 'info');
      }

      addLog('Sending request to run cash flow model (base case)...', 'info');

      // Get selected portfolio
      const selectedPortfolio = localStorage.getItem('selectedPortfolio') || 'ZEBRE';
      addLog(`Selected portfolio: ${selectedPortfolio}`, 'info');

      // Make API call to run the model (via Next.js API route or direct)
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolio: selectedPortfolio
        }), // Include portfolio in payload
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
        addLog('✅ Base model run completed successfully!', 'success');
        addLog(`Result: ${result.message}`, 'success');
        setStatus('success');
        setBaseResultsExist(true); // Base results now exist
      } else {
        addLog(`❌ Base model run failed: ${result.message}`, 'error');
        setStatus('error');
      }

      setEndTime(new Date());

    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      setStatus('error');
      setEndTime(new Date());
    } finally {
      setIsRunning(false);
    }
  };

  const runSensitivityAnalysis = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setStatus('running');
    setStartTime(new Date());
    setEndTime(null);

    addLog('Starting sensitivity analysis...', 'info');

    try {
      // Use Next.js API route (which proxies to local backend) or direct backend URL
      const apiEndpoint = backendUrl
        ? `${backendUrl}/api/sensitivity`
        : '/api/run-sensitivity';

      addLog('Sending request to run sensitivity analysis...', 'info');

      const sensitivityResponse = await fetch(apiEndpoint, {
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
        let errorMessage = `HTTP ${sensitivityResponse.status}: ${sensitivityResponse.statusText}`;
        try {
          const errorData = await sensitivityResponse.json();
          errorMessage = errorData.message || errorMessage;
          addLog(`API Error Details: ${JSON.stringify(errorData)}`, 'error');
        } catch (parseError) {
          const errorText = await sensitivityResponse.text();
          errorMessage = errorText || errorMessage;
          addLog(`Raw Error Response: ${errorText}`, 'error');
        }
        throw new Error(errorMessage);
      } else {
        const sensitivityResult = await sensitivityResponse.json();
        if (sensitivityResult.status === 'success') {
          addLog('✅ Sensitivity analysis completed!', 'success');
          addLog(`Sensitivity result: ${sensitivityResult.message}`, 'success');
          setStatus('success');
        } else {
          addLog(`❌ Sensitivity analysis failed: ${sensitivityResult.message}`, 'error');
          setStatus('error');
        }
      }
    } catch (sensitivityError) {
      addLog(`❌ Error during sensitivity analysis: ${sensitivityError.message}`, 'error');
      setStatus('error');
    } finally {
      setIsRunning(false);
      setEndTime(new Date());
    }
  };

  const stopModel = () => {
    // Note: This won't actually stop the backend process, just the UI state
    setIsRunning(false);
    setStatus('ready');
    addLog('⚠️ Model run stopped by user', 'warning');
  };

  const getDuration = () => {
    if (!startTime) return null;
    const end = endTime || new Date();
    const duration = Math.round((end - startTime) / 1000);
    return duration;
  };

  const value = {
    isRunning,
    setIsRunning,
    logs,
    setLogs,
    status,
    setStatus,
    scenarioId,
    setScenarioId,
    runSensitivity,
    setRunSensitivity,
    sensitivityConfig,
    setSensitivityConfig,
    showAdvanced,
    setShowAdvanced,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    currentRunTime,
    setCurrentRunTime,
    backendUrl,
    setBackendUrl,
    addLog,
    clearLogs,
    runModel,
    runSensitivityAnalysis,
    stopModel,
    getDuration,
    logsEndRef,
    baseResultsExist
  };

  return (
    <RunModelContext.Provider value={value}>
      {children}
    </RunModelContext.Provider>
  );
};

export const useRunModel = () => {
  const context = useContext(RunModelContext);
  if (context === undefined) {
    throw new Error('useRunModel must be used within a RunModelProvider');
  }
  return context;
};
