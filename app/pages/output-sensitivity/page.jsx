// app/pages/output-sensitivity/page.jsx
'use client'

import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { 
  TrendingUp, 
  Download, 
  Building2, 
  BarChart3,
  Filter,
  Loader2,
  AlertCircle,
  Eye,
  Activity,
  Percent,
  Target,
  Table as TableIcon
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';

Chart.register(...registerables);

const SensitivityOutputPage = () => {
  const { selectedPortfolio, portfolios } = usePortfolio();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState('Portfolio');
  const [availableAssets, setAvailableAssets] = useState(['Portfolio']);
  const [activeTab, setActiveTab] = useState('tornado');
  const [assetNames, setAssetNames] = useState({});


  useEffect(() => {
    fetchSensitivityData();
    
    // Listen for portfolio changes
    const handlePortfolioChange = () => {
      fetchSensitivityData();
    };
    window.addEventListener('portfolioChanged', handlePortfolioChange);
    return () => window.removeEventListener('portfolioChanged', handlePortfolioChange);
  }, [selectedPortfolio]);

  const fetchSensitivityData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // selectedPortfolio from context is always the unique_id
      if (!selectedPortfolio) {
        console.error('Sensitivity output - No unique_id found for portfolio:', selectedPortfolio);
        setError('Portfolio unique_id not found');
        setLoading(false);
        return;
      }
      const uniqueId = selectedPortfolio;
      const response = await fetch(`/api/get-sensitivity-output?unique_id=${encodeURIComponent(uniqueId)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result.data || []);
      
      // Store asset names mapping
      if (result.assetNames) {
        setAssetNames(result.assetNames);
      }
      
      if (result.data && result.data.length > 0) {
        const assetNumbers = new Set();
        result.data.forEach(item => {
          Object.keys(item).forEach(key => {
            const match = key.match(/^asset_(\d+)_irr_pct$/);
            if (match) {
              assetNumbers.add(parseInt(match[1]));
            }
          });
        });
        
        // Use asset names if available, otherwise fall back to "Asset {num}"
        const assetOptions = Array.from(assetNumbers)
          .sort((a, b) => a - b)
          .map(num => {
            const assetName = result.assetNames?.[num] || `Asset ${num}`;
            return assetName;
          });
        
        setAvailableAssets(['Portfolio', ...assetOptions]);
      }
      
    } catch (err) {
      console.error('Error fetching sensitivity data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processTornadoData = () => {
    if (!data.length) return { labels: [], datasets: [], processedData: [] };

    const parameterGroups = {};
    
    data.forEach(item => {
      const paramName = item.parameter_name || item.parameter || 'Unknown Parameter';
      
      if (!parameterGroups[paramName]) {
        parameterGroups[paramName] = {
          scenarios: [],
          parameter: paramName,
          parameter_units: item.parameter_units || ''
        };
      }
      
      let metricDiff = 0;
      
      if (selectedAsset === 'Portfolio') {
        metricDiff = item.portfolio_irr_diff_bps || 0;
      } else {
        // Find asset ID from asset name
        let assetId = null;
        for (const [id, name] of Object.entries(assetNames)) {
          if (name === selectedAsset) {
            assetId = parseInt(id) || id;
            break;
          }
        }
        // Fallback: try to extract number from "Asset X" format
        if (!assetId) {
          const assetMatch = selectedAsset.match(/(\d+)/);
          if (assetMatch) {
            assetId = parseInt(assetMatch[1]);
          }
        }
        if (assetId) {
          metricDiff = item[`asset_${assetId}_irr_diff_bps`] || 0;
        }
      }
      
      parameterGroups[paramName].scenarios.push({
        scenario_id: item.scenario_id,
        parameter_value: item.input_value,
        parameter_units: item.parameter_units || '',
        metric_diff: metricDiff / 100, // Convert bps to percentage points for IRR
        raw_value: selectedAsset === 'Portfolio' ? item.portfolio_irr_pct : (() => {
          // Find asset ID from asset name
          let assetId = null;
          for (const [id, name] of Object.entries(assetNames)) {
            if (name === selectedAsset) {
              assetId = parseInt(id) || id;
              break;
            }
          }
          // Fallback: try to extract number from "Asset X" format
          if (!assetId) {
            const assetMatch = selectedAsset.match(/(\d+)/);
            if (assetMatch) {
              assetId = parseInt(assetMatch[1]);
            }
          }
          return assetId ? item[`asset_${assetId}_irr_pct`] : null;
        })()
      });
    });

    const processedData = Object.entries(parameterGroups).map(([param, group]) => {
      const impacts = group.scenarios.map(s => s.metric_diff);
      
      const maxImpact = Math.max(...impacts);
      const minImpact = Math.min(...impacts);
      const totalRange = Math.abs(maxImpact) + Math.abs(minImpact);
      
      const maxIndex = impacts.indexOf(maxImpact);
      const minIndex = impacts.indexOf(minImpact);
      const maxScenario = group.scenarios[maxIndex];
      const minScenario = group.scenarios[minIndex];
      
      return {
        parameter: param,
        upside: Math.max(maxImpact, 0),
        downside: Math.min(minImpact, 0),
        totalRange: totalRange,
        scenarios: group.scenarios,
        impacts: impacts,
        units: group.parameter_units,
        maxScenario: maxScenario,
        minScenario: minScenario,
        maxInputValue: maxScenario?.parameter_value,
        minInputValue: minScenario?.parameter_value
      };
    });

    const filteredData = processedData
      .filter(item => item.totalRange > 0)
      .sort((a, b) => b.totalRange - a.totalRange);

    const labels = filteredData.map(item => {
      const maxVal = item.maxInputValue;
      const minVal = item.minInputValue;
      const units = item.units || '';
      
      if (maxVal !== undefined && minVal !== undefined) {
        return `${item.parameter}\n(${minVal}${units} to ${maxVal}${units})`;
      }
      return item.parameter;
    });

    const upsideData = filteredData.map(item => item.upside);
    const downsideData = filteredData.map(item => item.downside);

    return {
      labels,
      datasets: [
        {
          label: 'Upside Impact (%)',
          data: upsideData,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
        },
        {
          label: 'Downside Impact (%)',
          data: downsideData,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
        }
      ],
      processedData: filteredData
    };
  };

  const createChartOptions = (chartData) => {
    return {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: `Sensitivity Analysis - ${selectedAsset} - Equity IRR`,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        tooltip: {
          callbacks: {
            title: function(context) {
              const fullLabel = context[0].label;
              return fullLabel.split('\n')[0];
            },
            afterTitle: function(context) {
              const dataIndex = context[0].dataIndex;
              const item = chartData.processedData[dataIndex];
              if (item && item.maxInputValue !== undefined && item.minInputValue !== undefined) {
                const units = item.units || '';
                return `Range: ${item.minInputValue}${units} to ${item.maxInputValue}${units}`;
              }
              return '';
            },
            label: function(context) {
              const value = Math.abs(context.parsed.x);
              const dataIndex = context.dataIndex;
              const item = chartData.processedData[dataIndex];
              
              if (!item) return `${context.dataset.label}: ${value.toFixed(2)}%`;
              
              const isUpside = context.dataset.label.includes('Upside');
              const inputValue = isUpside ? item.maxInputValue : item.minInputValue;
              const units = item.units || '';
              
              const impactText = `${value.toFixed(2)}%`;
              
              return `${context.dataset.label}: ${impactText} (at ${inputValue}${units})`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: `Impact on Equity IRR (%)`,
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          ticks: {
            callback: function(value) {
              return Math.abs(value).toFixed(1) + '%';
            }
          }
        },
        y: {
          stacked: true,
          title: {
            display: true,
            text: 'Sensitivity Parameters',
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        }
      },
    };
  };

  const handleExportCsv = () => {
    if (!data || data.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const csvRows = [];

    csvRows.push(headers.join(','));

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value ?? '';
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sensitivity_analysis_${selectedAsset.replace(/\s+/g, '_').toLowerCase()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <span className="text-gray-600">Loading sensitivity analysis...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Sensitivity Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchSensitivityData}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sensitivity Analysis</h1>
          <p className="text-gray-600 mt-2">No sensitivity analysis data available</p>
        </div>
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Sensitivity Data</h3>
          <p className="text-gray-600">Run sensitivity analysis first to view results here</p>
        </div>
      </div>
    );
  }

  const tornadoData = processTornadoData();
  const chartOptions = createChartOptions(tornadoData);

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sensitivity Analysis</h1>
            <p className="text-gray-600 mt-2">Comprehensive sensitivity analysis with tornado charts and detailed data tables</p>
          </div>
          
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Analysis Configuration</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Building2 className="w-4 h-4 inline mr-1" />
              Asset/Portfolio
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
            >
              {availableAssets.map((asset) => (
                <option key={asset} value={asset}>
                  {asset}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Eye className="w-4 h-4 inline mr-1" />
              View Type
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('tornado')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  activeTab === 'tornado'
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-1" />
                Tornado
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  activeTab === 'table'
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <TableIcon className="w-4 h-4 inline mr-1" />
                Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'tornado' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Target className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Tornado Chart - {selectedAsset}
              </h3>
            </div>
            <button
              onClick={handleExportCsv}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
          
          {tornadoData.labels && tornadoData.labels.length > 0 ? (
            <div style={{ width: '100%', height: '600px' }}>
              <Bar data={tornadoData} options={chartOptions} />
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Tornado Data Available</h3>
              <p className="text-gray-600">No sensitivity data found for the selected asset and metric</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'table' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Sensitivity Data</h3>
              <div className="text-sm text-gray-500">
                {data.length} records
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {data.length > 0 && Object.keys(data[0]).map((column) => (
                    <th
                      key={column}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {Object.entries(row).map(([key, value]) => (
                      <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof value === 'number' 
                          ? value.toLocaleString(undefined, { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })
                          : value || '-'
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default SensitivityOutputPage;
