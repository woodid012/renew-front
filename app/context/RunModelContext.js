// frontend-renew/app/context/RunModelContext.js
'use client'

import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { usePortfolio } from './PortfolioContext';

const RunModelContext = createContext(null);

export const RunModelProvider = ({ children }) => {
  const { selectedPortfolio, getPortfolioUniqueId } = usePortfolio();
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
          // Don't show as error - this might be expected if backend isn't ready
          console.warn('Could not load sensitivity config:', sensConfigResponse.status);
          return;
        }
        const config = await sensConfigResponse.json();
        setSensitivityConfig(config);
        addLog('Sensitivity config loaded.', 'info');

        // Check if base results exist
        const baseResultsResponse = await fetch('/api/check-base-results');
        if (!baseResultsResponse.ok) {
          // Don't show as error - this might be expected if backend isn't ready
          console.warn('Could not check base results:', baseResultsResponse.status);
          return;
        }
        const baseResultsData = await baseResultsResponse.json();
        setBaseResultsExist(baseResultsData.exists);
        if (baseResultsData.exists) {
          addLog('Base model results found in database.', 'info');
        } else {
          addLog('No base model results found in database.', 'warning');
        }

      } catch (error) {
        // Only log to console, don't show as error in UI
        console.warn('Initial data fetch failed (this may be expected):', error.message);
      }
    };

    fetchInitialData();
  }, []); // Empty dependency array to run only once on mount

  const runModel = async (options = {}) => {
    if (isRunning) return;

    const { priceCurve } = options;

    setIsRunning(true);
    setStatus('running');
    setStartTime(new Date());
    setEndTime(null);

    addLog('Starting base model run...', 'info');

    try {
      // Use Next.js API route (which proxies to local backend) or direct backend URL
      const apiEndpoint = backendUrl
        ? `${backendUrl}/api/run-model-stream`
        : '/api/run-model-stream';

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

      addLog('Connecting to model stream...', 'info');

      // Get unique_id from PortfolioContext (selectedPortfolio is already the unique_id)
      const uniqueId = getPortfolioUniqueId(selectedPortfolio) || selectedPortfolio || 'ZEBRE';
      addLog(`Selected portfolio: ${selectedPortfolio}`, 'info');
      addLog(`Using unique_id: ${uniqueId}`, 'info');

      if (priceCurve) {
        addLog(`Using price curve: ${priceCurve}`, 'info');
      } else {
        addLog(`No price curve selected, will use backend default`, 'warning');
      }

      // Use EventSource for SSE
      return new Promise((resolve, reject) => {
        // First, send POST request to start the stream
        fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            portfolio: uniqueId,
            price_curve: priceCurve
          }),
        }).then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          // Read the stream
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const readStream = () => {
            reader.read().then(({ done, value }) => {
              if (done) {
                setStatus('success');
                setBaseResultsExist(true);
                setEndTime(new Date());
                setIsRunning(false);
                resolve();
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep incomplete line in buffer

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    addLog(data.message, data.type || 'info');

                    if (data.type === 'error') {
                      setStatus('error');
                      setEndTime(new Date());
                      setIsRunning(false);
                      reject(new Error(data.message));
                      return;
                    }
                  } catch (e) {
                    // Ignore parse errors for keepalive messages
                  }
                }
              }

              readStream();
            }).catch(error => {
              addLog(`❌ Stream error: ${error.message}`, 'error');
              setStatus('error');
              setEndTime(new Date());
              setIsRunning(false);
              reject(error);
            });
          };

          readStream();
        }).catch(error => {
          addLog(`❌ Error: ${error.message}`, 'error');
          setStatus('error');
          setEndTime(new Date());
          setIsRunning(false);
          reject(error);
        });
      });

    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      setStatus('error');
      setEndTime(new Date());
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
        ? `${backendUrl}/api/sensitivity-stream`
        : '/api/run-sensitivity-stream';

      addLog('Connecting to sensitivity stream...', 'info');

      // Get unique_id from PortfolioContext
      const uniqueId = getPortfolioUniqueId(selectedPortfolio) || selectedPortfolio || 'ZEBRE';

      // Use fetch with streaming for SSE
      return new Promise((resolve, reject) => {
        fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config_file: 'config/sensitivity_config.json',
            prefix: 'sensitivity_results',
            portfolio: uniqueId
          }),
        }).then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          // Read the stream
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const readStream = () => {
            reader.read().then(({ done, value }) => {
              if (done) {
                setStatus('success');
                setEndTime(new Date());
                setIsRunning(false);
                resolve();
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep incomplete line in buffer

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    addLog(data.message, data.type || 'info');

                    if (data.type === 'error') {
                      setStatus('error');
                      setEndTime(new Date());
                      setIsRunning(false);
                      reject(new Error(data.message));
                      return;
                    }
                  } catch (e) {
                    // Ignore parse errors for keepalive messages
                  }
                }
              }

              readStream();
            }).catch(error => {
              addLog(`❌ Stream error: ${error.message}`, 'error');
              setStatus('error');
              setEndTime(new Date());
              setIsRunning(false);
              reject(error);
            });
          };

          readStream();
        }).catch(error => {
          addLog(`❌ Error: ${error.message}`, 'error');
          setStatus('error');
          setEndTime(new Date());
          setIsRunning(false);
          reject(error);
        });
      });

    } catch (sensitivityError) {
      addLog(`❌ Error during sensitivity analysis: ${sensitivityError.message}`, 'error');
      setStatus('error');
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
