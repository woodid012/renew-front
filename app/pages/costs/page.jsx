'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, DollarSign, Loader2, Plus, Save, X, Trash2 } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useDisplaySettings } from '../../context/DisplaySettingsContext';
import { formatCurrencyFromMillions } from '../../utils/currencyFormatter';

const DEFAULT_OPEX_ESCALATION_PCT = 2.5;

function newId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

function createEmptyAssetCosts(nowYear = new Date().getFullYear()) {
  return {
    capex: {
      construction_duration_months: 18,
      groups: [
        {
          id: newId(),
          name: 'EPC',
          items: [
            { id: newId(), label: 'Equipment', value: 0 },
            { id: newId(), label: 'Installation', value: 0 },
          ],
        },
        {
          id: newId(),
          name: "Owner's Costs",
          items: [{ id: newId(), label: 'Development', value: 0 }],
        },
        {
          id: newId(),
          name: 'Transaction Costs',
          items: [{ id: newId(), label: 'Legal / Advisory', value: 0 }],
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
              referenceYear: nowYear,
              escalationPct: DEFAULT_OPEX_ESCALATION_PCT,
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
      referenceYear: i.referenceYear,
      escalationPct: i.escalationPct,
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

  const [activeTab, setActiveTab] = useState('capex'); // capex | opex
  const [selectedAssetId, setSelectedAssetId] = useState('');

  const [loadingCosts, setLoadingCosts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  const [originalDoc, setOriginalDoc] = useState(null);
  const [doc, setDoc] = useState(null);

  const uniqueId = useMemo(() => {
    const uid = getPortfolioUniqueId(selectedPortfolio) || selectedPortfolio || 'ZEBRE';
    return uid;
  }, [getPortfolioUniqueId, selectedPortfolio]);

  const hasUnsavedChanges = useMemo(() => {
    if (!originalDoc || !doc) return false;
    return JSON.stringify(originalDoc.assets || {}) !== JSON.stringify(doc.assets || {});
  }, [originalDoc, doc]);

  useEffect(() => {
    const fetchAssets = async () => {
      setAssetsLoading(true);
      try {
        const response = await fetch(`/api/assets?unique_id=${encodeURIComponent(uniqueId)}`);
        if (response.ok) {
          const data = await response.json();
          setAssets(Array.isArray(data.assets) ? data.assets : []);
        } else {
          setAssets([]);
        }
      } catch (e) {
        console.error('Failed to fetch assets:', e);
        setAssets([]);
      } finally {
        setAssetsLoading(false);
      }
    };

    fetchAssets();
  }, [uniqueId]);

  useEffect(() => {
    if (!assetsLoading && assets.length > 0 && !selectedAssetId) {
      setSelectedAssetId(String(assets[0].asset_id));
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
            ? { id: newId(), label: 'New Item', value: 0 }
            : {
                id: newId(),
                label: 'New Item',
                value: 0,
                referenceYear: assetCosts.opex?.reference_year || nowYear,
                escalationPct: DEFAULT_OPEX_ESCALATION_PCT,
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
    updateAssetCosts((assetCosts) => ({
      ...assetCosts,
      capex: {
        ...assetCosts.capex,
        construction_duration_months: parseInt(months) || 0,
      },
    }));
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
                    <span className="font-semibold">{formatCurrencyFromMillions(capexTotals.total, currencyUnit)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Construction (months)</span>
                    <span>{capexTotals.months || 0}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Avg / month</span>
                    <span>{formatCurrencyFromMillions(capexTotals.avgMonthly, currencyUnit)}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="flex justify-between gap-3">
                    <span>Total OPEX (ref year)</span>
                    <span className="font-semibold">{formatCurrencyFromMillions(opexTotals.total, currencyUnit)}</span>
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

        {/* Groups + Items (Excel-like table) */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {activeTab === 'capex' ? 'CAPEX groups' : 'OPEX groups'}
              </h2>
              <button
                onClick={addGroup}
                className="px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add group
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group / Item</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value ($M)</th>
                      {activeTab === 'opex' && (
                        <>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref year</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escalation %</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                        </>
                      )}
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Row value</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(activeTab === 'capex' ? currentAssetCosts?.capex?.groups : currentAssetCosts?.opex?.groups)?.flatMap((group) => {
                      const totals = computeGroupTotals(group);
                      const groupRow = (
                        <tr key={`g_${group.id}`} className="bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={group.name}
                                onChange={(e) => renameGroup(group.id, e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white"
                              />
                              <button
                                onClick={() => addItem(group.id)}
                                className="px-2 py-2 rounded-md bg-gray-900 text-white hover:bg-black"
                                title="Add line to group"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Total {formatCurrencyFromMillions(totals.total, currencyUnit)}
                              <span className="font-medium text-gray-700">{formatCurrencyFromMillions(totals.total, currencyUnit)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-500">—</td>
                          {activeTab === 'opex' && (
                            <>
                              <td className="px-3 py-2 text-sm text-gray-500">—</td>
                              <td className="px-3 py-2 text-sm text-gray-500">—</td>
                              <td className="px-3 py-2 text-sm text-gray-500">—</td>
                              <td className="px-3 py-2 text-sm text-gray-500">—</td>
                            </>
                          )}
                          <td className="px-3 py-2 text-right text-sm text-gray-700">
                            {formatCurrencyFromMillions(totals.total, currencyUnit)}
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
                        const value = parseFloat(item.value) || 0;
                        return (
                          <tr key={`i_${group.id}_${item.id}`} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="pl-4">
                                <input
                                  type="text"
                                  value={item.label}
                                  onChange={(e) => updateItem(group.id, item.id, { label: e.target.value })}
                                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="0.1"
                                value={item.value ?? 0}
                                onChange={(e) => updateItem(group.id, item.id, { value: parseFloat(e.target.value) || 0 })}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                              />
                            </td>
                            {activeTab === 'opex' && (
                              <>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    step="1"
                                    value={item.referenceYear ?? currentAssetCosts?.opex?.reference_year ?? new Date().getFullYear()}
                                    onChange={(e) =>
                                      updateItem(group.id, item.id, { referenceYear: parseInt(e.target.value) || new Date().getFullYear() })
                                    }
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={item.escalationPct ?? DEFAULT_OPEX_ESCALATION_PCT}
                                    onChange={(e) => updateItem(group.id, item.id, { escalationPct: parseFloat(e.target.value) || 0 })}
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="date"
                                    value={item.startDate || ''}
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
                              </>
                            )}
                            <td className="px-3 py-2 text-right text-sm text-gray-700">
                              {formatCurrencyFromMillions(value, currencyUnit)}
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
                          colSpan={activeTab === 'opex' ? 8 : 4}
                          className="px-3 py-10 text-center text-sm text-gray-500"
                        >
                          No groups yet — click “Add group”.
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


