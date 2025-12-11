'use client';

import { useState, useEffect } from 'react';
import { 
  Download, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Building2,
  TrendingUp,
  Target,
  DollarSign,
  FileText,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ExportDataPage = () => {
  const [assetIds, setAssetIds] = useState([]);
  const [assetIdToNameMap, setAssetIdToNameMap] = useState({});
  const [allAssets, setAllAssets] = useState([]); // Store all assets including individual components
  const [hybridGroups, setHybridGroups] = useState({});
  const [showIndividualAssets, setShowIndividualAssets] = useState(false); // Toggle for grouped/individual view
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState({});
  
  // Summary data states
  const [assetSummary, setAssetSummary] = useState(null);
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [sensitivitySummary, setSensitivitySummary] = useState(null);
  const [forecastSummary, setForecastSummary] = useState(null);
  const [sensitivityConfig, setSensitivityConfig] = useState(null);
  const [showSensitivityConfig, setShowSensitivityConfig] = useState(false);
  const [runningSensitivity, setRunningSensitivity] = useState(false);
  
  // Chart data state
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // Export configuration
  const [assetExportConfig, setAssetExportConfig] = useState({
    assetId: '',
    field: 'revenue',
    period: 'yearly'
  });
  const [portfolioExportConfig, setPortfolioExportConfig] = useState({
    field: 'revenue',
    period: 'yearly'
  });
  const [forecastExportConfig, setForecastExportConfig] = useState({
    assetId: '',
    period: 'yearly'
  });

  const fieldsToPlot = [
    { key: 'revenue', label: 'Total Revenue' },
    { key: 'contractedGreenRevenue', label: 'Contracted Green Revenue' },
    { key: 'contractedEnergyRevenue', label: 'Contracted Energy Revenue' },
    { key: 'merchantGreenRevenue', label: 'Merchant Green Revenue' },
    { key: 'merchantEnergyRevenue', label: 'Merchant Energy Revenue' },
    { key: 'opex', label: 'Operating Expenses' },
    { key: 'capex', label: 'Capital Expenditure' },
    { key: 'cfads', label: 'CFADS' },
    { key: 'debt_service', label: 'Debt Service' },
    { key: 'equity_cash_flow', label: 'Equity Cash Flow' },
    { key: 'net_income', label: 'Net Income' }
  ];

  const periods = [
    { key: 'monthly', label: 'Monthly' },
    { key: 'quarterly', label: 'Quarterly' },
    { key: 'yearly', label: 'Yearly' },
    { key: 'fiscal_yearly', label: 'Fiscal Year' }
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch asset IDs
      const assetResponse = await fetch('/api/output-asset-data');
      if (assetResponse.ok) {
        const assetData = await assetResponse.json();
        
        // Store all assets and hybrid groups
        if (assetData.allAssets) {
          setAllAssets(assetData.allAssets);
        }
        if (assetData.hybridGroups) {
          setHybridGroups(assetData.hybridGroups);
        }
        
        // By default, show grouped assets (hybrid assets combined)
        const displayAssets = assetData.uniqueAssetIds || [];
        const mappedAssets = displayAssets.map(asset => ({ 
          id: asset._id, 
          name: asset.name,
          isHybrid: asset.isHybrid || false,
          hybridGroup: asset.hybridGroup || null,
          componentIds: asset.componentIds || [],
          componentNames: asset.componentNames || []
        }));
        
        setAssetIds(mappedAssets);
        const nameMap = {};
        displayAssets.forEach(asset => {
          nameMap[asset._id] = asset.name;
        });
        setAssetIdToNameMap(nameMap);
        if (mappedAssets.length > 0) {
          setAssetExportConfig(prev => ({ ...prev, assetId: mappedAssets[0].id.toString() }));
          setForecastExportConfig(prev => ({ ...prev, assetId: mappedAssets[0].id.toString() }));
        }
      }

      // Fetch summaries and sensitivity config
      await Promise.all([
        fetchAssetSummary(),
        fetchPortfolioSummary(),
        fetchSensitivitySummary(),
        fetchForecastSummary(),
        fetchSensitivityConfig()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssetSummary = async () => {
    try {
      if (assetExportConfig.assetId) {
        const response = await fetch(
          `/api/output-asset-data?asset_id=${assetExportConfig.assetId}&period=${assetExportConfig.period}`
        );
        if (response.ok) {
          const data = await response.json();
          const assetName = assetIdToNameMap[assetExportConfig.assetId] || 
                           assetIds.find(a => a.id.toString() === assetExportConfig.assetId)?.name || 
                           `Asset ${assetExportConfig.assetId}`;
          setAssetSummary({
            assetId: assetExportConfig.assetId,
            assetName: assetName,
            period: assetExportConfig.period,
            field: assetExportConfig.field,
            recordCount: data.data?.length || 0,
            available: data.data?.length > 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching asset summary:', error);
    }
  };

  const fetchPortfolioSummary = async () => {
    try {
      const response = await fetch(
        `/api/all-assets-summary?period=${portfolioExportConfig.period}&field=${portfolioExportConfig.field}`
      );
      if (response.ok) {
        const data = await response.json();
        const periods = Object.keys(data.data || {});
        setPortfolioSummary({
          period: portfolioExportConfig.period,
          field: portfolioExportConfig.field,
          periodCount: periods.length,
          assetCount: assetIds.length,
          available: periods.length > 0
        });
      }
    } catch (error) {
      console.error('Error fetching portfolio summary:', error);
    }
  };

  const fetchSensitivitySummary = async () => {
    try {
      const response = await fetch('/api/get-sensitivity-output');
      if (response.ok) {
        const data = await response.json();
        setSensitivitySummary({
          recordCount: data.data?.length || 0,
          available: data.data?.length > 0
        });
      }
    } catch (error) {
      console.error('Error fetching sensitivity summary:', error);
    }
  };

  const fetchSensitivityConfig = async () => {
    try {
      const response = await fetch('/api/get-sensitivity-config');
      if (response.ok) {
        const data = await response.json();
        setSensitivityConfig(data);
      }
    } catch (error) {
      console.error('Error fetching sensitivity config:', error);
    }
  };

  const fetchForecastSummary = async () => {
    try {
      if (forecastExportConfig.assetId) {
        const response = await fetch(
          `/api/three-way-forecast?asset_id=${forecastExportConfig.assetId}&period=${forecastExportConfig.period}`
        );
        if (response.ok) {
          const data = await response.json();
          const assetName = assetIdToNameMap[forecastExportConfig.assetId] || 
                           assetIds.find(a => a.id.toString() === forecastExportConfig.assetId)?.name || 
                           `Asset ${forecastExportConfig.assetId}`;
          setForecastSummary({
            assetId: forecastExportConfig.assetId,
            assetName: assetName,
            period: forecastExportConfig.period,
            recordCount: data.data?.length || 0,
            available: data.data?.length > 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching forecast summary:', error);
    }
  };

  useEffect(() => {
    if (assetExportConfig.assetId) {
      fetchAssetSummary();
    }
  }, [assetExportConfig]);

  useEffect(() => {
    fetchPortfolioSummary();
  }, [portfolioExportConfig]);

  useEffect(() => {
    if (forecastExportConfig.assetId) {
      fetchForecastSummary();
    }
  }, [forecastExportConfig]);

  // Fetch chart data combining asset and portfolio
  const fetchChartData = async () => {
    if (!assetExportConfig.assetId || !assetExportConfig.field || !assetExportConfig.period) {
      setChartData([]);
      return;
    }

    setLoadingChart(true);
    try {
      // Fetch asset data
      const assetResponse = await fetch(
        `/api/output-asset-data?asset_id=${assetExportConfig.assetId}&period=${assetExportConfig.period}`
      );
      
      // Fetch portfolio data
      const portfolioResponse = await fetch(
        `/api/all-assets-summary?period=${assetExportConfig.period}&field=${assetExportConfig.field}`
      );

      const assetData = assetResponse.ok ? await assetResponse.json() : { data: [] };
      const portfolioData = portfolioResponse.ok ? await portfolioResponse.json() : { data: {} };

      // Process asset data
      const assetRecords = assetData.data || [];
      const assetName = assetIdToNameMap[assetExportConfig.assetId] || 
                       assetIds.find(a => a.id.toString() === assetExportConfig.assetId)?.name || 
                       `Asset ${assetExportConfig.assetId}`;

      // Process portfolio data
      const portfolioRecords = portfolioData.data || {};
      
      // Combine data by period
      const periodMap = new Map();
      
      // Add asset data
      assetRecords.forEach(item => {
        const period = getPeriodLabel(item, assetExportConfig.period);
        if (!periodMap.has(period)) {
          periodMap.set(period, { period, asset: 0, portfolio: 0 });
        }
        periodMap.get(period).asset = item[assetExportConfig.field] || 0;
      });

      // Add portfolio data
      Object.entries(portfolioRecords).forEach(([period, value]) => {
        if (!periodMap.has(period)) {
          periodMap.set(period, { period, asset: 0, portfolio: 0 });
        }
        // Portfolio data is an object with asset IDs as keys, sum them up
        const portfolioTotal = typeof value === 'object' && value !== null
          ? Object.values(value).reduce((sum, val) => sum + (Number(val) || 0), 0)
          : (Number(value) || 0);
        periodMap.get(period).portfolio = portfolioTotal;
      });

      // Convert to array and sort by period
      const chartDataArray = Array.from(periodMap.values())
        .sort((a, b) => a.period.localeCompare(b.period))
        .map(item => ({
          period: item.period,
          Asset: item.asset,
          Portfolio: item.portfolio
        }));

      setChartData(chartDataArray);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartData([]);
    } finally {
      setLoadingChart(false);
    }
  };

  useEffect(() => {
    fetchChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetExportConfig.assetId, assetExportConfig.field, assetExportConfig.period]);

  // Export functions
  const exportAssetData = async () => {
    if (!assetExportConfig.assetId) {
      alert('Please select an asset');
      return;
    }

    setExporting(prev => ({ ...prev, asset: true }));
    try {
      const response = await fetch(
        `/api/output-asset-data?asset_id=${assetExportConfig.assetId}&period=${assetExportConfig.period}`
      );
      if (!response.ok) throw new Error('Failed to fetch asset data');
      
      const result = await response.json();
      const data = result.data || [];
      
      if (data.length === 0) {
        alert('No data available for export');
        return;
      }

      const fieldData = data.map(item => ({
        Period: getPeriodLabel(item, assetExportConfig.period),
        [fieldsToPlot.find(f => f.key === assetExportConfig.field)?.label || assetExportConfig.field]: item[assetExportConfig.field] || 0
      }));

      const headers = Object.keys(fieldData[0]);
      const csv = [
        headers.join(','),
        ...fieldData.map(row => headers.map(h => {
          const val = row[h];
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(','))
      ].join('\n');

      downloadCSV(csv, `asset_${assetExportConfig.assetId}_${assetExportConfig.field}_${assetExportConfig.period}.csv`);
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(prev => ({ ...prev, asset: false }));
    }
  };

  const exportPortfolioData = async () => {
    setExporting(prev => ({ ...prev, portfolio: true }));
    try {
      const response = await fetch(
        `/api/all-assets-summary?period=${portfolioExportConfig.period}&field=${portfolioExportConfig.field}`
      );
      if (!response.ok) throw new Error('Failed to fetch portfolio data');
      
      const result = await response.json();
      const data = result.data || {};
      
      if (Object.keys(data).length === 0) {
        alert('No data available for export');
        return;
      }

      const periods = Object.keys(data).sort();
      const headers = ['Period', ...assetIds.map(a => assetIdToNameMap[a.id] || `Asset ${a.id}`)];
      const rows = periods.map(period => {
        const row = [period];
        assetIds.forEach(asset => {
          row.push(data[period][asset.id] || 0);
        });
        return row;
      });

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csv, `portfolio_${portfolioExportConfig.field}_${portfolioExportConfig.period}.csv`);
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(prev => ({ ...prev, portfolio: false }));
    }
  };

  const exportCombinedAssetPortfolioData = async () => {
    setExporting(prev => ({ ...prev, combined: true }));
    try {
      // Fetch portfolio data (all assets aggregated)
      const portfolioResponse = await fetch(
        `/api/all-assets-summary?period=${portfolioExportConfig.period}&field=${portfolioExportConfig.field}`
      );
      if (!portfolioResponse.ok) throw new Error('Failed to fetch portfolio data');
      
      const portfolioResult = await portfolioResponse.json();
      const portfolioData = portfolioResult.data || {};
      
      if (Object.keys(portfolioData).length === 0) {
        alert('No data available for export');
        return;
      }

      // Fetch individual asset data for all assets
      const assetDataPromises = assetIds.map(async (asset) => {
        try {
          const response = await fetch(
            `/api/output-asset-data?asset_id=${asset.id}&period=${portfolioExportConfig.period}`
          );
          if (response.ok) {
            const result = await response.json();
            const data = result.data || [];
            return {
              assetId: asset.id,
              assetName: assetIdToNameMap[asset.id] || `Asset ${asset.id}`,
              data: data
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching data for asset ${asset.id}:`, error);
          return null;
        }
      });

      const allAssetData = await Promise.all(assetDataPromises);
      const validAssetData = allAssetData.filter(asset => asset !== null);

      // Get all unique periods from portfolio data
      const periods = Object.keys(portfolioData).sort();
      
      // Build combined CSV
      const fieldLabel = fieldsToPlot.find(f => f.key === portfolioExportConfig.field)?.label || portfolioExportConfig.field;
      
      // Headers: Period, Asset columns, Portfolio Total
      const headers = [
        'Period',
        ...validAssetData.map(a => `${a.assetName} (${fieldLabel})`),
        `Portfolio Total (${fieldLabel})`
      ];

      // Build rows
      const rows = periods.map(period => {
        const row = [period];
        
        // Add individual asset values
        validAssetData.forEach(asset => {
          const assetPeriodData = asset.data.find(item => {
            const periodLabel = getPeriodLabel(item, portfolioExportConfig.period);
            return periodLabel === period;
          });
          const value = assetPeriodData ? (assetPeriodData[portfolioExportConfig.field] || 0) : 0;
          row.push(value);
        });
        
        // Add portfolio total (sum of all assets for this period)
        const portfolioTotal = validAssetData.reduce((sum, asset) => {
          const assetPeriodData = asset.data.find(item => {
            const periodLabel = getPeriodLabel(item, portfolioExportConfig.period);
            return periodLabel === period;
          });
          const value = assetPeriodData ? (assetPeriodData[portfolioExportConfig.field] || 0) : 0;
          return sum + value;
        }, 0);
        row.push(portfolioTotal);
        
        return row;
      });

      const csv = [
        headers.join(','),
        ...rows.map(r => r.map(val => {
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(','))
      ].join('\n');

      downloadCSV(csv, `combined_asset_portfolio_${portfolioExportConfig.field}_${portfolioExportConfig.period}.csv`);
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(prev => ({ ...prev, combined: false }));
    }
  };

  const exportSensitivityData = async () => {
    setExporting(prev => ({ ...prev, sensitivity: true }));
    try {
      const response = await fetch('/api/get-sensitivity-output');
      if (!response.ok) throw new Error('Failed to fetch sensitivity data');
      
      const result = await response.json();
      const data = result.data || [];
      
      if (data.length === 0) {
        alert('No sensitivity data available for export');
        return;
      }

      const headers = data.length > 0 ? Object.keys(data[0]) : [];
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
          const val = row[h];
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val ?? '';
        }).join(','))
      ].join('\n');

      downloadCSV(csv, `sensitivity_analysis_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(prev => ({ ...prev, sensitivity: false }));
    }
  };

  const runSensitivityWithConfig = async () => {
    if (!sensitivityConfig) {
      alert('Please configure sensitivity inputs first');
      return;
    }

    setRunningSensitivity(true);
    try {
      const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const apiEndpoint = isDevelopment 
        ? '/api/run-sensitivity'
        : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-renew.onrender.com'}/api/sensitivity`;

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: sensitivityConfig,
          prefix: 'sensitivity_results'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.status === 'success') {
        alert('✅ Sensitivity analysis completed successfully!');
        // Refresh sensitivity summary
        await fetchSensitivitySummary();
      } else {
        throw new Error(result.message || 'Sensitivity analysis failed');
      }
    } catch (error) {
      alert(`❌ Error running sensitivity analysis: ${error.message}`);
    } finally {
      setRunningSensitivity(false);
    }
  };

  const updateSensitivityParam = (paramName, field, value) => {
    if (!sensitivityConfig) return;
    
    setSensitivityConfig(prev => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      if (!newConfig.sensitivities) {
        newConfig.sensitivities = {};
      }
      if (!newConfig.sensitivities[paramName]) {
        newConfig.sensitivities[paramName] = {};
      }
      
      if (field === 'range') {
        // Handle range as array [min, max]
        const rangeValue = typeof value === 'string' ? value.split(',').map(v => parseFloat(v.trim())) : value;
        newConfig.sensitivities[paramName][field] = rangeValue;
      } else if (field === 'steps' || field === 'base') {
        newConfig.sensitivities[paramName][field] = parseFloat(value) || 0;
      } else {
        newConfig.sensitivities[paramName][field] = value;
      }
      
      return newConfig;
    });
  };

  const toggleSensitivityParam = (paramName) => {
    if (!sensitivityConfig) return;
    
    setSensitivityConfig(prev => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      if (!newConfig.sensitivities) {
        newConfig.sensitivities = {};
      }
      
      if (newConfig.sensitivities[paramName]) {
        // Remove parameter
        delete newConfig.sensitivities[paramName];
      } else {
        // Add parameter with default values
        newConfig.sensitivities[paramName] = {
          type: 'multiplier',
          base: 1.0,
          range: [-0.10, 0.10],
          steps: 3
        };
      }
      
      return newConfig;
    });
  };

  const exportForecastData = async () => {
    if (!forecastExportConfig.assetId) {
      alert('Please select an asset');
      return;
    }

    setExporting(prev => ({ ...prev, forecast: true }));
    try {
      const response = await fetch(
        `/api/three-way-forecast?asset_id=${forecastExportConfig.assetId}&period=${forecastExportConfig.period}`
      );
      if (!response.ok) throw new Error('Failed to fetch forecast data');
      
      const result = await response.json();
      const data = result.data || [];
      
      if (data.length === 0) {
        alert('No forecast data available for export');
        return;
      }

      const allKeys = new Set();
      data.forEach(item => {
        Object.keys(item).forEach(key => allKeys.add(key));
      });
      const headers = Array.from(allKeys).sort();

      const rows = data.map(item => {
        return headers.map(header => {
          const value = item[header];
          if (typeof value === 'number') return value;
          if (typeof value === 'object' && value !== null) return JSON.stringify(value);
          return value ?? '';
        });
      });

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csv, `financial_forecast_${forecastExportConfig.assetId}_${forecastExportConfig.period}.csv`);
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(prev => ({ ...prev, forecast: false }));
    }
  };

  const getPeriodLabel = (item, period) => {
    if (period === 'monthly') {
      return `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
    } else if (period === 'quarterly') {
      return `${item._id.year}-Q${item._id.quarter}`;
    } else if (period === 'yearly') {
      return `${item._id.year}`;
    } else if (period === 'fiscal_yearly') {
      return `FY${item._id.fiscalYear}`;
    }
    return item.date || '';
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const ExportCard = ({ title, description, icon: Icon, summary, available, children, onExport, exportKey, loading: cardLoading }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Icon className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {available ? (
            <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded">
              Available
            </span>
          ) : (
            <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded">
              No Data
            </span>
          )}
        </div>
      </div>

      {summary && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-700 space-y-1">
            {Object.entries(summary).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {children}

      <button
        onClick={onExport}
        disabled={!available || cardLoading || exporting[exportKey]}
        className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {exporting[exportKey] || cardLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>{exporting[exportKey] || cardLoading ? 'Exporting...' : 'Export to CSV'}</span>
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <span className="text-gray-600">Loading export options...</span>
        </div>
      </div>
    );
  }

  // Toggle between grouped and individual asset views
  const toggleAssetView = async () => {
    const newShowIndividual = !showIndividualAssets;
    setShowIndividualAssets(newShowIndividual);
    
    // Rebuild asset list based on view mode
    if (newShowIndividual) {
      // Show individual components
      if (allAssets.length > 0) {
        const individualAssets = allAssets.map(asset => ({
          id: asset._id,
          name: asset.name,
          isHybrid: false,
          hybridGroup: asset.hybridGroup || null
        }));
        setAssetIds(individualAssets);
        const nameMap = {};
        individualAssets.forEach(asset => {
          nameMap[asset.id] = asset.name;
        });
        setAssetIdToNameMap(nameMap);
      } else {
        // Fetch all assets if not already loaded
        const assetResponse = await fetch('/api/output-asset-data');
        if (assetResponse.ok) {
          const assetData = await assetResponse.json();
          if (assetData.allAssets) {
            const individualAssets = assetData.allAssets.map(asset => ({
              id: asset._id,
              name: asset.name,
              isHybrid: false,
              hybridGroup: asset.hybridGroup || null
            }));
            setAssetIds(individualAssets);
            const nameMap = {};
            individualAssets.forEach(asset => {
              nameMap[asset.id] = asset.name;
            });
            setAssetIdToNameMap(nameMap);
          }
        }
      }
    } else {
      // Show grouped (default) - reload from API
      const assetResponse = await fetch('/api/output-asset-data');
      if (assetResponse.ok) {
        const assetData = await assetResponse.json();
        const displayAssets = assetData.uniqueAssetIds || [];
        const mappedAssets = displayAssets.map(asset => ({ 
          id: asset._id, 
          name: asset.name,
          isHybrid: asset.isHybrid || false,
          hybridGroup: asset.hybridGroup || null,
          componentIds: asset.componentIds || [],
          componentNames: asset.componentNames || []
        }));
        setAssetIds(mappedAssets);
        const nameMap = {};
        displayAssets.forEach(asset => {
          nameMap[asset._id] = asset.name;
        });
        setAssetIdToNameMap(nameMap);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Export Center</h1>
          <p className="text-gray-600 mt-2">Export asset, portfolio, sensitivity, and forecast data to CSV</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="text-sm text-gray-700">View Mode:</label>
          <button
            onClick={toggleAssetView}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              showIndividualAssets
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {showIndividualAssets ? 'Individual Assets' : 'Grouped (Hybrid)'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Combined Asset & Portfolio Export with Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Asset & Portfolio Output</h3>
                <p className="text-sm text-gray-600 mt-1">View and export asset and portfolio data</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {(assetSummary?.available || portfolioSummary?.available) ? (
                <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded">
                  Available
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded">
                  No Data
                </span>
              )}
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
              <select
                value={assetExportConfig.assetId}
                onChange={(e) => {
                  setAssetExportConfig(prev => ({ ...prev, assetId: e.target.value }));
                }}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select Asset</option>
                {assetIds.map(asset => (
                  <option key={asset.id} value={asset.id.toString()}>
                    {asset.name} ({asset.id})
                    {asset.componentNames && asset.componentNames.length > 0 && (
                      <span className="text-xs text-gray-500"> - {asset.componentNames.join(' + ')}</span>
                    )}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metric</label>
                <select
                  value={assetExportConfig.field}
                  onChange={(e) => {
                    setAssetExportConfig(prev => ({ ...prev, field: e.target.value }));
                    setPortfolioExportConfig(prev => ({ ...prev, field: e.target.value }));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  {fieldsToPlot.map(field => (
                    <option key={field.key} value={field.key}>{field.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <select
                  value={assetExportConfig.period}
                  onChange={(e) => {
                    setAssetExportConfig(prev => ({ ...prev, period: e.target.value }));
                    setPortfolioExportConfig(prev => ({ ...prev, period: e.target.value }));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                >
                  {periods.map(period => (
                    <option key={period.key} value={period.key}>{period.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Simplified Chart */}
          {assetExportConfig.assetId && (
            <div className="mb-4">
              <div className="h-64 w-full">
                {loadingChart ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Asset"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Asset"
                      />
                      <Line
                        type="monotone"
                        dataKey="Portfolio"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Portfolio Total"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    No chart data available
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Export Buttons */}
          <div className="mt-4 space-y-2">
            <button
              onClick={exportAssetData}
              disabled={!assetExportConfig.assetId || !assetSummary?.available || exporting.asset}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting.asset ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Asset Data</span>
                </>
              )}
            </button>
            <button
              onClick={exportPortfolioData}
              disabled={!portfolioSummary?.available || exporting.portfolio}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting.portfolio ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Portfolio Data</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sensitivity Export */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Sensitivity Analysis</h3>
                <p className="text-sm text-gray-600 mt-1">Configure and run sensitivity analysis, then export results</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {sensitivitySummary?.available ? (
                <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded">
                  Available
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded">
                  No Data
                </span>
              )}
            </div>
          </div>

          {sensitivitySummary && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-600">Records:</span>
                  <span className="font-medium">{sensitivitySummary.recordCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Section */}
          <div className="mb-4">
            <button
              onClick={() => setShowSensitivityConfig(!showSensitivityConfig)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700 transition-colors"
            >
              <span>{showSensitivityConfig ? 'Hide' : 'Show'} Sensitivity Configuration</span>
              <span>{showSensitivityConfig ? '−' : '+'}</span>
            </button>

            {showSensitivityConfig && sensitivityConfig && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4 max-h-96 overflow-y-auto">
                <div className="text-sm font-semibold text-gray-900 mb-3">Sensitivity Parameters</div>
                
                {/* Available parameters */}
                <div className="space-y-3">
                  {['volume', 'capex', 'electricity_price', 'green_price', 'opex', 'interest_rate', 'terminal_value'].map(param => {
                    const paramConfig = sensitivityConfig.sensitivities?.[param];
                    const isEnabled = !!paramConfig;
                    
                    return (
                      <div key={param} className="border border-gray-200 rounded-md p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => toggleSensitivityParam(param)}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {param.replace(/_/g, ' ')}
                            </span>
                          </label>
                        </div>
                        
                        {isEnabled && (
                          <div className="mt-2 space-y-2 pl-6">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Type</label>
                                <select
                                  value={paramConfig.type || 'multiplier'}
                                  onChange={(e) => updateSensitivityParam(param, 'type', e.target.value)}
                                  className="w-full p-1.5 border border-gray-300 rounded text-xs"
                                >
                                  <option value="multiplier">Multiplier</option>
                                  <option value="absolute_adjustment">Absolute Adjustment</option>
                                  <option value="basis_points_adjustment">Basis Points</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Base</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={paramConfig.base ?? 0}
                                  onChange={(e) => updateSensitivityParam(param, 'base', e.target.value)}
                                  className="w-full p-1.5 border border-gray-300 rounded text-xs"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Range Min</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={paramConfig.range?.[0] ?? 0}
                                  onChange={(e) => {
                                    const newRange = [...(paramConfig.range || [0, 0])];
                                    newRange[0] = parseFloat(e.target.value) || 0;
                                    updateSensitivityParam(param, 'range', newRange);
                                  }}
                                  className="w-full p-1.5 border border-gray-300 rounded text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Range Max</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={paramConfig.range?.[1] ?? 0}
                                  onChange={(e) => {
                                    const newRange = [...(paramConfig.range || [0, 0])];
                                    newRange[1] = parseFloat(e.target.value) || 0;
                                    updateSensitivityParam(param, 'range', newRange);
                                  }}
                                  className="w-full p-1.5 border border-gray-300 rounded text-xs"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Steps</label>
                              <input
                                type="number"
                                min="2"
                                max="10"
                                value={paramConfig.steps ?? 3}
                                onChange={(e) => updateSensitivityParam(param, 'steps', e.target.value)}
                                className="w-full p-1.5 border border-gray-300 rounded text-xs"
                              />
                            </div>
                            {paramConfig.type === 'absolute_adjustment' && (
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Unit</label>
                                <input
                                  type="text"
                                  value={paramConfig.unit || 'per_mwh'}
                                  onChange={(e) => updateSensitivityParam(param, 'unit', e.target.value)}
                                  className="w-full p-1.5 border border-gray-300 rounded text-xs"
                                  placeholder="per_mwh"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={runSensitivityWithConfig}
              disabled={runningSensitivity || !sensitivityConfig}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {runningSensitivity ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running Sensitivity Analysis...</span>
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  <span>Run Sensitivity Analysis</span>
                </>
              )}
            </button>
            <button
              onClick={exportSensitivityData}
              disabled={!sensitivitySummary?.available || exporting.sensitivity}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting.sensitivity ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export to CSV</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3-Way Forecast Export */}
        <ExportCard
          title="3-Way Forecast Export"
          description="Export integrated Profit & Loss, Balance Sheet, and Cash Flow statements"
          icon={DollarSign}
          summary={forecastSummary ? {
            'Asset': forecastSummary.assetName,
            'Period': forecastSummary.period,
            'Records': forecastSummary.recordCount
          } : null}
          available={forecastSummary?.available || false}
          exportKey="forecast"
          loading={loading}
          onExport={exportForecastData}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
              <select
                value={forecastExportConfig.assetId}
                onChange={(e) => setForecastExportConfig(prev => ({ ...prev, assetId: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select Asset</option>
                {assetIds.map(asset => (
                  <option key={asset.id} value={asset.id.toString()}>
                    {asset.name} ({asset.id})
                    {asset.componentNames && asset.componentNames.length > 0 && (
                      <span className="text-xs text-gray-500"> - {asset.componentNames.join(' + ')}</span>
                    )}
                  </option>
                ))}
              </select>
              {assetIds.find(a => a.id.toString() === forecastExportConfig.assetId)?.isHybrid && (
                <p className="text-xs text-gray-500 mt-1">
                  This is a combined hybrid asset. Forecast includes all components.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <select
                value={forecastExportConfig.period}
                onChange={(e) => setForecastExportConfig(prev => ({ ...prev, period: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                {periods.map(period => (
                  <option key={period.key} value={period.key}>{period.label}</option>
                ))}
              </select>
            </div>
          </div>
        </ExportCard>
      </div>
    </div>
  );
};

export default ExportDataPage;
