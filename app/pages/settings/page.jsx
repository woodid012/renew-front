'use client'

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Settings, Sliders, DollarSign, FileText, Users, Shield, Play, Loader2, CheckCircle, AlertCircle, Folder, Edit, Save, X } from 'lucide-react';

export default function SettingsPage() {
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/df963f91-bb06-4307-981b-f90593255e96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/pages/settings/page.jsx:7',message:'SettingsPage component mounted',data:{timestamp:Date.now(),pathname:typeof window !== 'undefined' ? window.location.pathname : 'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  }, []);
  // #endregion
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runStatus, setRunStatus] = useState({});
  const [portfolios, setPortfolios] = useState([]);
  const [currentPortfolio, setCurrentPortfolio] = useState(null);
  const [editingPortfolioId, setEditingPortfolioId] = useState(null);
  const [editingPortfolioName, setEditingPortfolioName] = useState('');
  const [savingPortfolioId, setSavingPortfolioId] = useState(null);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/df963f91-bb06-4307-981b-f90593255e96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/pages/settings/page.jsx:13',message:'fetchPortfolios useEffect triggered',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Fetch portfolios on mount
    const fetchPortfolios = async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/df963f91-bb06-4307-981b-f90593255e96',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/pages/settings/page.jsx:17',message:'About to fetch portfolios',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const response = await fetch('/api/list-portfolios');
        const data = await response.json();
        if (data.success && Array.isArray(data.portfolios)) {
          // Store full portfolio objects (with name, title, and unique_id)
          const portfolioObjects = data.portfolios.map(p => 
            typeof p === 'string' 
              ? { name: p, title: p, unique_id: p } 
              : { name: p.name, title: p.title || p.name, unique_id: p.unique_id }
          );
          setPortfolios(portfolioObjects);
        }
      } catch (error) {
        console.error('Failed to fetch portfolios:', error);
      }
    };
    fetchPortfolios();

    // Listen for portfolio refresh events (e.g., when portfolio name is updated elsewhere)
    const handlePortfolioRefresh = () => {
      fetchPortfolios();
    };

    window.addEventListener('refreshPortfolios', handlePortfolioRefresh);
    return () => {
      window.removeEventListener('refreshPortfolios', handlePortfolioRefresh);
    };
  }, []);

  const handleEditPortfolio = (portfolio) => {
    const portfolioName = typeof portfolio === 'string' ? portfolio : portfolio.name;
    const portfolioTitle = typeof portfolio === 'string' ? portfolio : (portfolio.title || portfolio.name);
    const uniqueId = typeof portfolio === 'string' ? portfolio : portfolio.unique_id;
    setEditingPortfolioId(uniqueId);
    setEditingPortfolioName(portfolioTitle);
  };

  const handleSavePortfolio = async (uniqueId) => {
    if (!editingPortfolioName.trim()) {
      alert('Portfolio name cannot be empty');
      return;
    }

    setSavingPortfolioId(uniqueId);
    try {
      const response = await fetch('/api/update-platform-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          unique_id: uniqueId, 
          platformName: editingPortfolioName.trim() 
        })
      });

      const data = await response.json();
      if (data.success) {
        setEditingPortfolioId(null);
        setEditingPortfolioName('');
        // Dispatch custom events to notify other pages
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('portfolioNameUpdated', { 
            detail: { unique_id: uniqueId, platformName: editingPortfolioName.trim() } 
          }));
          // Trigger PortfolioContext refresh so dropdown updates
          window.dispatchEvent(new CustomEvent('refreshPortfolios'));
        }
        // Refresh portfolio list
        const fetchResponse = await fetch('/api/list-portfolios');
        const fetchData = await fetchResponse.json();
        if (fetchData.success && Array.isArray(fetchData.portfolios)) {
          const portfolioObjects = fetchData.portfolios.map(p => 
            typeof p === 'string' 
              ? { name: p, title: p, unique_id: p } 
              : { name: p.name, title: p.title || p.name, unique_id: p.unique_id }
          );
          setPortfolios(portfolioObjects);
        }
      } else {
        alert('Failed to update portfolio name: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating portfolio name:', error);
      alert('Failed to update portfolio name: ' + error.message);
    } finally {
      setSavingPortfolioId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingPortfolioId(null);
    setEditingPortfolioName('');
  };

  const runModelForPortfolio = async (portfolioName) => {
    try {
      // Determine backend URL
      const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const backendUrl = isDevelopment 
        ? process.env.NEXT_PUBLIC_LOCAL_BACKEND_URL || 'http://localhost:10000'
        : process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-renew.onrender.com';
      
      const apiEndpoint = backendUrl
        ? `${backendUrl}/api/run-model`
        : '/api/run-model';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolio: portfolioName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  };

  const runAllPortfolios = async () => {
    if (isRunningAll) return;

    setIsRunningAll(true);
    setCurrentPortfolio(null);
    const status = {};

    // Initialize status for all portfolios
    portfolios.forEach(portfolio => {
      const portfolioName = typeof portfolio === 'string' ? portfolio : portfolio.name;
      status[portfolioName] = { status: 'pending', message: 'Waiting...' };
    });
    setRunStatus(status);

    try {
      for (const portfolio of portfolios) {
        const portfolioName = typeof portfolio === 'string' ? portfolio : portfolio.name;
        const portfolioTitle = typeof portfolio === 'string' ? portfolio : (portfolio.title || portfolio.name);
        setCurrentPortfolio(portfolioTitle);
        status[portfolioName] = { status: 'running', message: 'Running...' };
        setRunStatus({ ...status });

        try {
          const result = await runModelForPortfolio(portfolioName);
          if (result.status === 'success') {
            status[portfolioName] = { status: 'success', message: result.message || 'Completed successfully' };
          } else {
            status[portfolioName] = { status: 'error', message: result.message || 'Failed' };
          }
        } catch (error) {
          status[portfolioName] = { status: 'error', message: error.message || 'Error occurred' };
        }
        setRunStatus({ ...status });
      }
    } catch (error) {
      console.error('Error running all portfolios:', error);
    } finally {
      setIsRunningAll(false);
      setCurrentPortfolio(null);
    }
  };

  const settingsSections = [
    {
      title: 'Asset Defaults',
      description: 'Configure default values for solar, wind, and storage assets',
      href: '/pages/settings/asset-defaults',
      icon: Sliders,
      color: 'green'
    },
    {
      title: 'Model Defaults',
      description: 'Configure model start date, debt settings, tax rate, and other calculation defaults',
      href: '/pages/settings/model-defaults',
      icon: FileText,
      color: 'orange'
    },
    {
      title: 'Display Settings',
      description: 'Configure currency display format and other display preferences',
      href: '/pages/settings/display',
      icon: DollarSign,
      color: 'purple'
    },
    {
      title: 'Administrator',
      description: 'Manage accounts and user access controls',
      href: '/pages/settings/administrator',
      icon: Shield,
      color: 'blue'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="w-8 h-8 text-gray-700" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">
            Manage platform configuration and default values
          </p>
        </div>

        {/* Portfolios Section - Top Level */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Folder className="w-6 h-6 text-gray-700" />
            <h2 className="text-2xl font-semibold text-gray-900">Portfolios</h2>
          </div>
          {portfolios.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolios.map((portfolio) => {
                const portfolioName = typeof portfolio === 'string' ? portfolio : portfolio.name;
                const portfolioTitle = typeof portfolio === 'string' ? portfolio : (portfolio.title || portfolio.name);
                const uniqueId = typeof portfolio === 'string' ? portfolio : portfolio.unique_id;
                return (
                  <div
                    key={portfolioName}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingPortfolioId === uniqueId ? (
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="text"
                              value={editingPortfolioName}
                              onChange={(e) => setEditingPortfolioName(e.target.value)}
                              className="flex-1 px-2 py-1 text-lg font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSavePortfolio(uniqueId);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              autoFocus
                              disabled={savingPortfolioId === uniqueId}
                            />
                            <button
                              onClick={() => handleSavePortfolio(uniqueId)}
                              disabled={savingPortfolioId === uniqueId}
                              className="px-2 py-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md disabled:opacity-50"
                              title="Save"
                            >
                              {savingPortfolioId === uniqueId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={savingPortfolioId === uniqueId}
                              className="px-2 py-1 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md disabled:opacity-50"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {portfolioTitle}
                            </h3>
                            <button
                              onClick={() => handleEditPortfolio(portfolio)}
                              className="ml-2 p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              title="Edit portfolio name"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-gray-500">Unique ID:</span>
                            <span className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                              {uniqueId}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-500">No portfolios found. Please ensure portfolios are configured.</p>
            </div>
          )}
        </div>

        {/* Settings Sections */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Configuration</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            const colorClasses = {
              green: 'bg-green-100 text-green-600',
              orange: 'bg-orange-100 text-orange-600',
              purple: 'bg-purple-100 text-purple-600',
              blue: 'bg-blue-100 text-blue-600'
            };
            const iconClass = colorClasses[section.color] || 'bg-gray-100 text-gray-600';
            return (
              <Link
                key={section.href}
                href={section.href}
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${iconClass}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {section.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Run All Portfolios Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Run Model for All Portfolios</h2>
              <p className="text-sm text-gray-600 mt-1">
                Execute the cash flow model for all available portfolios sequentially
              </p>
            </div>
            <button
              onClick={runAllPortfolios}
              disabled={isRunningAll || portfolios.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunningAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run All Portfolios</span>
                </>
              )}
            </button>
          </div>

          {portfolios.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600 mb-2">
                Portfolios: {portfolios.map(p => typeof p === 'string' ? p : (p.title || p.name)).join(', ')}
              </div>
              
              {currentPortfolio && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-sm font-medium text-blue-900">
                      Currently running: {currentPortfolio}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {portfolios.map((portfolio) => {
                  const portfolioName = typeof portfolio === 'string' ? portfolio : portfolio.name;
                  const portfolioTitle = typeof portfolio === 'string' ? portfolio : (portfolio.title || portfolio.name);
                  const status = runStatus[portfolioName] || { status: 'pending', message: 'Not started' };
                  const getStatusIcon = () => {
                    switch (status.status) {
                      case 'running':
                        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
                      case 'success':
                        return <CheckCircle className="w-4 h-4 text-green-500" />;
                      case 'error':
                        return <AlertCircle className="w-4 h-4 text-red-500" />;
                      default:
                        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
                    }
                  };
                  
                  const getStatusColor = () => {
                    switch (status.status) {
                      case 'running':
                        return 'bg-blue-50 border-blue-200';
                      case 'success':
                        return 'bg-green-50 border-green-200';
                      case 'error':
                        return 'bg-red-50 border-red-200';
                      default:
                        return 'bg-gray-50 border-gray-200';
                    }
                  };

                  return (
                    <div
                      key={portfolioName}
                      className={`p-3 rounded-md border ${getStatusColor()} transition-colors`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon()}
                          <span className="font-medium text-gray-900">{portfolioTitle}</span>
                        </div>
                        <span className="text-sm text-gray-600">{status.message}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {portfolios.length === 0 && !isRunningAll && (
            <div className="text-sm text-gray-500 text-center py-4">
              No portfolios found. Please ensure portfolios are configured.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
