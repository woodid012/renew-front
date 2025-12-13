'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { AlertCircle, CheckCircle, DollarSign, Loader2, Plus, Save, X, Trash2 } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useDisplaySettings } from '../../context/DisplaySettingsContext';
import { formatCurrencyFromMillions } from '../../utils/currencyFormatter';

const DEFAULT_OPEX_ESCALATION_PCT = 2.5;

function newId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// Parse formula or percentage string to a number
// Supports: "=1/10" -> 10, "10%" -> 10, "10" -> 10, "-" -> 0
function parseFormulaOrPercent(input) {
  if (!input || input === '' || input === '-') return 0;
  const str = String(input).trim();
  if (str === '-') return 0;
  
  // Handle formula: =1/10, =2/3, etc.
  if (str.startsWith('=')) {
    const formula = str.slice(1).trim();
    const match = formula.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (match) {
      const numerator = parseFloat(match[1]);
      const denominator = parseFloat(match[2]);
      if (denominator !== 0) {
        return (numerator / denominator) * 100;
      }
    }
    // Try to evaluate as a simple expression (avoid eval for security)
    // For now, only support division formulas like =1/10
    return 0;
  }
  
  // Handle percentage: "10%" -> 10
  if (str.endsWith('%')) {
    return parseFloat(str.slice(0, -1)) || 0;
  }
  
  // Handle plain number
  return parseFloat(str) || 0;
}

// Parse formula or value string to a number (for dollar values, not percentages)
// Supports: "=1/10" -> 0.1, "=100/2" -> 50, "=10+5" -> 15, "=10-3" -> 7, "=10*2" -> 20, "10" -> 10, "-" -> 0
function parseFormulaOrValue(input) {
  if (!input || input === '' || input === '-') return 0;
  const str = String(input).trim();
  if (str === '-') return 0;
  
  // Handle formula: =1/10, =100/2, =10+5, =10-3, =10*2, etc.
  if (str.startsWith('=')) {
    const formula = str.slice(1).trim();
    
    // Division: =10/2
    const divMatch = formula.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (divMatch) {
      const numerator = parseFloat(divMatch[1]);
      const denominator = parseFloat(divMatch[2]);
      if (denominator !== 0) {
        return numerator / denominator;
      }
      return 0;
    }
    
    // Multiplication: =10*2
    const multMatch = formula.match(/^(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)$/);
    if (multMatch) {
      return parseFloat(multMatch[1]) * parseFloat(multMatch[2]);
    }
    
    // Addition: =10+5
    const addMatch = formula.match(/^(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)$/);
    if (addMatch) {
      return parseFloat(addMatch[1]) + parseFloat(addMatch[2]);
    }
    
    // Subtraction: =10-3
    const subMatch = formula.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
    if (subMatch) {
      return parseFloat(subMatch[1]) - parseFloat(subMatch[2]);
    }
    
    // If no match, return 0
    return 0;
  }
  
  // Handle plain number
  return parseFloat(str) || 0;
}

// Format number as percentage string for display
function formatAsPercent(value) {
  const num = parseFloat(value) || 0;
  if (num === 0) return '-';
  return num.toFixed(2);
}

function toDateInputValue(dateLike) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addYearsToDateInput(dateInput, years) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + (parseInt(years) || 0));
  return toDateInputValue(d);
}

