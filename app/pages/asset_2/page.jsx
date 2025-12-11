'use client'
import { useState, useEffect } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'

export default function Asset2Page() {
  const { selectedPortfolio, getPortfolioUniqueId } = usePortfolio();
  const [assets, setAssets] = useState([]);
  const [originalAssets, setOriginalAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [configDocId, setConfigDocId] = useState(null);
  const [platformName, setPlatformName] = useState('');
  const [platformID, setPlatformID] = useState('');
  const [platformInputs, setPlatformInputs] = useState(null);

  useEffect(() => {
    const fetchAssetData = async () => {
      try {
        const portfolio = selectedPortfolio || 'ZEBRE';
        const uniqueId = getPortfolioUniqueId(portfolio);
        if (!uniqueId) {
          console.error('Asset 2 page - No unique_id found for portfolio:', portfolio);
          setLoading(false);
          return;
        }
        const response = await fetch(`/api/get-asset-data?unique_id=${encodeURIComponent(uniqueId)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch asset data');
        }
        const data = await response.json();
        setAssets(data.asset_inputs);
        setOriginalAssets(JSON.parse(JSON.stringify(data.asset_inputs))); // Deep copy for cancel
        setConfigDocId(data._id);
        setPlatformName(data.PlatformName || '');
        setPlatformID(data.PlatformID || '');
        setPlatformInputs(data.platformInputs || null);
      } catch (error) {
        alert('Error fetching asset data: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAssetData();
  }, [selectedPortfolio]);

  const handleAssetInputChange = (e, index) => {
    const { name, value } = e.target;
    const updatedAssets = [...assets];
    updatedAssets[index] = { ...updatedAssets[index], [name]: value };
    setAssets(updatedAssets);
  };

  const handleContractInputChange = (e, assetIndex, contractIndex) => {
    const { name, value } = e.target;
    const updatedAssets = [...assets];
    const updatedContracts = [...updatedAssets[assetIndex].contracts];
    updatedContracts[contractIndex] = { ...updatedContracts[contractIndex], [name]: value };
    updatedAssets[assetIndex].contracts = updatedContracts;
    setAssets(updatedAssets);
  };

  const handleNestedInputChange = (e, assetIndex, parentKey) => {
    const { name, value } = e.target;
    const updatedAssets = [...assets];
    updatedAssets[assetIndex] = {
      ...updatedAssets[assetIndex],
      [parentKey]: {
        ...updatedAssets[assetIndex][parentKey],
        [name]: value,
      },
    };
    setAssets(updatedAssets);
  };

  const handleSave = async () => {
    try {
      const portfolio = selectedPortfolio || 'ZEBRE';
      const uniqueId = getPortfolioUniqueId(portfolio);
      if (!uniqueId) {
        throw new Error('Portfolio unique_id not found');
      }

      // If PlatformName has changed, update it separately using unique_id
      const originalData = await fetch(`/api/get-asset-data?unique_id=${encodeURIComponent(uniqueId)}`).then(r => r.json());
      if (platformName !== originalData.PlatformName) {
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

      const dataToSave = {
        _id: configDocId,
        asset_inputs: assets,
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

      alert('Asset data saved.');
      setOriginalAssets(JSON.parse(JSON.stringify(assets))); // Update originalAssets with current assets
      setIsEditing(false);
    } catch (error) {
      alert('Error saving asset data: ' + error.message);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setAssets(JSON.parse(JSON.stringify(originalAssets)));
    setIsEditing(false);
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!assets || assets.length === 0) {
    return <div className="p-8">No asset data found.</div>;
  }

  const formatLabel = (key) => {
    if (key === 'assetStartDate') {
      return 'Operating Start Date';
    }
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); });
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Platform: {platformName}</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Platform Name:</label>
        <input
          type="text"
          value={platformName}
          onChange={(e) => setPlatformName(e.target.value)}
          readOnly={!isEditing}
          className={`mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${!isEditing ? 'bg-gray-100' : ''}`}
        />
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700">Platform ID:</label>
        <input
          type="text"
          value={platformID}
          onChange={(e) => setPlatformID(e.target.value)}
          readOnly={!isEditing}
          className={`mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${!isEditing ? 'bg-gray-100' : ''}`}
        />
      </div>
      <div className="flex border-b">
        {assets.map((asset, index) => (
          <button
            key={index}
            className={`px-4 py-2 -mb-px font-medium text-sm border-b-2 ${activeTab === index ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            onClick={() => setActiveTab(index)}
          >
            {asset.name}
          </button>
        ))}
      </div>
      <div className="pt-4">
        {assets.map((asset, index) => (
          <div key={index} className={`${activeTab === index ? 'block' : 'hidden'}`}>
            <div className="space-y-8">
              <h1 className="text-2xl font-bold">Asset Definition</h1>
              {Object.entries(asset).filter(([key]) => key !== '_id').map(([key, value]) => {
                if (key === 'contracts' && Array.isArray(value)) {
                  return (
                    <div key={key} className="space-y-4">
                      <h2 className="text-lg font-medium text-gray-900 mt-4 border-t pt-4">{formatLabel(key)}</h2>
                      {value.map((contract, contractIndex) => (
                        <div key={contractIndex} className="p-4 border rounded-md space-y-4">
                          <h3 className="text-md font-medium text-gray-800">Contract {contractIndex + 1}</h3>
                          {Object.entries(contract).map(([contractKey, contractValue]) => (
                            <div key={contractKey}>
                              <label className="block text-sm font-medium text-gray-700">{formatLabel(contractKey)}</label>
                              <input
                                name={contractKey}
                                value={contractValue === null ? '' : contractValue}
                                onChange={(e) => handleContractInputChange(e, index, contractIndex)}
                                readOnly={!isEditing}
                                className={`mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${!isEditing ? 'bg-gray-100' : ''}`}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )
                } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                  // Handle nested objects like costAssumptions, debtSizingResults
                  return (
                    <div key={key} className="space-y-4">
                      <h2 className="text-lg font-medium text-gray-900 mt-4 border-t pt-4">{formatLabel(key)}</h2>
                      <div className="p-4 border rounded-md space-y-4">
                        {Object.entries(value).map(([nestedKey, nestedValue]) => (
                          <div key={nestedKey}>
                            <label className="block text-sm font-medium text-gray-700">{formatLabel(nestedKey)}</label>
                            <input
                              name={nestedKey}
                              value={nestedValue === null ? '' : nestedValue}
                              onChange={(e) => handleNestedInputChange(e, index, key)}
                              readOnly={!isEditing}
                              className={`mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${!isEditing ? 'bg-gray-100' : ''}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700">{formatLabel(key)}</label>
                    <input
                      name={key}
                      value={value}
                      onChange={(e) => handleAssetInputChange(e, index)}
                      readOnly={!isEditing}
                      className={`mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${!isEditing ? 'bg-gray-100' : ''}`}
                    />
                  </div>
                )
              })}
              <div className="flex space-x-4">
                {!isEditing ? (
                  <button onClick={handleEdit} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Edit</button>
                ) : (
                  <>
                    <button onClick={handleSave} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">Save</button>
                    <button onClick={handleCancel} className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
