// app/pages/asset-inputs/detail/page.jsx
'use client'

import { useState, useEffect } from 'react';
import { usePortfolio } from '../../../context/PortfolioContext';
import { useDisplaySettings } from '../../../context/DisplaySettingsContext';
import { formatCurrencyFromMillions } from '../../../utils/currencyFormatter';
import AssetCards from './components/AssetCards';
import BulkEdit from './components/BulkEdit';
import ImportExport from './components/ImportExport';
import AssetForm from './components/AssetForm';
import {
  Plus,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Grid3X3,
  Table,
  Download
} from 'lucide-react';

const AssetsDetailPage = () => {
  const { selectedPortfolio, getPortfolioUniqueId } = usePortfolio();
  const { currencyUnit } = useDisplaySettings();
  
  // Original data from database
  const [originalAssets, setOriginalAssets] = useState({});
  const [originalConstants, setOriginalConstants] = useState({});
  const [originalPlatformName, setOriginalPlatformName] = useState('');

  // Local working state
  const [assets, setAssets] = useState({});
  const [constants, setConstants] = useState({});
  const [platformName, setPlatformName] = useState('');

  // UI state
  const [currentView, setCurrentView] = useState('cards'); // 'cards', 'bulk', 'import'
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [configDocId, setConfigDocId] = useState(null);
  const [platformID, setPlatformID] = useState('');
  const [platformInputs, setPlatformInputs] = useState(null);
  const [assetDefaults, setAssetDefaults] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    region: 'NSW',
    type: 'solar',
    capacity: '',
    assetLife: 25,
    volumeLossAdjustment: 95,
    annualDegradation: 0.5,
    constructionStartDate: '',
    constructionDuration: 18,
    OperatingStartDate: '',
    qtrCapacityFactor_q1: '',
    qtrCapacityFactor_q2: '',
    qtrCapacityFactor_q3: '',
    qtrCapacityFactor_q4: '',
    volume: '',
    contracts: []
  });

  // Helper function to safely get string values
  const safeValue = (value) => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  // Load asset data on component mount and when portfolio changes
  useEffect(() => {
    loadAssetData();
    loadDefaults();
  }, [selectedPortfolio]);

  // Listen for portfolio changes (backup for custom events)
  useEffect(() => {
    const handlePortfolioChange = (event) => {
      const newPortfolio = event.detail.portfolio;
      // Reload asset data when portfolio changes
      loadAssetData(newPortfolio);
    };

    window.addEventListener('portfolioChanged', handlePortfolioChange);
    return () => window.removeEventListener('portfolioChanged', handlePortfolioChange);
  }, []);

  const loadDefaults = async () => {
    try {
      const response = await fetch('/api/asset-defaults');
      if (response.ok) {
        const data = await response.json();
        setAssetDefaults(data);
      }
    } catch (error) {
      console.error('Error loading asset defaults:', error);
    }
  };

  // Check for changes when local state updates
  useEffect(() => {
    const assetsChanged = JSON.stringify(assets) !== JSON.stringify(originalAssets);
    const constantsChanged = JSON.stringify(constants) !== JSON.stringify(originalConstants);
    const nameChanged = platformName !== originalPlatformName;

    setHasUnsavedChanges(assetsChanged || constantsChanged || nameChanged);
  }, [assets, constants, platformName, originalAssets, originalConstants, originalPlatformName]);

  const loadAssetData = async (portfolio = null) => {
    setLoading(true);
    try {
      // Use portfolio from context or parameter
      const portfolioToUse = portfolio || selectedPortfolio || 'ZEBRE';
      const uniqueId = getPortfolioUniqueId(portfolioToUse);
      if (!uniqueId) {
        console.error('Assets detail page - No unique_id found for portfolio:', portfolioToUse);
        setLoading(false);
        return;
      }
      const response = await fetch(`/api/get-asset-data?unique_id=${encodeURIComponent(uniqueId)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch asset data');
      }
      const data = await response.json();
      console.log(`Loaded data for portfolio: ${data.PlatformName}, requested: ${portfolioToUse}, assets count: ${data.asset_inputs?.length || 0}`);

      // Verify the returned data matches the requested portfolio
      if (data.PlatformName !== portfolioToUse) {
        console.warn(`Portfolio mismatch! Requested: ${portfolioToUse}, Got: ${data.PlatformName}`);
      }

      // Convert array to object format with asset.id as key
      const assetsObject = {};
      const constantsObject = { assetCosts: {} };

      // Ensure asset_inputs is an array
      const assetInputs = Array.isArray(data.asset_inputs) ? data.asset_inputs : [];

      assetInputs.forEach(asset => {
        // Calculate durationHours for storage assets if not set
        let processedAsset = {
          ...asset,
          // Map database fields to match component expectations
          state: asset.region || 'NSW',
          assetStartDate: asset.OperatingStartDate
        };

        // Auto-calculate durationHours for storage assets
        if (asset.type === 'storage' && (!asset.durationHours || asset.durationHours === '')) {
          const volume = parseFloat(asset.volume) || 0;
          const capacity = parseFloat(asset.capacity) || 0;
          if (volume > 0 && capacity > 0) {
            processedAsset.durationHours = (volume / capacity).toFixed(2);
          }
        }

        assetsObject[asset.id] = processedAsset;

        // Extract cost assumptions to constants
        if (asset.costAssumptions) {
          constantsObject.assetCosts[asset.name] = asset.costAssumptions;
        }
      });

      // Set original data
      setOriginalAssets(assetsObject);
      setOriginalConstants(constantsObject);
      setOriginalPlatformName(data.PlatformName || '');

      // Set working data (copies)
      setAssets(JSON.parse(JSON.stringify(assetsObject)));
      setConstants(JSON.parse(JSON.stringify(constantsObject)));
      setPlatformName(data.PlatformName || '');

      // Set other platform data
      setConfigDocId(data._id);
      setPlatformID(data.PlatformID || '');
      setPlatformInputs(data.platformInputs || null);

      // Reset unsaved changes flag
      setHasUnsavedChanges(false);

    } catch (error) {
      console.error('Error loading asset data:', error);
      alert('Error fetching asset data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveAssetData = async () => {
    setSaving(true);
    try {
      // Convert assets object back to array format for database
      const assetInputsArray = Object.values(assets).map(asset => ({
        ...asset,
        // Map back to database field names
        region: asset.state || asset.region,
        OperatingStartDate: asset.assetStartDate || asset.OperatingStartDate,
        // Add cost assumptions from constants
        costAssumptions: constants.assetCosts[asset.name] || {}
      }));

      // If PlatformName has changed, update it separately using unique_id
      if (platformName !== originalPlatformName) {
        const portfolioToUse = selectedPortfolio || 'ZEBRE';
        const uniqueId = getPortfolioUniqueId(portfolioToUse);
        if (uniqueId) {
          const updateNameResponse = await fetch('/api/update-platform-name', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              unique_id: uniqueId,
              platformName: platformName,
            }),
          });

          const updateNameResult = await updateNameResponse.json();
          if (!updateNameResult.success) {
            throw new Error(updateNameResult.error || 'Failed to update PlatformName');
          }
        }
      }

      const dataToSave = {
        _id: configDocId,
        asset_inputs: assetInputsArray,
        PlatformName: platformName,
        PlatformID: platformID,
        platformInputs: platformInputs,
      };

      const response = await fetch('/api/save-asset-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.details || 'Failed to save asset data');
      }

      // Update original data to match current state
      setOriginalAssets(JSON.parse(JSON.stringify(assets)));
      setOriginalConstants(JSON.parse(JSON.stringify(constants)));
      setOriginalPlatformName(platformName);
      setHasUnsavedChanges(false);

      alert('Asset data saved successfully.');
      return true;
    } catch (error) {
      console.error('Error saving asset data:', error);
      alert('Error saving asset data: ' + error.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const revertChanges = () => {
    if (window.confirm('Are you sure you want to revert all unsaved changes?')) {
      setAssets(JSON.parse(JSON.stringify(originalAssets)));
      setConstants(JSON.parse(JSON.stringify(originalConstants)));
      setPlatformName(originalPlatformName);
      setHasUnsavedChanges(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let assetId;
      let updatedAssets;

      // Calculate durationHours for storage assets if not set
      const processedFormData = { ...formData };
      if (formData.type === 'storage') {
        const volume = parseFloat(formData.volume) || 0;
        const capacity = parseFloat(formData.capacity) || 0;
        if (volume > 0 && capacity > 0 && (!formData.durationHours || formData.durationHours === '')) {
          processedFormData.durationHours = (volume / capacity).toFixed(2);
        }
      }

      if (editingAsset) {
        assetId = editingAsset.id;
        updatedAssets = {
          ...assets,
          [assetId]: {
            ...processedFormData,
            id: assetId,
            lastUpdated: new Date().toISOString()
          }
        };
      } else {
        const existingIds = Object.keys(assets).map(id => parseInt(id)).filter(id => !isNaN(id));
        assetId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

        updatedAssets = {
          ...assets,
          [assetId]: {
            ...processedFormData,
            id: assetId,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }
        };
      }

      // Update local state
      setAssets(updatedAssets);

      // Update constants if needed
      if (!constants.assetCosts) {
        setConstants(prev => ({ ...prev, assetCosts: {} }));
      }

      if (!constants.assetCosts || !constants.assetCosts[formData.name]) {
        const defaultCosts = getDefaultAssetCosts(formData.type, formData.capacity);
        setConstants(prev => ({
          ...prev,
          assetCosts: {
            ...prev.assetCosts,
            [formData.name]: defaultCosts
          }
        }));
      }

      resetForm();
    } catch (error) {
      console.error('Error saving asset:', error);
      alert('Error saving asset: ' + error.message);
    }
  };

  const getDefaultAssetCosts = (type, capacity) => {
    // Use loaded defaults if available
    if (assetDefaults && assetDefaults.assetDefaults && assetDefaults.assetDefaults[type]) {
      const defaults = assetDefaults.assetDefaults[type].costAssumptions;
      const cap = parseFloat(capacity) || 100;

      return {
        capex: Math.round((defaults.capexPerMW || 1.0) * cap * 10) / 10,
        operatingCosts: Math.round((defaults.opexPerMWPerYear || 0.02) * cap * 100) / 100,
        operatingCostEscalation: defaults.operatingCostEscalation || 2.5,
        terminalValue: Math.round((defaults.terminalValuePerMW || 0) * cap * 10) / 10,
        maxGearing: defaults.maxGearing || 0.65,
        targetDSCRContract: defaults.targetDSCRContract || 1.4,
        targetDSCRMerchant: defaults.targetDSCRMerchant || 1.8,
        interestRate: defaults.interestRate || 0.06,
        tenorYears: defaults.tenorYears || 20,
        debtStructure: defaults.debtStructure || 'sculpting'
      };
    }

    const capexRates = { solar: 0.9, wind: 1.5, storage: 2.0 };
    const opexRates = { solar: 0.01, wind: 0.02, storage: 0.03 };

    const capex = (capexRates[type] || 1.0) * (capacity || 100);
    const operatingCosts = (opexRates[type] || 0.02) * (capacity || 100);

    return {
      capex: Math.round(capex * 10) / 10,
      operatingCosts: Math.round(operatingCosts * 100) / 100,
      operatingCostEscalation: 2.5,
      terminalValue: type === 'storage' ? Math.round(capacity * 0.5) : 0,
      maxGearing: type === 'solar' ? 0.7 : 0.65,
      targetDSCRContract: 1.4,
      targetDSCRMerchant: 1.8,
      interestRate: 0.06,
      tenorYears: 20,
      debtStructure: 'sculpting'
    };
  };

  const handleAddNew = () => {
    let initialData = {
      name: '', region: 'NSW', type: 'solar', capacity: '', assetLife: 25,
      volumeLossAdjustment: 95, annualDegradation: 0.5, constructionStartDate: '',
      constructionDuration: 18, OperatingStartDate: '', qtrCapacityFactor_q1: '',
      qtrCapacityFactor_q2: '', qtrCapacityFactor_q3: '', qtrCapacityFactor_q4: '',
      volume: '', durationHours: '', contracts: []
    };

    // Apply defaults if available
    if (assetDefaults && assetDefaults.assetDefaults) {
      const typeDefaults = assetDefaults.assetDefaults['solar'];
      if (typeDefaults) {
        initialData.assetLife = typeDefaults.assetLife;
        initialData.volumeLossAdjustment = typeDefaults.volumeLossAdjustment;
        initialData.annualDegradation = typeDefaults.annualDegradation;
        initialData.constructionDuration = typeDefaults.constructionDuration;

        if (typeDefaults.capacityFactors && typeDefaults.capacityFactors['NSW']) {
          const factors = typeDefaults.capacityFactors['NSW'];
          initialData.qtrCapacityFactor_q1 = factors.q1;
          initialData.qtrCapacityFactor_q2 = factors.q2;
          initialData.qtrCapacityFactor_q3 = factors.q3;
          initialData.qtrCapacityFactor_q4 = factors.q4;
        }
      }
    }

    setFormData(initialData);
    setEditingAsset(null);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingAsset(null);
    // We don't strictly need to reset formData here as it gets reset on open
  };

  const handleEdit = (asset) => {
    // Ensure all values are strings and handle null/undefined
    const cleanedAsset = {
      name: safeValue(asset.name),
      region: safeValue(asset.region || asset.state) || 'NSW',
      type: safeValue(asset.type) || 'solar',
      capacity: safeValue(asset.capacity),
      assetLife: asset.assetLife || 25,
      volumeLossAdjustment: asset.volumeLossAdjustment || 95,
      annualDegradation: asset.annualDegradation || 0.5,
      constructionStartDate: safeValue(asset.constructionStartDate),
      constructionDuration: asset.constructionDuration || 18,
      OperatingStartDate: safeValue(asset.OperatingStartDate || asset.assetStartDate),
      qtrCapacityFactor_q1: safeValue(asset.qtrCapacityFactor_q1),
      qtrCapacityFactor_q2: safeValue(asset.qtrCapacityFactor_q2),
      qtrCapacityFactor_q3: safeValue(asset.qtrCapacityFactor_q3),
      qtrCapacityFactor_q4: safeValue(asset.qtrCapacityFactor_q4),
      volume: safeValue(asset.volume),
      durationHours: safeValue(asset.durationHours) || (asset.type === 'storage' && asset.volume && asset.capacity && parseFloat(asset.volume) > 0 && parseFloat(asset.capacity) > 0
        ? (parseFloat(asset.volume) / parseFloat(asset.capacity)).toFixed(2)
        : ''),
      contracts: asset.contracts ? asset.contracts.map(contract => ({
        id: safeValue(contract.id) || Date.now().toString(),
        counterparty: safeValue(contract.counterparty),
        type: safeValue(contract.type) || 'bundled',
        buyersPercentage: contract.buyersPercentage || 100,
        strikePrice: safeValue(contract.strikePrice),
        indexation: contract.indexation || 2.5,
        indexationReferenceYear: contract.indexationReferenceYear || new Date().getFullYear(),
        startDate: safeValue(contract.startDate),
        endDate: safeValue(contract.endDate),
        hasFloor: contract.hasFloor || false,
        floorValue: safeValue(contract.floorValue),
        EnergyPrice: safeValue(contract.EnergyPrice),
        greenPrice: safeValue(contract.greenPrice)
      })) : []
    };

    // Prepopulate missing capacity factors from defaults if available
    if (assetDefaults && assetDefaults.assetDefaults && cleanedAsset.type !== 'storage') {
      const typeDefaults = assetDefaults.assetDefaults[cleanedAsset.type];
      if (typeDefaults && typeDefaults.capacityFactors) {
        const regionFactors = typeDefaults.capacityFactors[cleanedAsset.region];
        if (regionFactors) {
          if (!cleanedAsset.qtrCapacityFactor_q1) cleanedAsset.qtrCapacityFactor_q1 = regionFactors.q1;
          if (!cleanedAsset.qtrCapacityFactor_q2) cleanedAsset.qtrCapacityFactor_q2 = regionFactors.q2;
          if (!cleanedAsset.qtrCapacityFactor_q3) cleanedAsset.qtrCapacityFactor_q3 = regionFactors.q3;
          if (!cleanedAsset.qtrCapacityFactor_q4) cleanedAsset.qtrCapacityFactor_q4 = regionFactors.q4;
        }
      }
    }

    setFormData(cleanedAsset);
    setEditingAsset(asset);
    setShowForm(true);
  };

  const handleDelete = async (assetId) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      const updatedAssets = { ...assets };
      delete updatedAssets[assetId];
      setAssets(updatedAssets);

      if (constants.assetCosts && assets[assetId]) {
        const updatedConstants = { ...constants };
        if (updatedConstants.assetCosts) {
          delete updatedConstants.assetCosts[assets[assetId].name];
          setConstants(updatedConstants);
        }
      }
    }
  };

  const handleDuplicate = (asset) => {
    const newAsset = {
      name: `${safeValue(asset.name)} (Copy)`,
      region: safeValue(asset.region || asset.state) || 'NSW',
      type: safeValue(asset.type) || 'solar',
      capacity: safeValue(asset.capacity),
      assetLife: asset.assetLife || 25,
      volumeLossAdjustment: asset.volumeLossAdjustment || 95,
      annualDegradation: asset.annualDegradation || 0.5,
      constructionStartDate: safeValue(asset.constructionStartDate),
      constructionDuration: asset.constructionDuration || 18,
      OperatingStartDate: safeValue(asset.OperatingStartDate || asset.assetStartDate),
      qtrCapacityFactor_q1: safeValue(asset.qtrCapacityFactor_q1),
      qtrCapacityFactor_q2: safeValue(asset.qtrCapacityFactor_q2),
      qtrCapacityFactor_q3: safeValue(asset.qtrCapacityFactor_q3),
      qtrCapacityFactor_q4: safeValue(asset.qtrCapacityFactor_q4),
      volume: safeValue(asset.volume),
      contracts: asset.contracts ? asset.contracts.map(contract => ({
        id: Date.now().toString() + Math.random(),
        counterparty: safeValue(contract.counterparty),
        type: safeValue(contract.type) || 'bundled',
        buyersPercentage: contract.buyersPercentage || 100,
        strikePrice: safeValue(contract.strikePrice),
        indexation: contract.indexation || 2.5,
        indexationReferenceYear: contract.indexationReferenceYear || new Date().getFullYear(),
        startDate: safeValue(contract.startDate),
        endDate: safeValue(contract.endDate),
        hasFloor: contract.hasFloor || false,
        floorValue: safeValue(contract.floorValue),
        EnergyPrice: safeValue(contract.EnergyPrice),
        greenPrice: safeValue(contract.greenPrice)
      })) : []
    };
    setFormData(newAsset);
    setEditingAsset(null);
    setShowForm(true);
  };

  const calculateTotalCapacity = () => {
    return Object.values(assets).reduce((sum, asset) => sum + (parseFloat(asset.capacity) || 0), 0);
  };

  const calculateTotalValue = () => {
    return Object.values(constants.assetCosts || {}).reduce((sum, costs) => sum + (costs.capex || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading asset data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header with Save/Revert Controls */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2"
              placeholder="Platform Name"
            />
            {hasUnsavedChanges && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                <AlertCircle className="w-3 h-3 mr-1" />
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-gray-600">
            {Object.keys(assets).length} assets • {calculateTotalCapacity().toFixed(1)} MW •
            {formatCurrencyFromMillions(calculateTotalValue(), currencyUnit)} CAPEX
          </p>
          <p className="text-sm text-gray-500">
            Platform ID: {platformID} • MongoDB Asset Management
          </p>
        </div>
        <div className="flex space-x-3">
          {hasUnsavedChanges && (
            <button
              onClick={revertChanges}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200"
            >
              <X className="w-4 h-4" />
              <span>Revert</span>
            </button>
          )}
          <button
            onClick={saveAssetData}
            disabled={saving || !hasUnsavedChanges}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${hasUnsavedChanges
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
          <button
            onClick={handleAddNew}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* View Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'cards', label: 'Asset Cards', icon: Grid3X3 },
            { id: 'bulk', label: 'Bulk Edit', icon: Table },
            { id: 'import', label: 'Import/Export', icon: Download }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id)}
                className={`py-4 border-b-2 font-medium text-sm flex items-center space-x-2 ${currentView === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content - Conditional View */}
      {currentView === 'cards' && (
        <AssetCards
          assets={assets}
          constants={constants}
          setConstants={setConstants}
          setHasUnsavedChanges={setHasUnsavedChanges}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onAddNew={handleAddNew}
        />
      )}

      {currentView === 'bulk' && (
        <BulkEdit
          assets={assets}
          setAssets={setAssets}
          constants={constants}
          setConstants={setConstants}
          setHasUnsavedChanges={setHasUnsavedChanges}
          assetDefaults={assetDefaults}
        />
      )}

      {currentView === 'import' && (
        <ImportExport
          assets={assets}
          setAssets={setAssets}
          constants={constants}
          setConstants={setConstants}
          platformName={platformName}
          setPlatformName={setPlatformName}
          setHasUnsavedChanges={setHasUnsavedChanges}
        />
      )}

      {/* Asset Form Component */}
      <AssetForm
        showForm={showForm}
        editingAsset={editingAsset}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onCancel={resetForm}
        getDefaultAssetCosts={getDefaultAssetCosts}
        assetDefaults={assetDefaults}
      />

      {/* Status Information */}
      <div className={`border rounded-lg p-4 ${hasUnsavedChanges
        ? 'bg-orange-50 border-orange-200'
        : 'bg-green-50 border-green-200'
        }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges ? (
              <AlertCircle className="w-5 h-5 text-orange-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            <span className={`font-medium ${hasUnsavedChanges ? 'text-orange-800' : 'text-green-800'
              }`}>
              {hasUnsavedChanges
                ? 'You have unsaved changes - remember to save your work'
                : 'All changes saved to MongoDB'
              }
            </span>
          </div>
          <div className={`text-sm ${hasUnsavedChanges ? 'text-orange-600' : 'text-green-600'
            }`}>
            Current View: {currentView === 'cards' ? 'Asset Cards' : currentView === 'bulk' ? 'Bulk Edit' : 'Import/Export'}
          </div>
        </div>
        {hasUnsavedChanges && (
          <div className="mt-2 text-sm text-orange-700">
            Changes are kept locally until you save. Use the &quot;Save Changes&quot; button to persist your updates to MongoDB.
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetsDetailPage;