// Format date as DD/MM/YYYY for display
function formatDateDDMMYYYY(dateLike) {
  if (!dateLike) return '—';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function createEmptyAssetCosts(nowYear = new Date().getFullYear()) {
  return {
    capex: {
      construction_duration_months: 18,
      groups: [
        {
          id: newId(),
          name: 'EPC',
          items: [
            { id: newId(), label: 'Equipment', value: 0, monthlyAllocations: [] },
            { id: newId(), label: 'Installation', value: 0, monthlyAllocations: [] },
          ],
        },
        {
          id: newId(),
          name: "Owner's Costs",
          items: [{ id: newId(), label: 'Development', value: 0, monthlyAllocations: [] }],
        },
        {
          id: newId(),
          name: 'Transaction Costs',
          items: [{ id: newId(), label: 'Legal / Advisory', value: 0, monthlyAllocations: [] }],
        },
      ],
    },
    opex: {
      reference_year: nowYear,
      groups: [
        {
          id: newId(),
          name: 'Operations',
          items: [
            {
              id: newId(),
              label: 'Fixed O&M',
              value: 0,
              units: 'AUD M p.a.',
              escalationMethod: 'CPI',
              escalationPct: DEFAULT_OPEX_ESCALATION_PCT,
              flexPct: 0,
              startDate: '',
              endDate: '',
            },
          ],
        },
      ],
    },
  };
}

function normalizeGroup(group) {
  const rawItems = Array.isArray(group?.items) ? group.items : [];
  const baseAbs = rawItems
    .filter((i) => i?.valueType !== 'percent_of_group')
    .reduce((sum, i) => sum + (parseFloat(i?.value) || 0), 0);

  const items = rawItems.map((i) => {
    if (i?.valueType === 'percent_of_group') {
      return {
        id: i.id || newId(),
        label: i.label || 'Uplift item',
        value: baseAbs * ((parseFloat(i.value) || 0) / 100),
        // Preserve any OPEX indexation fields if present
        referenceYear: i.referenceYear,
        escalationPct: i.escalationPct,
      };
    }
    return {
      id: i.id || newId(),
      label: i.label || 'Item',
      value: parseFloat(i?.value) || 0,
      monthlyAllocations: Array.isArray(i?.monthlyAllocations) ? i.monthlyAllocations : [],
      units: i.units || 'AUD M p.a.',
      escalationMethod: i.escalationMethod || 'CPI',
      escalationPct: i.escalationPct,
      flexPct: parseFloat(i?.flexPct) || 0,
      referenceYear: i.referenceYear,
      startDate: i.startDate,
      endDate: i.endDate,
    };
  });

  return {
    ...group,
    items,
  };
}

function normalizeAssetCosts(assetCosts) {
  const nowYear = new Date().getFullYear();
  const capex = assetCosts?.capex || {};
  const opex = assetCosts?.opex || {};

  const normalizeSection = (section) => ({
    ...section,
    groups: Array.isArray(section?.groups) ? section.groups.map(normalizeGroup) : [],
  });

  return {
    capex: {
      construction_duration_months: parseInt(capex?.construction_duration_months) || 18,
      ...normalizeSection({ ...capex, target_total_m: undefined }),
    },
    opex: {
      reference_year: parseInt(opex?.reference_year) || nowYear,
      ...normalizeSection(opex),
    },
  };
}

function computeGroupTotals(group) {
  const base = (group.items || []).reduce((sum, i) => sum + (parseFloat(i.value) || 0), 0);
  return { base, total: base };
}

export default function CostsPage() {
  const { selectedPortfolio, getPortfolioUniqueId } = usePortfolio();
  const { currencyUnit } = useDisplaySettings();

  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const assetsLoadedRef = useRef(false); // Track if we've successfully loaded assets

  const [activeTab, setActiveTab] = useState('capex'); // capex | opex
  const [selectedAssetId, setSelectedAssetId] = useState('');
  
  // Track temporary input values for percentage fields (Excel-like behavior)
  const [tempPctInputs, setTempPctInputs] = useState({});
  
  // Track temporary input values for dollar value fields (Excel-like behavior)
  const [tempValueInputs, setTempValueInputs] = useState({});
  
  // Track which labels are being edited (double-click to edit)
  const [editingLabel, setEditingLabel] = useState(null); // Format: 'group_${groupId}' or 'item_${groupId}_${itemId}'

  const [loadingCosts, setLoadingCosts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  const [originalDoc, setOriginalDoc] = useState(null);
  const [doc, setDoc] = useState(null);

  const uniqueId = useMemo(() => {
    if (!selectedPortfolio) return 'ZEBRE';
    const uid = getPortfolioUniqueId(selectedPortfolio) || selectedPortfolio;
    return uid;
  }, [selectedPortfolio]); // Remove getPortfolioUniqueId from deps - it's stable

  // Reset assets loaded flag when portfolio changes
  useEffect(() => {
    assetsLoadedRef.current = false;
  }, [selectedPortfolio]);

  const hasUnsavedChanges = useMemo(() => {
    if (!originalDoc || !doc) return false;
    return JSON.stringify(originalDoc.assets || {}) !== JSON.stringify(doc.assets || {});
  }, [originalDoc, doc]);

  useEffect(() => {
    if (!uniqueId) {
      // Only clear if we haven't successfully loaded assets yet
      if (!assetsLoadedRef.current) {
        setAssets([]);
      }
      setAssetsLoading(false);
      return;
    }

    const fetchAssets = async () => {
      // Don't show loading if we already have assets (prevents flickering)
      if (!assetsLoadedRef.current) {
        setAssetsLoading(true);
      }
      try {
        // Prefer the portfolio's own asset list (CONFIG_Inputs.asset_inputs) so the dropdown always matches the portfolio
        const configRes = await fetch(`/api/get-asset-data?unique_id=${encodeURIComponent(uniqueId)}`);
        if (configRes.ok) {
          const config = await configRes.json();
          const assetInputs = Array.isArray(config.asset_inputs) ? config.asset_inputs : [];
          if (assetInputs.length > 0) {
            const mapped = assetInputs.map((a) => ({
              asset_id: a.id ? String(a.id) : String(a._id || Math.random()),
              asset_name: a.name || `Asset ${a.id || a._id}`,
              name: a.name || `Asset ${a.id || a._id}`,
              OperatingStartDate: a.OperatingStartDate || a.assetStartDate || a.operatingStartDate,
              assetLife: a.assetLife || a.assetLifeYears || 25,
            }));
            setAssets(mapped);
            assetsLoadedRef.current = true; // Mark as successfully loaded
            setAssetsLoading(false);
            return;
          }
        } else if (configRes.status === 404) {
          // Portfolio not found - don't clear existing assets, just log
          console.warn('Portfolio not found:', uniqueId);
          // Keep existing assets if we have them
          setAssetsLoading(false);
          return;
        }

        // Fallback to summary-based assets endpoint
        const response = await fetch(`/api/assets?unique_id=${encodeURIComponent(uniqueId)}`);
        if (response.ok) {
          const data = await response.json();
          const assetsArray = Array.isArray(data.assets) ? data.assets : [];
          if (assetsArray.length > 0) {
            setAssets(assetsArray);
            assetsLoadedRef.current = true; // Mark as successfully loaded
            setAssetsLoading(false);
            return;
          }
        }
        
        // Only clear assets if we truly have no data AND we haven't successfully loaded before
        if (!assetsLoadedRef.current) {
          console.warn('No assets found for portfolio:', uniqueId);
          setAssets([]);
        }
      } catch (e) {
        console.error('Failed to fetch assets:', e);
        // Don't clear assets on error - keep previous assets to prevent flickering
      } finally {
        setAssetsLoading(false);
      }
    };

    fetchAssets();
  }, [uniqueId]);

  useEffect(() => {
    if (!assetsLoading && assets.length > 0) {
      // Only set selectedAssetId if it's not already set or if the current selection is invalid
      const currentAssetExists = selectedAssetId && assets.some(a => String(a.asset_id) === String(selectedAssetId));
      if (!currentAssetExists) {
        setSelectedAssetId(String(assets[0].asset_id));
      }
    } else if (!assetsLoading && assets.length === 0 && selectedAssetId) {
      // Clear selection if no assets available
      setSelectedAssetId('');
    }
  }, [assetsLoading, assets, selectedAssetId]);

  const loadCostsDoc = async () => {
    setLoadingCosts(true);
    setStatus({ type: null, message: '' });
    try {
      const response = await fetch(`/api/portfolio-costs?unique_id=${encodeURIComponent(uniqueId)}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      const normalized = {
        unique_id: data.unique_id || uniqueId,
        assets: Object.fromEntries(
          Object.entries(data.assets || {}).map(([assetId, assetCosts]) => [assetId, normalizeAssetCosts(assetCosts)])
        ),
        updated_at: data.updated_at || null,
      };
      setOriginalDoc(JSON.parse(JSON.stringify(normalized)));
      setDoc(JSON.parse(JSON.stringify(normalized)));
    } catch (e) {
      console.error('Failed to load costs doc:', e);
      setStatus({ type: 'error', message: `Failed to load costs: ${e.message}` });
      // Initialize empty doc so the UI is usable
      const empty = { unique_id: uniqueId, assets: {}, updated_at: null };
      setOriginalDoc(JSON.parse(JSON.stringify(empty)));
      setDoc(JSON.parse(JSON.stringify(empty)));
    } finally {
      setLoadingCosts(false);
    }
  };

  useEffect(() => {
    loadCostsDoc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueId]);

  // Ensure selected asset has a costs object
  useEffect(() => {
    if (!doc || !selectedAssetId) return;
    const assetKey = String(selectedAssetId);
    if (doc.assets?.[assetKey]) {
      // Normalize in case legacy data is present
      setDoc((prev) => {
        if (!prev) return prev;
        const existing = prev.assets?.[assetKey];
        const normalizedExisting = normalizeAssetCosts(existing);
        if (JSON.stringify(existing) === JSON.stringify(normalizedExisting)) return prev;
        return {
          ...prev,
          assets: {
            ...(prev.assets || {}),
            [assetKey]: normalizedExisting,
          },
        };
      });
      return;
    }

    const nowYear = new Date().getFullYear();
    setDoc((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        assets: {
          ...(prev.assets || {}),
          [assetKey]: normalizeAssetCosts(createEmptyAssetCosts(nowYear)),
        },
      };
    });
  }, [doc, selectedAssetId]);

  const currentAssetCosts = useMemo(() => {
    if (!doc || !selectedAssetId) return null;
    return doc.assets?.[String(selectedAssetId)] || null;
  }, [doc, selectedAssetId]);

  const selectedAsset = useMemo(() => {
    if (!selectedAssetId) return null;
    return assets.find((a) => String(a.asset_id) === String(selectedAssetId)) || null;
  }, [assets, selectedAssetId]);

  const defaultOpexRange = useMemo(() => {
    const start = toDateInputValue(selectedAsset?.OperatingStartDate);
    const end = addYearsToDateInput(start, selectedAsset?.assetLife || 25);
    return { startDate: start, endDate: end };
  }, [selectedAsset]);

  const capexTotals = useMemo(() => {
    const groups = currentAssetCosts?.capex?.groups || [];
    const groupTotals = groups.map((g) => ({ groupId: g.id, ...computeGroupTotals(g) }));
    const total = groupTotals.reduce((sum, gt) => sum + gt.total, 0);
    const months = parseInt(currentAssetCosts?.capex?.construction_duration_months) || 0;
    const avgMonthly = months > 0 ? total / months : 0;
    return { total, months, avgMonthly, groupTotals };
  }, [currentAssetCosts]);

  const opexTotals = useMemo(() => {
    const groups = currentAssetCosts?.opex?.groups || [];
    const groupTotals = groups.map((g) => ({ groupId: g.id, ...computeGroupTotals(g) }));
    const total = groupTotals.reduce((sum, gt) => sum + gt.total, 0);
    return { total, groupTotals };
  }, [currentAssetCosts]);

  const updateAssetCosts = (updater) => {
    setDoc((prev) => {
      if (!prev || !selectedAssetId) return prev;
      const assetKey = String(selectedAssetId);
      const existingRaw = prev.assets?.[assetKey] || createEmptyAssetCosts(new Date().getFullYear());
      const existing = normalizeAssetCosts(existingRaw);
      const nextAsset = normalizeAssetCosts(updater(existing));
      return {
        ...prev,
        assets: {
          ...(prev.assets || {}),
          [assetKey]: nextAsset,
        },
      };
    });
  };

  const addGroup = () => {
    updateAssetCosts((assetCosts) => {
      const target = activeTab === 'capex' ? assetCosts.capex : assetCosts.opex;
      const newGroup = {
        id: newId(),
        name: 'New Group',
        upliftPct: 0,
        items: [],
      };
      const next = { ...target, groups: [...(target.groups || []), newGroup] };
      return activeTab === 'capex' ? { ...assetCosts, capex: next } : { ...assetCosts, opex: next };
    });
  };

  const deleteGroup = (groupId) => {
    updateAssetCosts((assetCosts) => {
      const target = activeTab === 'capex' ? assetCosts.capex : assetCosts.opex;
      const next = { ...target, groups: (target.groups || []).filter((g) => g.id !== groupId) };
      return activeTab === 'capex' ? { ...assetCosts, capex: next } : { ...assetCosts, opex: next };
    });
  };

  const renameGroup = (groupId, name) => {
    updateAssetCosts((assetCosts) => {
      const target = activeTab === 'capex' ? assetCosts.capex : assetCosts.opex;
      const next = {
        ...target,
        groups: (target.groups || []).map((g) => (g.id === groupId ? { ...g, name } : g)),
      };
      return activeTab === 'capex' ? { ...assetCosts, capex: next } : { ...assetCosts, opex: next };
    });
  };

  const addItem = (groupId) => {
    updateAssetCosts((assetCosts) => {
      const nowYear = new Date().getFullYear();
      const target = activeTab === 'capex' ? assetCosts.capex : assetCosts.opex;
      const nextGroups = (target.groups || []).map((g) => {
        if (g.id !== groupId) return g;
        const baseItem =
          activeTab === 'capex'
            ? { id: newId(), label: 'New Item', value: 0, monthlyAllocations: [] }
            : {
                id: newId(),
                label: 'New Item',
                value: 0,
                units: 'AUD M p.a.',
                escalationMethod: 'CPI',
                escalationPct: DEFAULT_OPEX_ESCALATION_PCT,
                flexPct: 0,
                referenceYear: assetCosts.opex?.reference_year || nowYear,
                startDate: defaultOpexRange.startDate,
                endDate: defaultOpexRange.endDate,
              };
        return { ...g, items: [...(g.items || []), baseItem] };
      });
      const next = { ...target, groups: nextGroups };
      return activeTab === 'capex' ? { ...assetCosts, capex: next } : { ...assetCosts, opex: next };
    });
  };

  const deleteItem = (groupId, itemId) => {
    updateAssetCosts((assetCosts) => {
      const target = activeTab === 'capex' ? assetCosts.capex : assetCosts.opex;
      const nextGroups = (target.groups || []).map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, items: (g.items || []).filter((i) => i.id !== itemId) };
      });
      const next = { ...target, groups: nextGroups };
      return activeTab === 'capex' ? { ...assetCosts, capex: next } : { ...assetCosts, opex: next };
    });
  };

  const updateItem = (groupId, itemId, patch) => {
    updateAssetCosts((assetCosts) => {
      const target = activeTab === 'capex' ? assetCosts.capex : assetCosts.opex;
      const nextGroups = (target.groups || []).map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: (g.items || []).map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
        };
      });
      const next = { ...target, groups: nextGroups };
      return activeTab === 'capex' ? { ...assetCosts, capex: next } : { ...assetCosts, opex: next };
    });
  };

  const setConstructionMonths = (months) => {
    const monthsInt = parseInt(months) || 0;
    updateAssetCosts((assetCosts) => {
      // When construction months change, ensure all CAPEX items have the right number of monthly allocations
      const groups = (assetCosts.capex?.groups || []).map((g) => ({
        ...g,
        items: (g.items || []).map((i) => {
          const currentAllocs = Array.isArray(i.monthlyAllocations) ? i.monthlyAllocations : [];
          const newAllocs = Array.from({ length: monthsInt }, (_, idx) => currentAllocs[idx] || 0);
          return { ...i, monthlyAllocations: newAllocs };
        }),
      }));
      return {
        ...assetCosts,
        capex: {
          ...assetCosts.capex,
          construction_duration_months: monthsInt,
          groups,
        },
      };
    });
  };

  const updateMonthlyAllocation = (groupId, itemId, monthIndex, inputValue) => {
    const parsedValue = parseFormulaOrValue(inputValue);
    updateAssetCosts((assetCosts) => {
      const target = assetCosts.capex;
      const nextGroups = (target.groups || []).map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: (g.items || []).map((i) => {
            if (i.id !== itemId) return i;
            const allocs = Array.isArray(i.monthlyAllocations) ? [...i.monthlyAllocations] : [];
            while (allocs.length <= monthIndex) allocs.push(0);
            allocs[monthIndex] = parsedValue;
            return { ...i, monthlyAllocations: allocs };
          }),
        };
      });
      return { ...assetCosts, capex: { ...target, groups: nextGroups } };
    });
  };

  const getMonthlyAllocationTotal = (item) => {
    const allocs = Array.isArray(item?.monthlyAllocations) ? item.monthlyAllocations : [];
    const totalDollars = allocs.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const itemValue = parseFloat(item.value) || 0;
    if (itemValue === 0) return 0;
    return (totalDollars / itemValue) * 100; // Return as percentage of input value
  };

  const ensureOpexDates = () => {
    if (activeTab !== 'opex') return;
    updateAssetCosts((assetCosts) => {
      const target = assetCosts.opex;
      const nextGroups = (target.groups || []).map((g) => ({
        ...g,
        items: (g.items || []).map((i) => ({
          ...i,
          startDate: i.startDate || defaultOpexRange.startDate,
          endDate: i.endDate || defaultOpexRange.endDate,
        })),
      }));
      return { ...assetCosts, opex: { ...target, groups: nextGroups } };
    });
  };

  useEffect(() => {
    // When asset changes, make sure any existing OPEX rows have defaults filled.
    if (!defaultOpexRange.startDate) return;
    ensureOpexDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssetId, defaultOpexRange.startDate, defaultOpexRange.endDate]);

  const saveToMongo = async () => {
    if (!doc) return;
    setSaving(true);
    setStatus({ type: null, message: '' });
    try {
      // Scrub deprecated upliftPct fields before saving (we'll add later if needed)
      const scrubbedAssets = Object.fromEntries(
        Object.entries(doc.assets || {}).map(([assetId, assetCosts]) => {
          const capex = assetCosts?.capex;
          const opex = assetCosts?.opex;
          const scrubSection = (section) => ({
            ...section,
            groups: Array.isArray(section?.groups)
              ? section.groups.map((g) => {
                  // eslint-disable-next-line no-unused-vars
                  const { upliftPct, ...rest } = g || {};
                  return rest;
                })
              : [],
          });
          return [
            assetId,
            {
              ...assetCosts,
              capex: scrubSection(capex),
              opex: scrubSection(opex),
            },
          ];
        })
      );

      const response = await fetch('/api/portfolio-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unique_id: uniqueId, assets: scrubbedAssets }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || err?.details || `HTTP ${response.status}`);
      }
      await response.json().catch(() => ({}));
      setStatus({ type: 'success', message: 'Costs saved to MongoDB.' });
      setDoc((prev) => (prev ? { ...prev, assets: scrubbedAssets } : prev));
      setOriginalDoc((prev) => (doc ? JSON.parse(JSON.stringify({ ...doc, assets: scrubbedAssets })) : prev));
    } catch (e) {
      console.error('Failed to save costs:', e);
      setStatus({ type: 'error', message: `Failed to save: ${e.message}` });
    } finally {
      setSaving(false);
    }
  };

  const revertChanges = async () => {
    if (!window.confirm('Revert all unsaved changes?')) return;
    await loadCostsDoc();
  };

  if (assetsLoading || loadingCosts || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Costs</h1>
              <p className="text-gray-600 mt-1">Build CAPEX and OPEX line items per asset (stored in MongoDB)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                <AlertCircle className="w-3 h-3 mr-1" />
                Unsaved Changes
              </span>
            )}
            {hasUnsavedChanges && (
              <button
                onClick={revertChanges}
                className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Revert
              </button>
            )}
            <button
              onClick={saveToMongo}
              disabled={saving || !hasUnsavedChanges}
              className={`px-4 py-2 rounded-md text-white flex items-center gap-2 ${
                hasUnsavedChanges ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Status */}
        {status.type && (
          <div
            className={`p-4 rounded-lg border flex items-center space-x-2 ${
              status.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{status.message}</span>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Asset</label>
              <select
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                disabled={assets.length === 0}
              >
                {assets.length === 0 ? (
                  <option value="">No assets found</option>
                ) : (
                  assets.map((a) => (
                    <option key={a.asset_id} value={String(a.asset_id)}>
                      {a.asset_name || a.name || `Asset ${a.asset_id}`}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Summary (moved up next to asset selector) */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Summary</div>
              {activeTab === 'capex' ? (
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="flex justify-between gap-3">
                    <span>Total CAPEX</span>
                    <span className="font-semibold">{capexTotals.total === 0 ? '-' : formatCurrencyFromMillions(capexTotals.total, currencyUnit)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Construction (months)</span>
                    <span>{capexTotals.months || 0}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Avg / month</span>
                    <span>{capexTotals.avgMonthly === 0 ? '-' : formatCurrencyFromMillions(capexTotals.avgMonthly, currencyUnit)}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="flex justify-between gap-3">
                    <span>Total OPEX (ref year)</span>
                    <span className="font-semibold">{opexTotals.total === 0 ? '-' : formatCurrencyFromMillions(opexTotals.total, currencyUnit)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Ref year</span>
                    <span>{currentAssetCosts?.opex?.reference_year ?? new Date().getFullYear()}</span>
                  </div>
                  <div className="text-xs text-gray-500 pt-1">
                    Dates/indexation stored only (not used in model yet).
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tab switch */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {[
                { id: 'capex', label: 'CAPEX' },
                { id: 'opex', label: 'OPEX' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`py-3 border-b-2 font-medium text-sm ${
                    activeTab === t.id ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab header fields */}
          {activeTab === 'capex' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Construction duration (months)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={currentAssetCosts?.capex?.construction_duration_months ?? 18}
                  onChange={(e) => setConstructionMonths(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div />
              <div />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OPEX reference year</label>
                <input
                  type="number"
                  step="1"
                  value={currentAssetCosts?.opex?.reference_year ?? new Date().getFullYear()}
                  onChange={(e) => {
                    const year = parseInt(e.target.value) || new Date().getFullYear();
                    updateAssetCosts((assetCosts) => ({
                      ...assetCosts,
                      opex: {
                        ...assetCosts.opex,
                        reference_year: year,
                      },
                    }));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">Each line can override this year + escalation %</p>
              </div>
              <div />
              <div />
            </div>
          )}
        </div>

        {/* CAPEX / OPEX tables */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {activeTab === 'capex' ? 'CAPEX sections' : 'OPEX groups'}
              </h2>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    {activeTab === 'capex' ? (
                      <>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <span style={{ minWidth: '200px' }}>Section</span>
                              <button
                                onClick={addGroup}
                                className="px-2 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
                                title="Add section"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Input value ($M)</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total %</th>
                          {Array.from({ length: currentAssetCosts?.capex?.construction_duration_months || 0 }, (_, i) => (
                            <th key={`cm_${i}`} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              CM{i + 1}
                            </th>
                          ))}
                          <th className="px-3 py-2" />
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fixed costs</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escalation</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied amount</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                        <th className="px-3 py-2" />
                      </tr>
                    )}
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(activeTab === 'capex' ? currentAssetCosts?.capex?.groups : currentAssetCosts?.opex?.groups)?.flatMap((group) => {
                      const totals = computeGroupTotals(group);

                      if (activeTab === 'capex') {
                        const sectionLabelKey = `group_${group.id}`;
                        const isEditingSection = editingLabel === sectionLabelKey;
                        
                        const sectionRow = (
                          <tr key={`s_${group.id}`} className="bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {isEditingSection ? (
                                  <input
                                    type="text"
                                    value={group.name}
                                    onChange={(e) => renameGroup(group.id, e.target.value)}
                                    onBlur={() => setEditingLabel(null)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.target.blur();
                                      }
                                    }}
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                                    style={{ minWidth: '200px' }}
                                    placeholder="Section label"
                                    autoFocus
                                  />
                                ) : (
                                  <div
                                    onDoubleClick={() => setEditingLabel(sectionLabelKey)}
                                    className="flex-1 p-2 border border-transparent rounded-md text-sm font-semibold cursor-pointer hover:bg-gray-100"
                                    style={{ minWidth: '200px' }}
                                  >
                                    {group.name}
                                  </div>
                                )}
                                <button
                                  onClick={() => addItem(group.id)}
                                  className="px-2 py-2 rounded-md bg-gray-900 text-white hover:bg-black"
                                  title="Add item"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500">—</td>
                            <td className="px-3 py-2 text-sm text-gray-500">—</td>
                            {Array.from({ length: currentAssetCosts?.capex?.construction_duration_months || 0 }, (_, i) => (
                              <td key={`section_cm_${i}`} className="px-2 py-2 text-sm text-gray-500">—</td>
                            ))}
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => deleteGroup(group.id)}
                                className="px-2 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                title="Delete section"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );

                        const itemRows = (group.items || []).map((item) => {
                          const value = parseFloat(item.value) || 0;
                          const allocs = Array.isArray(item.monthlyAllocations) ? item.monthlyAllocations : [];
                          const months = currentAssetCosts?.capex?.construction_duration_months || 0;
                          const totalPct = getMonthlyAllocationTotal(item);
                          const isPctValid = Math.abs(totalPct - 100) < 0.01;
                          const itemLabelKey = `item_${group.id}_${item.id}`;
                          const isEditingItem = editingLabel === itemLabelKey;
                          
                          return (
                            <tr key={`i_${group.id}_${item.id}`} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                {isEditingItem ? (
                                  <input
                                    type="text"
                                    value={item.label}
                                    onChange={(e) => updateItem(group.id, item.id, { label: e.target.value })}
                                    onBlur={() => setEditingLabel(null)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.target.blur();
                                      }
                                    }}
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                    style={{ minWidth: '200px', marginLeft: '20px' }}
                                    placeholder="Item label"
                                    autoFocus
                                  />
                                ) : (
                                  <div
                                    onDoubleClick={() => setEditingLabel(itemLabelKey)}
                                    className="p-2 border border-transparent rounded-md text-sm cursor-pointer hover:bg-gray-100"
                                    style={{ minWidth: '200px', marginLeft: '20px' }}
                                  >
                                    {item.label}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {(() => {
                                  const value = parseFloat(item.value) || 0;
                                  const inputKey = `${group.id}_${item.id}_value`;
                                  const tempValue = tempValueInputs[inputKey];
                                  // Show temp value while typing, or actual value (formatted) when not typing
                                  const displayValue = tempValue !== undefined 
                                    ? tempValue 
                                    : (value === 0 ? '' : String(value));
                                  return (
                                    <input
                                      type="text"
                                      value={displayValue}
                                      onChange={(e) => {
                                        // Update temporary value while typing (don't calculate yet)
                                        setTempValueInputs(prev => ({ ...prev, [inputKey]: e.target.value }));
                                      }}
                                      onBlur={(e) => {
                                        // Commit the value when user leaves the field (Excel-like)
                                        const parsed = parseFormulaOrValue(e.target.value);
                                        updateItem(group.id, item.id, { value: parsed });
                                        // Clear temporary value after committing
                                        setTempValueInputs(prev => {
                                          const next = { ...prev };
                                          delete next[inputKey];
                                          return next;
                                        });
                                      }}
                                      onKeyDown={(e) => {
                                        // Commit on Enter key
                                        if (e.key === 'Enter') {
                                          e.target.blur();
                                        }
                                      }}
                                      className="w-full p-2 border border-gray-300 rounded-md text-sm text-center"
                                      style={{ minWidth: '100px' }}
                                    />
                                  );
                                })()}
                              </td>
                              <td className="px-3 py-2 text-center text-sm">
                                <span className={`font-medium ${isPctValid ? 'text-gray-700' : 'text-red-600'}`}>
                                  {totalPct === 0 ? '-' : totalPct.toFixed(2) + '%'}
                                </span>
                              </td>
                              {Array.from({ length: months }, (_, i) => {
                                const allocValue = parseFloat(allocs[i]) || 0;
                                const inputKey = `${group.id}_${item.id}_${i}`;
                                const tempValue = tempPctInputs[inputKey];
                                // Show temp value while typing, or actual value (formatted) when not typing
                                const displayValue = tempValue !== undefined 
                                  ? tempValue 
                                  : (allocValue === 0 ? '' : String(allocValue));
                                return (
                                  <td key={`alloc_${i}`} className="px-2 py-2">
                                    <input
                                      type="text"
                                      value={displayValue}
                                      onChange={(e) => {
                                        // Update temporary value while typing (don't calculate yet)
                                        setTempPctInputs(prev => ({ ...prev, [inputKey]: e.target.value }));
                                      }}
                                      onBlur={(e) => {
                                        // Commit the value when user leaves the field (Excel-like)
                                        const parsed = parseFormulaOrValue(e.target.value);
                                        updateMonthlyAllocation(group.id, item.id, i, parsed);
                                        // Clear temporary value after committing
                                        setTempPctInputs(prev => {
                                          const next = { ...prev };
                                          delete next[inputKey];
                                          return next;
                                        });
                                      }}
                                      onKeyDown={(e) => {
                                        // Commit on Enter key
                                        if (e.key === 'Enter') {
                                          e.target.blur();
                                        }
                                      }}
                                      className="w-full p-2 border border-gray-300 rounded-md text-sm text-center"
                                      style={{ minWidth: '80px' }}
                                    />
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={() => deleteItem(group.id, item.id)}
                                  className="px-2 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                  title="Delete item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        });

                        // Add summary row showing section total
                        // Calculate monthly totals for each CM (now storing dollar values directly)
                        const months = currentAssetCosts?.capex?.construction_duration_months || 0;
                        const monthlyTotals = Array.from({ length: months }, (_, cmIndex) => {
                          return (group.items || []).reduce((sum, item) => {
                            const allocs = Array.isArray(item.monthlyAllocations) ? item.monthlyAllocations : [];
                            const dollarValue = parseFloat(allocs[cmIndex]) || 0;
                            return sum + dollarValue;
                          }, 0);
                        });
                        
                        const summaryRow = (
                          <tr key={`summary_${group.id}`} className="bg-gray-100 border-t-2 border-gray-300">
                            <td className="px-3 py-2 text-sm font-semibold text-gray-700">
                              <div style={{ marginLeft: '20px' }}>
                                Total
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800">
                              {totals.total === 0 ? '-' : formatCurrencyFromMillions(totals.total, currencyUnit)}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500">—</td>
                            {Array.from({ length: months }, (_, i) => (
                              <td key={`summary_cm_${i}`} className="px-2 py-2 text-sm text-gray-500 text-center">
                                —
                              </td>
                            ))}
                            <td className="px-3 py-2"></td>
                          </tr>
                        );

                        return [sectionRow, ...itemRows, summaryRow];
                      }

                      // OPEX: stack item labels under group label
                      const opexGroupLabelKey = `group_${group.id}`;
                      const isEditingOpexGroup = editingLabel === opexGroupLabelKey;
                      
                      const groupRow = (
                        <tr key={`g_${group.id}`} className="bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {isEditingOpexGroup ? (
                                <input
                                  type="text"
                                  value={group.name}
                                  onChange={(e) => renameGroup(group.id, e.target.value)}
                                  onBlur={() => setEditingLabel(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.target.blur();
                                    }
                                  }}
                                  className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                                  autoFocus
                                />
                              ) : (
                                <div
                                  onDoubleClick={() => setEditingLabel(opexGroupLabelKey)}
                                  className="flex-1 p-2 border border-transparent rounded-md text-sm font-semibold cursor-pointer hover:bg-gray-100"
                                >
                                  {group.name}
                                </div>
                              )}
                              <button
                                onClick={() => addItem(group.id)}
                                className="px-2 py-2 rounded-md bg-gray-900 text-white hover:bg-black"
                                title="Add line to group"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-500">—</td>
                          <td className="px-3 py-2 text-sm text-gray-500">—</td>
                          <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800">
                            {totals.total === 0 ? '-' : formatCurrencyFromMillions(totals.total, currencyUnit)}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">
                            {selectedAsset?.OperatingStartDate ? formatDateDDMMYYYY(selectedAsset.OperatingStartDate) : '—'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">
                            {selectedAsset?.OperatingStartDate && selectedAsset?.assetLife 
                              ? (() => {
                                  const startDate = new Date(selectedAsset.OperatingStartDate);
                                  startDate.setFullYear(startDate.getFullYear() + (selectedAsset.assetLife || 0));
                                  return formatDateDDMMYYYY(startDate);
                                })()
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => deleteGroup(group.id)}
                              className="px-2 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                              title="Delete group"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );

                      const itemRows = (group.items || []).map((item) => {
                        const amount = parseFloat(item.value) || 0;
                        const appliedAmount = amount; // No flex % anymore
                        const opexItemLabelKey = `item_${group.id}_${item.id}`;
                        const isEditingOpexItem = editingLabel === opexItemLabelKey;
                        
                        return (
                          <tr key={`i_${group.id}_${item.id}`} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              {isEditingOpexItem ? (
                                <input
                                  type="text"
                                  value={item.label}
                                  onChange={(e) => updateItem(group.id, item.id, { label: e.target.value })}
                                  onBlur={() => setEditingLabel(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.target.blur();
                                    }
                                  }}
                                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                  style={{ marginLeft: '20px' }}
                                  autoFocus
                                />
                              ) : (
                                <div
                                  onDoubleClick={() => setEditingLabel(opexItemLabelKey)}
                                  className="p-2 border border-transparent rounded-md text-sm cursor-pointer hover:bg-gray-100"
                                  style={{ marginLeft: '20px' }}
                                >
                                  {item.label}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={item.escalationMethod || 'CPI'}
                                onChange={(e) => updateItem(group.id, item.id, { escalationMethod: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                              >
                                <option value="CPI">CPI</option>
                                <option value="custom">Custom %</option>
                              </select>
                              {item.escalationMethod === 'custom' && (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={item.escalationPct ?? DEFAULT_OPEX_ESCALATION_PCT}
                                  onChange={(e) => updateItem(group.id, item.id, { escalationPct: parseFloat(e.target.value) || 0 })}
                                  className="w-full p-1 border border-gray-300 rounded-md text-xs mt-1"
                                  placeholder="Escalation %"
                                />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="0.1"
                                value={amount}
                                onChange={(e) => updateItem(group.id, item.id, { value: parseFloat(e.target.value) || 0 })}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                              {appliedAmount === 0 ? '-' : formatCurrencyFromMillions(appliedAmount, currencyUnit)}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="date"
                                value={item.startDate || defaultOpexRange.startDate || ''}
                                onChange={(e) => updateItem(group.id, item.id, { startDate: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="date"
                                value={item.endDate || ''}
                                onChange={(e) => updateItem(group.id, item.id, { endDate: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => deleteItem(group.id, item.id)}
                                className="px-2 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                title="Delete line"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      });

                      return [groupRow, ...itemRows];
                    }) || (
                      <tr>
                        <td
                          colSpan={activeTab === 'capex' ? (4 + (currentAssetCosts?.capex?.construction_duration_months || 18)) : 7}
                          className="px-3 py-10 text-center text-sm text-gray-500"
                        >
                          {activeTab === 'capex' ? 'No sections yet — click "Add section".' : 'No groups yet — click "Add group".'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        </div>

        {/* Save status (kept, but simplified) */}
        <div
          className={`border rounded-lg p-4 ${
            hasUnsavedChanges ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges ? (
              <AlertCircle className="w-5 h-5 text-orange-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            <span className={`font-medium ${hasUnsavedChanges ? 'text-orange-800' : 'text-green-800'}`}>
              {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
            </span>
          </div>
          {hasUnsavedChanges && (
            <div className="mt-2 text-sm text-orange-700">
              Changes are local until you click <span className="font-medium">Save</span>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


