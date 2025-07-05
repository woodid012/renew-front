'use client'
import { useState, useEffect } from 'react'

export default function Asset2Page() {
  const [assets, setAssets] = useState([]);
  const [originalAssets, setOriginalAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchAssetData = async () => {
      try {
        const response = await fetch('/api/get-asset-data');
        if (!response.ok) {
          throw new Error('Failed to fetch asset data');
        }
        const data = await response.json();
        setAssets(data);
        setOriginalAssets(JSON.parse(JSON.stringify(data))); // Deep copy for cancel
      } catch (error) {
        alert('Error fetching asset data: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAssetData();
  }, []);

  const handleInputChange = (e, index) => {
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

  const handleSave = async (index) => {
    try {
      const assetToSave = assets[index];
      const response = await fetch('/api/save-asset-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assetToSave),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.details || 'Failed to save asset data');
      }

      alert('Asset data saved.');
      const newOriginalAssets = [...originalAssets];
      newOriginalAssets[index] = { ...assets[index] };
      setOriginalAssets(newOriginalAssets);
      setIsEditing(false);
    } catch (error) {
      alert('Error saving asset data: ' + error.message);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = (index) => {
    const restoredAssets = [...assets];
    restoredAssets[index] = { ...originalAssets[index] };
    setAssets(restoredAssets);
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
      <h1 className="text-3xl font-bold mb-6">Platform: {assets[0].PlatformName} (ID: {assets[0].PlatformID})</h1>
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
                }
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700">{formatLabel(key)}</label>
                    <input
                      name={key}
                      value={value}
                      onChange={(e) => handleInputChange(e, index)}
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
                    <button onClick={() => handleSave(index)} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">Save</button>
                    <button onClick={() => handleCancel(index)} className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</button>
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
