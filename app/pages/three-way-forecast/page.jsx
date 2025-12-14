// app/pages/three-way-forecast/page.jsx
'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Calendar,
  Building2,
  Filter,
  Loader2,
  AlertCircle,
  Eye,
  Table,
  DollarSign,
  TrendingUp,
  PieChart,
  BarChart3,
  CheckCircle,
  XCircle,
  Activity,
  Percent,
  BarChart,
  LineChart as LineChartIcon,
  CheckSquare,
  Square,
  Layers
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { usePortfolio } from '../../context/PortfolioContext';
import { useDisplaySettings } from '../../context/DisplaySettingsContext';
import { formatCurrency as formatCurrencyUtil, formatCurrencyFromMillions } from '../../utils/currencyFormatter';

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const ThreeWayForecastPage = () => {
  const { selectedPortfolio, portfolios } = usePortfolio();
  const { currencyUnit } = useDisplaySettings();
  const [assetIds, setAssetIds] = useState([]);
  const [assetIdToNameMap, setAssetIdToNameMap] = useState({});
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('yearly');
  const [showCharts, setShowCharts] = useState(true);

  // New state for combined portfolio view
  const [viewMode, setViewMode] = useState('individual'); // 'individual' or 'portfolio'
  const [selectedAssets, setSelectedAssets] = useState({}); // { assetId: boolean }
  const [portfolioForecastData, setPortfolioForecastData] = useState([]); // Combined data for all selected assets

  // Refs for synchronized scrolling
  const pnlScrollRef = useRef(null);
  const balanceSheetScrollRef = useRef(null);
  const cashFlowScrollRef = useRef(null);
  const isScrollingRef = useRef(false);

  const periods = [
    { key: 'monthly', label: 'Monthly', icon: Calendar },
    { key: 'quarterly', label: 'Quarterly', icon: Calendar },
    { key: 'yearly', label: 'Yearly', icon: Calendar },
    { key: 'fiscal_yearly', label: 'Fiscal Year', icon: Calendar }
  ];

  useEffect(() => {
    const fetchAssetIds = async () => {
      // Wait for portfolios to load if they haven't yet
      if (portfolios.length === 0) {
        console.log('[Three-way Forecast] Waiting for portfolios to load...');
        return;
      }

      setLoading(true);
      setError(null);
      // Clear selected asset and asset list when portfolio changes to avoid stale data
      setSelectedAssetId('');
      setAssetIds([]);
      setAssetIdToNameMap({});
      setForecastData([]);
      try {
        // selectedPortfolio from context is always the unique_id
        if (!selectedPortfolio) {
          console.error('Three-way forecast - No unique_id found for portfolio:', selectedPortfolio);
          setError('No portfolio selected. Please select a portfolio from the portfolio selector.');
          setLoading(false);
          return;
        }
        const uniqueId = selectedPortfolio;
        const response = await fetch(`/api/three-way-forecast?unique_id=${encodeURIComponent(uniqueId)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAssetIds(data.uniqueAssetIds.map(asset => ({ id: asset._id, name: asset.name })));
        const newMap = {};
        data.uniqueAssetIds.forEach(asset => {
          newMap[asset._id] = asset.name;
        });
        setAssetIdToNameMap(newMap);
        if (data.uniqueAssetIds.length > 0) {
          setSelectedAssetId(data.uniqueAssetIds[0]._id.toString());
        } else {
          setSelectedAssetId('');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAssetIds();

    // Listen for portfolio changes
    const handlePortfolioChange = () => {
      fetchAssetIds();
    };
    window.addEventListener('portfolioChanged', handlePortfolioChange);
    return () => window.removeEventListener('portfolioChanged', handlePortfolioChange);
  }, [selectedPortfolio, portfolios]);

  useEffect(() => {
    const fetchForecastData = async () => {
      if (selectedAssetId) {
        setLoading(true);
        setForecastData([]);
        try {
          // selectedPortfolio from context is always the unique_id
          if (!selectedPortfolio) {
            console.error('Three-way forecast - No unique_id found for portfolio:', selectedPortfolio);
            setLoading(false);
            return;
          }
          const uniqueId = selectedPortfolio;
          const url = `/api/three-way-forecast?asset_id=${selectedAssetId}${selectedPeriod ? `&period=${selectedPeriod}` : ''}&unique_id=${encodeURIComponent(uniqueId)}`;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setForecastData(data.data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchForecastData();
  }, [selectedAssetId, selectedPeriod, selectedPortfolio]);

  // Initialize selectedAssets when assetIds are loaded
  useEffect(() => {
    if (assetIds.length > 0) {
      const initialSelection = {};
      assetIds.forEach(asset => {
        initialSelection[asset.id] = true; // All assets selected by default
      });
      setSelectedAssets(initialSelection);
    }
  }, [assetIds]);

  // Fetch portfolio combined data when in portfolio mode
  useEffect(() => {
    const fetchPortfolioData = async () => {
      if (viewMode !== 'portfolio') return;

      const selectedAssetIds = Object.entries(selectedAssets)
        .filter(([_, isSelected]) => isSelected)
        .map(([id, _]) => id);

      if (selectedAssetIds.length === 0) {
        setPortfolioForecastData([]);
        return;
      }

      setLoading(true);
      try {
        if (!selectedPortfolio) {
          setLoading(false);
          return;
        }

        // Fetch data for all selected assets
        const allAssetData = await Promise.all(
          selectedAssetIds.map(async (assetId) => {
            const url = `/api/three-way-forecast?asset_id=${assetId}${selectedPeriod ? `&period=${selectedPeriod}` : ''}&unique_id=${encodeURIComponent(selectedPortfolio)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data.data;
          })
        );

        // Aggregate data by period
        const aggregatedData = {};

        allAssetData.forEach(assetDataArray => {
          assetDataArray.forEach(item => {
            const periodKey = JSON.stringify(item._id);
            if (!aggregatedData[periodKey]) {
              aggregatedData[periodKey] = { _id: item._id, date: item.date };
            }

            // Sum all numeric fields
            Object.keys(item).forEach(key => {
              if (key !== '_id' && key !== 'date' && typeof item[key] === 'number') {
                aggregatedData[periodKey][key] = (aggregatedData[periodKey][key] || 0) + item[key];
              }
            });
          });
        });

        // Convert to array and sort
        const sortedData = Object.values(aggregatedData).sort((a, b) => {
          if (a._id.year !== b._id.year) return a._id.year - b._id.year;
          if (a._id.month !== undefined && b._id.month !== undefined) return a._id.month - b._id.month;
          if (a._id.quarter !== undefined && b._id.quarter !== undefined) return a._id.quarter - b._id.quarter;
          if (a._id.fiscalYear !== undefined && b._id.fiscalYear !== undefined) return a._id.fiscalYear - b._id.fiscalYear;
          return 0;
        });

        setPortfolioForecastData(sortedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, [viewMode, selectedAssets, selectedPeriod, selectedPortfolio]);

  // Synchronize horizontal scrolling across all tables
  useEffect(() => {
    const scrollRefs = [pnlScrollRef, balanceSheetScrollRef, cashFlowScrollRef].filter(ref => ref.current);

    if (scrollRefs.length === 0) return;

    const handleScroll = (sourceRef) => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;

      const scrollLeft = sourceRef.current.scrollLeft;

      scrollRefs.forEach(ref => {
        if (ref.current && ref !== sourceRef) {
          ref.current.scrollLeft = scrollLeft;
        }
      });

      // Use requestAnimationFrame to reset the flag after scroll completes
      requestAnimationFrame(() => {
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 50);
      });
    };

    const cleanupFunctions = scrollRefs.map(ref => {
      const scrollHandler = () => handleScroll(ref);
      ref.current.addEventListener('scroll', scrollHandler);
      return () => {
        if (ref.current) {
          ref.current.removeEventListener('scroll', scrollHandler);
        }
      };
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [forecastData.length]); // Re-run when data changes

  const getPeriodLabel = (item) => {
    if (selectedPeriod === 'monthly') {
      return `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
    } else if (selectedPeriod === 'quarterly') {
      return `${item._id.year}-Q${item._id.quarter}`;
    } else if (selectedPeriod === 'yearly') {
      return `${item._id.year}`;
    } else if (selectedPeriod === 'fiscal_yearly') {
      return `FY${item._id.fiscalYear}`;
    } else {
      return new Date(item.date).toLocaleDateString();
    }
  };

  // Determine which data to display based on view mode
  const displayData = useMemo(() => {
    if (viewMode === 'portfolio') {
      return portfolioForecastData;
    }
    return forecastData;
  }, [viewMode, forecastData, portfolioForecastData]);

  // Helper functions for asset selection
  const toggleAsset = useCallback((assetId) => {
    setSelectedAssets(prev => ({
      ...prev,
      [assetId]: !prev[assetId]
    }));
  }, []);

  const selectAllAssets = useCallback(() => {
    const allSelected = {};
    assetIds.forEach(asset => {
      allSelected[asset.id] = true;
    });
    setSelectedAssets(allSelected);
  }, [assetIds]);

  const deselectAllAssets = useCallback(() => {
    const noneSelected = {};
    assetIds.forEach(asset => {
      noneSelected[asset.id] = false;
    });
    setSelectedAssets(noneSelected);
  }, [assetIds]);

  const selectedAssetCount = useMemo(() => {
    return Object.values(selectedAssets).filter(Boolean).length;
  }, [selectedAssets]);

  // Calculate financial metrics and ratios
  const financialMetrics = useMemo(() => {
    if (!displayData || displayData.length === 0) return [];

    return displayData.map((item, index) => {
      const revenue = item.revenue || 0;
      const ebitda = item.ebitda || 0;
      const ebit = item.ebit || 0;
      const netIncome = item.net_income || 0;
      const opex = Math.abs(item.opex || 0);
      const interest = Math.abs(item.interest || 0);
      const taxExpense = Math.abs(item.tax_expense || 0);
      const totalAssets = item.total_assets || 0;
      const totalLiabilities = item.total_liabilities || 0;
      const equity = item.equity || 0;
      const debt = item.debt || 0;
      const cash = item.cash || 0;
      const operatingCashFlow = item.operating_cash_flow || 0;
      const debtService = Math.abs(item.interest || 0) + Math.abs(item.principal || 0);
      const cfads = item.cfads || operatingCashFlow || 0;

      // Profitability Ratios
      const netMargin = revenue !== 0 ? (netIncome / revenue) * 100 : 0;
      const ebitdaMargin = revenue !== 0 ? (ebitda / revenue) * 100 : 0;
      const ebitMargin = revenue !== 0 ? (ebit / revenue) * 100 : 0;
      const roe = equity !== 0 ? (netIncome / equity) * 100 : 0;
      const roa = totalAssets !== 0 ? (netIncome / totalAssets) * 100 : 0;

      // Liquidity Ratios
      const currentRatio = totalLiabilities !== 0 ? (cash / totalLiabilities) : 0;
      const quickRatio = currentRatio; // Assuming cash is the only current asset

      // Leverage Ratios
      const debtToEquity = equity !== 0 ? (debt / equity) : 0;
      const debtToAssets = totalAssets !== 0 ? (debt / totalAssets) * 100 : 0;
      const equityRatio = totalAssets !== 0 ? (equity / totalAssets) * 100 : 0;

      // Coverage Ratios
      const interestCoverage = interest !== 0 ? (ebitda / interest) : 0;
      const dscr = debtService !== 0 ? (cfads / debtService) : 0;

      // Growth (compared to previous period)
      let revenueGrowth = 0;
      let ebitdaGrowth = 0;
      let netIncomeGrowth = 0;
      if (index > 0) {
        const prevRevenue = displayData[index - 1].revenue || 0;
        const prevEbitda = displayData[index - 1].ebitda || 0;
        const prevNetIncome = displayData[index - 1].net_income || 0;
        revenueGrowth = prevRevenue !== 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
        ebitdaGrowth = prevEbitda !== 0 ? ((ebitda - prevEbitda) / prevEbitda) * 100 : 0;
        netIncomeGrowth = prevNetIncome !== 0 ? ((netIncome - prevNetIncome) / prevNetIncome) * 100 : 0;
      }

      return {
        period: getPeriodLabel(item),
        ...item,
        // Profitability
        netMargin,
        ebitdaMargin,
        ebitMargin,
        roe,
        roa,
        // Liquidity
        currentRatio,
        quickRatio,
        // Leverage
        debtToEquity,
        debtToAssets,
        equityRatio,
        // Coverage
        interestCoverage,
        dscr,
        // Growth
        revenueGrowth,
        ebitdaGrowth,
        netIncomeGrowth
      };
    });
  }, [displayData, selectedPeriod]);

  // Data validation
  const validationResults = useMemo(() => {
    if (!displayData || displayData.length === 0) return { isValid: true, issues: [] };

    const issues = [];

    displayData.forEach((item, index) => {
      const period = getPeriodLabel(item);

      // Balance Sheet Validation: Assets = Liabilities + Equity
      const totalAssets = item.total_assets || 0;
      const totalLiabilities = item.total_liabilities || 0;
      const equity = item.equity || 0;
      const balanceCheck = Math.abs(totalAssets - (totalLiabilities + equity));
      const balanceTolerance = 1000; // Allow small rounding differences

      if (balanceCheck > balanceTolerance) {
        issues.push({
          type: 'balance_sheet',
          period,
          severity: 'error',
          message: `Balance sheet doesn't balance: Assets (${totalAssets.toLocaleString()}) ≠ Liabilities + Equity (${(totalLiabilities + equity).toLocaleString()}). Difference: ${balanceCheck.toLocaleString()}`
        });
      }

      // Cash Flow Reconciliation: Net Cash Flow should reconcile with change in cash
      if (index > 0) {
        const prevCash = displayData[index - 1].cash || 0;
        const currentCash = item.cash || 0;
        const netCashFlow = item.net_cash_flow || 0;
        const expectedCash = prevCash + netCashFlow;
        const cashReconciliation = Math.abs(currentCash - expectedCash);
        const cashTolerance = 1000;

        if (cashReconciliation > cashTolerance) {
          issues.push({
            type: 'cash_flow',
            period,
            severity: 'warning',
            message: `Cash flow reconciliation issue: Expected cash ${expectedCash.toLocaleString()} but actual is ${currentCash.toLocaleString()}. Difference: ${cashReconciliation.toLocaleString()}`
          });
        }
      }

      // Warning: Negative equity
      if (equity < 0) {
        issues.push({
          type: 'equity',
          period,
          severity: 'warning',
          message: `Negative equity: ${equity.toLocaleString()}`
        });
      }

      // Warning: Negative cash
      const cash = item.cash || 0;
      if (cash < 0) {
        issues.push({
          type: 'cash',
          period,
          severity: 'warning',
          message: `Negative cash balance: ${cash.toLocaleString()}`
        });
      }

      // Warning: Low interest coverage
      const interest = Math.abs(item.interest || 0);
      const ebitda = item.ebitda || 0;
      if (interest > 0 && ebitda / interest < 1.5) {
        issues.push({
          type: 'coverage',
          period,
          severity: 'warning',
          message: `Low interest coverage ratio: ${(ebitda / interest).toFixed(2)}x (should be > 1.5x)`
        });
      }
    });

    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }, [displayData, selectedPeriod]);

  const formatCurrency = useCallback((value, fieldKey = '') => {
    if (value === undefined || value === null || value === 0) return { display: '-', isNegative: false };

    // Fields that should be displayed as negative (expenses/outflows) even if stored as positive
    const expenseFields = [
      'opex', 'interest', 'tax_expense', 'capex', 'principal', 'distributions',
      'dividends', 'redistributed_capital', 'd_and_a'
    ];

    let displayValue = value;

    // Convert expense fields to negative for display if they're positive in data
    if (expenseFields.includes(fieldKey) && value > 0) {
      displayValue = -value;
    }

    const isNegative = displayValue < 0;
    // Values in 3-way forecast are stored in millions ($M)
    // Use formatCurrencyFromMillions which expects values already in millions
    const formattedValue = formatCurrencyFromMillions(Math.abs(displayValue), currencyUnit, { decimals: 0 });

    const display = isNegative ? `(${formattedValue.replace(/^\$/, '')})` : formattedValue;

    return { display, isNegative };
  }, [currencyUnit]);

  const formatPercent = (value) => {
    if (value === undefined || value === null || isNaN(value)) return '-';
    return `${value.toFixed(1)}%`;
  };

  const formatRatio = (value) => {
    if (value === undefined || value === null || isNaN(value)) return '-';
    return value.toFixed(2);
  };

  const renderTable = (title, fields, icon, scrollRef) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6" key={`${title}-${currencyUnit}-${viewMode}`}>
      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        {icon}
        {title}
      </h3>
      {displayData.length > 0 ? (
        <div className="overflow-x-auto" ref={scrollRef}>
          <table className="min-w-full divide-y divide-gray-200" key={currencyUnit}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Metric
                </th>
                {displayData.map((item, index) => (
                  <th key={index} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    {getPeriodLabel(item)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.map((field, fieldIndex) => (
                <tr key={fieldIndex} className={field.isSubtotal ? 'bg-gray-50 font-semibold' : ''}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${field.isSubtotal ? 'font-semibold' : 'font-medium'} text-gray-900 sticky left-0 bg-white z-10 border-r`}>
                    {field.indent && <span className="ml-4" />}
                    {field.label}
                  </td>
                  {displayData.map((item, itemIndex) => {
                    const { display, isNegative } = formatCurrency(item[field.key], field.key);
                    return (
                      <td key={itemIndex} className={`px-6 py-4 whitespace-nowrap text-sm text-center ${isNegative ? 'text-red-600' : 'text-gray-700'
                        } ${field.isSubtotal ? 'font-semibold bg-gray-50' : ''}`}>
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-600">No data available for this selection.</p>
      )}
    </div>
  );

  // Enhanced field definitions with proper expense formatting
  const profitAndLossFields = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'opex', label: 'Operating Expenses', indent: true }, // Will show as negative
    { key: 'ebitda', label: 'EBITDA', isSubtotal: true },
    { key: 'd_and_a', label: 'Depreciation & Amortization', indent: true }, // Will show as negative
    { key: 'ebit', label: 'EBIT', isSubtotal: true },
    { key: 'interest', label: 'Interest Expense', indent: true }, // Will show as negative
    { key: 'ebt', label: 'Earnings Before Tax', isSubtotal: true },
    { key: 'tax_expense', label: 'Tax Expense', indent: true }, // Will show as negative
    { key: 'net_income', label: 'Net Income', isSubtotal: true },
  ];

  const balanceSheetFields = [
    // Assets
    { key: 'cash', label: 'Cash & Cash Equivalents' },
    { key: 'fixed_assets', label: 'Property, Plant & Equipment (net)' },
    { key: 'total_assets', label: 'Total Assets', isSubtotal: true },
    // Liabilities
    { key: 'debt', label: 'Long-term Debt' },
    { key: 'total_liabilities', label: 'Total Liabilities', isSubtotal: true },
    // Equity
    { key: 'share_capital', label: 'Share Capital' },
    { key: 'retained_earnings', label: 'Retained Earnings' },
    { key: 'equity', label: 'Total Equity', isSubtotal: true },
  ];

  const cashFlowStatementFields = [
    // Operating Activities
    { key: 'net_income', label: 'Net Income' },
    { key: 'd_and_a', label: 'Add: Depreciation & Amortization', indent: true }, // Will show as negative but added back
    { key: 'operating_cash_flow', label: 'Cash Flow from Operating Activities', isSubtotal: true },

    // Investing Activities
    { key: 'capex', label: 'Capital Expenditures', indent: true }, // Will show as negative (cash outflow)
    { key: 'terminal_value', label: 'Terminal Value Proceeds', indent: true },
    { key: 'investing_cash_flow', label: 'Cash Flow from Investing Activities', isSubtotal: true },

    // Financing Activities
    { key: 'drawdowns', label: 'Debt Drawdowns', indent: true }, // Positive (cash inflow)
    { key: 'interest', label: 'Interest Payments', indent: true }, // Will show as negative (cash outflow)
    { key: 'principal', label: 'Principal Repayments', indent: true }, // Will show as negative (cash outflow)
    { key: 'equity_injection', label: 'Equity Contributions', indent: true }, // Positive (cash inflow)
    { key: 'distributions', label: 'Distributions to Equity', indent: true }, // Will show as negative (cash outflow)
    { key: 'dividends', label: '  - Dividends', indent: true }, // Will show as negative (cash outflow)
    { key: 'redistributed_capital', label: '  - Capital Returns', indent: true }, // Will show as negative (cash outflow)
    { key: 'financing_cash_flow', label: 'Cash Flow from Financing Activities', isSubtotal: true },

    // Net Cash Flow
    { key: 'net_cash_flow', label: 'Net Change in Cash', isSubtotal: true },

    // CRITICAL FIX: Show both pre and post distribution equity cash flows
    { key: 'equity_cash_flow_pre_distributions', label: 'Equity Cash Flow (Pre-Distributions)', isSubtotal: true },
    { key: 'equity_cash_flow', label: 'Equity Cash Flow (Post-Distributions)', isSubtotal: true },
  ];

  // Prepare chart data
  const chartData = useMemo(() => {
    return financialMetrics.map(metric => ({
      period: metric.period,
      revenue: metric.revenue || 0,
      ebitda: metric.ebitda || 0,
      netIncome: metric.net_income || 0,
      operatingCashFlow: metric.operating_cash_flow || 0,
      equityCashFlow: metric.equity_cash_flow || 0,
      totalAssets: metric.total_assets || 0,
      debt: metric.debt || 0,
      equity: metric.equity || 0,
      cash: metric.cash || 0
    }));
  }, [financialMetrics]);


  const handleExportCsv = () => {
    if (forecastData.length === 0) return;

    const allKeys = new Set();
    forecastData.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });
    financialMetrics.forEach(metric => {
      Object.keys(metric).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys).sort();

    const rows = financialMetrics.map(item => {
      return headers.map(header => {
        const value = item[header];
        if (typeof value === 'number') {
          return value;
        }
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return value;
      }).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_forecast_${selectedAssetId}_${selectedPeriod}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && assetIds.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          <span className="text-gray-600">Loading asset data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">3-Way Financial Forecast</h1>
            <p className="text-gray-600 mt-2">Integrated Profit & Loss, Balance Sheet, and Cash Flow statements</p>
            {viewMode === 'individual' && selectedAssetId && (
              <div className="mt-2 text-sm text-gray-500">
                Asset: <span className="font-medium">{assetIdToNameMap[selectedAssetId]} ({selectedAssetId})</span>
              </div>
            )}
            {viewMode === 'portfolio' && (
              <div className="mt-2 text-sm text-gray-500">
                <Layers className="w-4 h-4 inline mr-1" />
                Combined Portfolio: <span className="font-medium">{selectedAssetCount} assets selected</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  {displayData.length} periods
                </span>
              </div>
            </div>
            <button
              onClick={handleExportCsv}
              disabled={displayData.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Analysis Configuration</h3>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Layers className="w-4 h-4 inline mr-1" />
            View Mode
          </label>
          <div className="flex space-x-4">
            <button
              onClick={() => setViewMode('individual')}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${viewMode === 'individual'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
            >
              <Building2 className="w-5 h-5 inline mr-2" />
              Individual Asset
            </button>
            <button
              onClick={() => setViewMode('portfolio')}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${viewMode === 'portfolio'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
            >
              <Layers className="w-5 h-5 inline mr-2" />
              Combined Portfolio
              {viewMode === 'portfolio' && (
                <span className="ml-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {selectedAssetCount}/{assetIds.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Asset Selection - only show in individual mode */}
          {viewMode === 'individual' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Building2 className="w-4 h-4 inline mr-1" />
                Select Asset
              </label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
              >
                <option value="">-- Select an Asset --</option>
                {assetIds.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {assetIdToNameMap[asset.id]} ({asset.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Period Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Calendar className="w-4 h-4 inline mr-1" />
              Time Period
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              {periods.map((period) => (
                <option key={period.key} value={period.key}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Asset Selection Checkboxes - only show in portfolio mode */}
        {viewMode === 'portfolio' && assetIds.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                <CheckSquare className="w-4 h-4 inline mr-1" />
                Select Assets to Include ({selectedAssetCount} of {assetIds.length} selected)
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={selectAllAssets}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllAssets}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {assetIds.map((asset) => (
                <label
                  key={asset.id}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${selectedAssets[asset.id]
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAssets[asset.id] || false}
                    onChange={() => toggleAsset(asset.id)}
                    className="sr-only"
                  />
                  {selectedAssets[asset.id] ? (
                    <CheckSquare className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${selectedAssets[asset.id] ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {assetIdToNameMap[asset.id] || asset.id}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">Error: {error}</span>
          </div>
        </div>
      )}

      {loading && (viewMode === 'individual' ? selectedAssetId : true) && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-blue-800">Loading financial data...</span>
          </div>
        </div>
      )}

      {viewMode === 'individual' && !selectedAssetId && !loading && !error && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Asset to Begin</h3>
          <p className="text-gray-600">Choose an asset from the dropdown above to view its 3-way financial forecast</p>
        </div>
      )}

      {viewMode === 'portfolio' && selectedAssetCount === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Assets Selected</h3>
          <p className="text-gray-600">Select at least one asset from the checkboxes above to view the combined portfolio forecast</p>
        </div>
      )}

      {displayData.length > 0 && (
        <>
          {/* Visualizations */}
          {showCharts && chartData.length > 0 && (
            <div className="space-y-6 mb-6">
              {/* Revenue, EBITDA, Net Income Trends */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <LineChartIcon className="w-5 h-5 mr-2 text-green-600" />
                  Profitability Trends
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart key={currencyUnit} data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis
                      tickFormatter={(value) => {
                        if (value === 0) return '$0';
                        // Values are in millions, use formatCurrencyFromMillions
                        return formatCurrencyFromMillions(value, currencyUnit);
                      }}
                    />
                    <Tooltip formatter={(value) => formatCurrencyFromMillions(value, currencyUnit)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS[0]} strokeWidth={2} name="Revenue" />
                    <Line type="monotone" dataKey="ebitda" stroke={CHART_COLORS[1]} strokeWidth={2} name="EBITDA" />
                    <Line type="monotone" dataKey="netIncome" stroke={CHART_COLORS[2]} strokeWidth={2} name="Net Income" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Cash Flow Waterfall */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                  Cash Flow Analysis
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart key={currencyUnit} data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis
                      tickFormatter={(value) => {
                        if (value === 0) return '$0';
                        // Values are in millions, use formatCurrencyFromMillions
                        return formatCurrencyFromMillions(value, currencyUnit);
                      }}
                    />
                    <Tooltip formatter={(value) => formatCurrencyFromMillions(value, currencyUnit)} />
                    <Legend />
                    <Bar dataKey="operatingCashFlow" fill={CHART_COLORS[0]} name="Operating CF" />
                    <Bar dataKey="equityCashFlow" fill={CHART_COLORS[1]} name="Equity CF" />
                    <Line type="monotone" dataKey="cash" stroke={CHART_COLORS[2]} strokeWidth={2} name="Cash Balance" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

            </div>
          )}

          {/* Toggle Charts Button */}
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {showCharts ? 'Hide Charts' : 'Show Charts'}
            </button>
          </div>

          {/* Financial Statements Tables */}
          {renderTable('Profit & Loss Statement', profitAndLossFields, <TrendingUp className="w-5 h-5 mr-2 text-green-600" />, pnlScrollRef)}
          {renderTable('Balance Sheet', balanceSheetFields, <PieChart className="w-5 h-5 mr-2 text-blue-600" />, balanceSheetScrollRef)}
          {renderTable('Cash Flow Statement', cashFlowStatementFields, <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />, cashFlowScrollRef)}

          {/* Key Financial Metrics & Ratios - Moved to Bottom */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-green-600" />
              Key Financial Metrics & Ratios
            </h3>
            {financialMetrics.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                        Metric
                      </th>
                      {financialMetrics.map((metric, index) => (
                        <th key={index} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                          {metric.period}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="bg-green-50">
                      <td colSpan={financialMetrics.length + 1} className="px-6 py-2 text-sm font-semibold text-gray-900">
                        Leverage Ratios
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r">
                        Debt-to-Assets (%)
                      </td>
                      {financialMetrics.map((metric, index) => (
                        <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                          {formatPercent(metric.debtToAssets)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-purple-50">
                      <td colSpan={financialMetrics.length + 1} className="px-6 py-2 text-sm font-semibold text-gray-900">
                        Coverage Ratios
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r">
                        Interest Coverage (x)
                      </td>
                      {financialMetrics.map((metric, index) => (
                        <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                          {formatRatio(metric.interestCoverage)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r">
                        DSCR (x)
                      </td>
                      {financialMetrics.map((metric, index) => (
                        <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                          {formatRatio(metric.dscr)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Data Validation Section - At Bottom */}
          {validationResults.issues.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center space-x-2 mb-4">
                {validationResults.isValid ? (
                  <CheckCircle className="w-5 h-5 text-yellow-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  Data Validation {validationResults.isValid ? '(Warnings Only)' : '(Errors Found)'}
                </h3>
              </div>
              <div className="space-y-2">
                {validationResults.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${issue.severity === 'error'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-yellow-50 border border-yellow-200'
                      }`}
                  >
                    <div className="flex items-start space-x-2">
                      {issue.severity === 'error' ? (
                        <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <span className="font-medium text-sm">
                          {issue.period}: {issue.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <p className="text-sm mt-1">{issue.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ThreeWayForecastPage;