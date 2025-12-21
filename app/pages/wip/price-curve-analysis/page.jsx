// app/pages/wip/price-curve-analysis/page.jsx
'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Filter,
  BarChart3,
  TrendingUp,
  Calendar,
  MapPin,
  Zap,
  RefreshCw,
  AlertCircle,
  Loader2,
  Info,
  Download,
  Maximize2,
  X,
  CheckSquare,
  Square
} from 'lucide-react'
import { useDisplaySettings } from '../../../context/DisplaySettingsContext'

// Constants
const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#f43f5e', '#fb923c', '#22d3ee'
]

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'fiscal_yearly', label: 'Fiscal Year' }
]

export default function PriceCurveAnalysisPage() {
  const { currencyUnit } = useDisplaySettings()
  const [allCurves, setAllCurves] = useState([])
  const [selectedCurves, setSelectedCurves] = useState([])
  const [priceCurvesData, setPriceCurvesData] = useState({}) // { curveName: [data] }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRegions, setSelectedRegions] = useState(['NSW'])
  const [selectedProfiles, setSelectedProfiles] = useState(['baseload'])
  const [selectedTypes, setSelectedTypes] = useState(['ENERGY'])
  const [availableRegions, setAvailableRegions] = useState([])
  const [availableProfiles, setAvailableProfiles] = useState([])
  const [availableTypes, setAvailableTypes] = useState([])
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Format period label helper function
  const formatPeriodLabel = useCallback((timeKey, period) => {
    if (!timeKey) return timeKey || '';

    if (period === 'monthly') {
      const [year, month] = timeKey.split('-')
      if (!year || !month) return timeKey;
      return new Date(year, parseInt(month) - 1, 1).toLocaleDateString('en-AU', { year: 'numeric', month: 'short' })
    } else if (period === 'quarterly') {
      const [year, quarter] = timeKey.split('-Q')
      if (!year || !quarter) return timeKey;
      return `${year} Q${quarter}`
    } else if (period === 'yearly') {
      return timeKey
    } else if (period === 'fiscal_yearly') {
      return timeKey
    } else {
      try {
        return new Date(timeKey).toLocaleDateString('en-AU', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      } catch (e) {
        return timeKey;
      }
    }
  }, [])

  // Initialize: Fetch all curve names
  useEffect(() => {
    const fetchCurveNames = async () => {
      try {
        const metaResponse = await fetch('/api/price-curves/meta');
        if (metaResponse.ok) {
          const metaData = await metaResponse.json();
          if (metaData.curveNames && metaData.curveNames.length > 0) {
            setAllCurves(metaData.curveNames);
            // Default to selecting first curve if available
            if (metaData.curveNames.length > 0) {
              setSelectedCurves([metaData.curveNames[0]]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching curve names:', err);
        setError('Failed to load curve names');
      } finally {
        setLoading(false);
      }
    };

    fetchCurveNames();
  }, []);

  // Fetch price curves data for all selected curves
  const fetchPriceCurves = useCallback(async () => {
    if (selectedCurves.length === 0) {
      setPriceCurvesData({});
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fetchPromises = selectedCurves.map(async (curveName) => {
        const url = `/api/price-curves?period=${selectedPeriod}&curve_name=${encodeURIComponent(curveName)}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} for curve ${curveName}`);
        }
        const data = await response.json();
        return { curveName, data };
      });

      const results = await Promise.all(fetchPromises);
      const dataMap = {};
      results.forEach(({ curveName, data }) => {
        dataMap[curveName] = data;
      });

      setPriceCurvesData(dataMap);

      // Extract unique values for filters from ALL selected curves' data
      if (results.length > 0) {
        // Collect regions, profiles, and types from all curves
        const allRegions = new Set();
        const allProfiles = new Set();
        const allTypes = new Set();
        const allDates = [];

        results.forEach(({ data }) => {
          if (data && data.length > 0) {
            data.forEach(item => {
              if (item._id.REGION) allRegions.add(item._id.REGION);
              if (item._id.PROFILE) allProfiles.add(item._id.PROFILE);
              if (item._id.TYPE) allTypes.add(item._id.TYPE);

              // Collect dates from all curves for date range
              let date;
              if (selectedPeriod === 'monthly') {
                date = new Date(item._id.year, item._id.month - 1, 1);
              } else if (selectedPeriod === 'quarterly') {
                date = new Date(item._id.year, (item._id.quarter - 1) * 3, 1);
              } else if (selectedPeriod === 'yearly') {
                date = new Date(item._id.year, 0, 1);
              } else if (selectedPeriod === 'fiscal_yearly') {
                date = new Date(item._id.fiscalYear, 6, 1);
              } else {
                date = new Date(item.TIME);
              }
              if (!isNaN(date)) {
                allDates.push(date);
              }
            });
          }
        });

        // Convert Sets to sorted arrays
        const regions = Array.from(allRegions).sort();
        const filteredRegions = regions.filter(r => r !== 'TAS');
        const profiles = Array.from(allProfiles).sort();
        const types = Array.from(allTypes).sort();

        setAvailableRegions(filteredRegions);
        const hasSpreadTypes = types.some(type => type.startsWith('SPREAD_'));
        if (hasSpreadTypes && !profiles.includes('storage')) {
          setAvailableProfiles([...profiles, 'storage']);
        } else {
          setAvailableProfiles(profiles);
        }
        setAvailableTypes(types);

        // Set date range from all curves
        if (allDates.length > 0) {
          setDateRange({
            start: new Date(Math.min(...allDates)),
            end: new Date(Math.max(...allDates))
          });
        }
      }
    } catch (err) {
      console.error('Error fetching price curves:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCurves, selectedPeriod]);

  // Fetch data when selected curves or period changes
  useEffect(() => {
    fetchPriceCurves();
  }, [fetchPriceCurves]);

  // Process chart data when filters or data change
  const chartData = useMemo(() => {
    if (selectedCurves.length === 0 || Object.keys(priceCurvesData).length === 0) return [];

    const timeGroups = {};

    // Process data from all selected curves
    selectedCurves.forEach(curveName => {
      const curveData = priceCurvesData[curveName] || [];
      
      curveData.forEach(item => {
        let timeKey, displayDate;

        if (selectedPeriod === 'monthly') {
          timeKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
          displayDate = new Date(item._id.year, item._id.month - 1, 1);
        } else if (selectedPeriod === 'quarterly') {
          timeKey = `${item._id.year}-Q${item._id.quarter}`;
          displayDate = new Date(item._id.year, (item._id.quarter - 1) * 3, 1);
        } else if (selectedPeriod === 'yearly') {
          timeKey = `${item._id.year}`;
          displayDate = new Date(item._id.year, 0, 1);
        } else if (selectedPeriod === 'fiscal_yearly') {
          timeKey = `FY${item._id.fiscalYear}`;
          displayDate = new Date(item._id.fiscalYear, 6, 1);
        } else {
          timeKey = item.TIME;
          displayDate = new Date(item.TIME);
        }

        if (!timeGroups[timeKey]) {
          timeGroups[timeKey] = { TIME: timeKey, date: displayDate };
        }

        const regionMatch = selectedRegions.includes(item._id.REGION);
        if (!regionMatch) return;

        if (selectedProfiles.includes('storage')) {
          if (item._id.TYPE && item._id.TYPE.startsWith('SPREAD_') && selectedTypes.includes(item._id.TYPE)) {
            const seriesKey = `${curveName}_${item._id.REGION}_${item._id.TYPE}`;
            timeGroups[timeKey][seriesKey] = item.PRICE;
          }
        }
        if (selectedProfiles.includes(item._id.PROFILE) && selectedTypes.includes(item._id.TYPE)) {
          const seriesKey = selectedRegions.length > 1
            ? `${curveName}_${item._id.REGION}_${item._id.PROFILE}_${item._id.TYPE}`
            : `${curveName}_${item._id.PROFILE}_${item._id.TYPE}`;
          timeGroups[timeKey][seriesKey] = item.PRICE;
        }
      });
    });

    return Object.values(timeGroups)
      .sort((a, b) => a.date - b.date)
      .map(item => ({
        ...item,
        TIME: item.TIME ? formatPeriodLabel(item.TIME, selectedPeriod) : item.TIME
      }));
  }, [priceCurvesData, selectedCurves, selectedRegions, selectedProfiles, selectedTypes, selectedPeriod, formatPeriodLabel]);

  // Get series keys from chart data
  const seriesKeys = useMemo(() => {
    if (!chartData.length) return [];
    // Collect all unique series keys from ALL data points, not just the first one
    // This is critical for curves with different start dates (e.g., AC Nov 2024 vs AC Oct 2025)
    const allKeys = new Set();
    chartData.forEach(dataPoint => {
      Object.keys(dataPoint).forEach(key => {
        // Include keys that are numbers (series data) and exclude metadata keys
        if (key !== 'TIME' && key !== 'date' && typeof dataPoint[key] === 'number' && !key.includes('TAS')) {
          allKeys.add(key);
        }
      });
    });
    return Array.from(allKeys);
  }, [chartData]);

  // Get relevant types for current profiles
  const relevantTypes = useMemo(() => {
    if (selectedProfiles.includes('storage')) {
      return availableTypes.filter(type => type.startsWith('SPREAD_'));
    }
    return availableTypes.filter(type => !type.startsWith('SPREAD_'));
  }, [selectedProfiles, availableTypes]);

  const handleCurveToggle = useCallback((curveName) => {
    setSelectedCurves(prev => {
      if (prev.includes(curveName)) {
        return prev.filter(c => c !== curveName);
      } else {
        return [...prev, curveName];
      }
    });
  }, []);

  const handleRegionChange = useCallback((region) => {
    setSelectedRegions(prev => {
      return prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region];
    });
  }, []);

  const handleProfileChange = useCallback((profile) => {
    setSelectedProfiles(prev => {
      if (prev.includes(profile)) {
        return prev.filter(p => p !== profile);
      } else {
        return [...prev, profile];
      }
    });
  }, []);

  const handleTypeChange = useCallback((type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }, []);

  const handlePeriodChange = useCallback((event) => {
    setSelectedPeriod(event.target.value);
  }, []);

  const exportToCsv = useCallback(() => {
    if (!chartData.length) return;

    const headers = ['TIME', ...seriesKeys];
    const csvRows = [];

    csvRows.push(headers.map(header => `"${header.replace(/_/g, ' ')}"`).join(','));

    chartData.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (typeof value === 'number') {
          return value.toFixed(2);
        } else if (value === null || value === undefined) {
          return '';
        } else {
          return `"${String(value).replace(/"/g, '""')}"`;
        }
      });
      csvRows.push(values.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `price_curve_analysis_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [chartData, seriesKeys, selectedPeriod]);

  const formatCurrencyValue = useCallback((value) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '-';
    }
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const formattedValue = absValue.toFixed(2);
    const sign = isNegative ? '-' : '';
    return `${sign}$${formattedValue}`;
  }, []);

  const getLineColor = useCallback((index) => {
    return CHART_COLORS[index % CHART_COLORS.length];
  }, []);

  if (error && !priceCurvesData) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Price Curves</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchPriceCurves}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center mx-auto"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const chartHeight = isFullscreen ? 'calc(100vh - 300px)' : 500;

  return (
    <div className={`p-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white overflow-auto' : ''}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">Price Curve Analysis</h1>
            <p className="text-gray-600 mt-1">
              Compare monthly price data across multiple curves
            </p>
            {dateRange.start && dateRange.end && (
              <p className="text-sm text-gray-500 mt-1">
                Data range: {dateRange.start.toLocaleDateString('en-AU')} to {dateRange.end.toLocaleDateString('en-AU')}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  {selectedCurves.length} curve{selectedCurves.length !== 1 ? 's' : ''} selected
                </span>
              </div>
            </div>
            {isFullscreen && (
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Exit fullscreen"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Curve Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg backdrop-blur-[1px]">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Select Curves to Compare</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (selectedCurves.length === allCurves.length) {
                  setSelectedCurves([]);
                } else {
                  setSelectedCurves([...allCurves]);
                }
              }}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {selectedCurves.length === allCurves.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
          {allCurves.length === 0 ? (
            <p className="text-sm text-gray-500 text-center col-span-full py-2">No curves found</p>
          ) : (
            allCurves.map(curveName => (
              <label
                key={curveName}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedCurves.includes(curveName)}
                  onChange={() => handleCurveToggle(curveName)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700 flex-1">{curveName}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg backdrop-blur-[1px]">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          <button
            onClick={() => {
              setSelectedRegions(['NSW']);
              setSelectedProfiles(['baseload']);
              setSelectedTypes(['ENERGY']);
            }}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Region Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <MapPin className="w-4 h-4 inline mr-1" />
              Regions ({selectedRegions.length})
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
              {availableRegions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">No regions found</p>
              ) : (
                availableRegions.map(region => (
                  <label key={region} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedRegions.includes(region)}
                      onChange={() => handleRegionChange(region)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{region}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Profile Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Zap className="w-4 h-4 inline mr-1" />
              Profiles ({selectedProfiles.length})
            </label>
            <div className="space-y-2 border border-gray-200 rounded-md p-2 max-h-48 overflow-y-auto">
              {availableProfiles.map(profile => (
                <label key={profile} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedProfiles.includes(profile)}
                    onChange={() => handleProfileChange(profile)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 capitalize flex-1">{profile}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              {selectedProfiles.includes('storage') ? 'Spread Types' : 'Price Types'} ({selectedTypes.length})
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
              {relevantTypes.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-2">
                  <Info className="w-4 h-4 inline mr-1" />
                  No {selectedProfiles.includes('storage') ? 'spread' : 'price'} types available
                </div>
              ) : (
                relevantTypes.map(type => (
                  <label key={type} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => handleTypeChange(type)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{type}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Aggregation Period Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Calendar className="w-4 h-4 inline mr-1" />
              Aggregate By
            </label>
            <select
              className="w-full pl-3 pr-10 py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              value={selectedPeriod}
              onChange={handlePeriodChange}
            >
              {PERIOD_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg backdrop-blur-[1px]">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        )}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedProfiles.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
              {selectedProfiles.includes('storage') ? ' Spread' : ' Price'} Comparison
              {selectedRegions.includes('ALL') ? ' - All Regions' : ` - ${selectedRegions.join(', ')}`}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {chartData.length} data points • {seriesKeys.length} series
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {!isFullscreen && (
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Fullscreen"
                title="Fullscreen"
              >
                <Maximize2 className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <button
              onClick={exportToCsv}
              disabled={chartData.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div style={{ width: '100%', height: chartHeight }}>
          {chartData.length > 0 && seriesKeys.length > 0 ? (
            <ResponsiveContainer>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="TIME"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tickFormatter={formatCurrencyValue}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  label={{ value: `Price (${currencyUnit}/MWh)`, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#374151' } }}
                />
                <Tooltip
                  formatter={(value, name) => [formatCurrencyValue(value), name.replace(/_/g, ' ')]}
                  labelFormatter={(label) => `Period: ${label}`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '8px'
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                {seriesKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={getLineColor(index)}
                    strokeWidth={2}
                    dot={{ r: 3, fill: getLineColor(index) }}
                    activeDot={{ r: 5, stroke: getLineColor(index), strokeWidth: 2 }}
                    name={key.replace(/_/g, ' ')}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No data available</p>
                <p className="text-sm text-gray-500 mt-2">
                  {selectedCurves.length === 0
                    ? 'Please select at least one curve to compare'
                    : 'Try adjusting your region, profile, or type selections'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

