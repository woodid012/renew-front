'use client'

import { useState, useEffect } from 'react';
import { Shield, Users, Plus, Edit, Trash2, Search, X, Save, Briefcase, AlertTriangle } from 'lucide-react';

export default function AdministratorPage() {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [loadingPortfolios, setLoadingPortfolios] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' or 'portfolios'
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editingPortfolioTitle, setEditingPortfolioTitle] = useState(null);
  const [portfolioTitleValue, setPortfolioTitleValue] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'user',
    status: 'active',
    portfolioAccess: []
  });

  // Load accounts from localStorage or API
  useEffect(() => {
    const storedAccounts = localStorage.getItem('accounts');
    if (storedAccounts) {
      const parsed = JSON.parse(storedAccounts);
      setAccounts(parsed);
      setFilteredAccounts(parsed);
    } else {
      // Default accounts
      const defaultAccounts = [
        { id: 1, username: 'admin', email: 'admin@example.com', role: 'admin', status: 'active', portfolioAccess: ['ZEBRE', 'xxx'] },
        { id: 2, username: 'user1', email: 'user1@example.com', role: 'user', status: 'active', portfolioAccess: ['ZEBRE'] }
      ];
      setAccounts(defaultAccounts);
      setFilteredAccounts(defaultAccounts);
      localStorage.setItem('accounts', JSON.stringify(defaultAccounts));
    }
  }, []);

  // Load portfolios from MongoDB and localStorage
  useEffect(() => {
    loadPortfolios();
  }, []);

  const loadPortfolios = async () => {
    setLoadingPortfolios(true);
    try {
      // Get portfolios from MongoDB
      const response = await fetch('/api/list-portfolios');
      if (response.ok) {
        const data = await response.json();
        // Handle both old format (array of strings) and new format (array of objects)
        const portfolios = (data.portfolios || []).map(p => 
          typeof p === 'string' ? { name: p, assetCount: 0, lastUpdated: null } : p
        );
        setPortfolios(portfolios);
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem('portfolios');
        const storedPortfolios = stored ? JSON.parse(stored) : [];
        const fallbackPortfolios = ['ZEBRE', 'xxx', ...storedPortfolios].map(name => ({
          name,
          assetCount: 0,
          lastUpdated: null
        }));
        setPortfolios(fallbackPortfolios);
      }
    } catch (error) {
      console.error('Error loading portfolios:', error);
      // Fallback to localStorage
      const stored = localStorage.getItem('portfolios');
      const storedPortfolios = stored ? JSON.parse(stored) : [];
      const fallbackPortfolios = ['ZEBRE', 'xxx', ...storedPortfolios].map(name => ({
        name,
        assetCount: 0,
        lastUpdated: null
      }));
      setPortfolios(fallbackPortfolios);
    } finally {
      setLoadingPortfolios(false);
    }
  };

  const handleDeletePortfolio = async (portfolioName) => {
    // Extract name if portfolio is an object
    const name = typeof portfolioName === 'string' ? portfolioName : portfolioName.name;
    
    // Prevent deletion of default portfolios
    if (name === 'ZEBRE' || name === 'xxx') {
      alert('Cannot delete default portfolios (ZEBRE, xxx)');
      return;
    }

    const confirmMessage = `Are you sure you want to delete the portfolio "${name}"?\n\nThis will:\n- Delete the portfolio from the database\n- Remove all assets and data associated with this portfolio\n- Remove it from the portfolio list\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch('/api/delete-portfolio', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ portfolio: name }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete portfolio');
      }

      // Remove from localStorage
      const storedPortfolios = JSON.parse(localStorage.getItem('portfolios') || '[]');
      const updatedPortfolios = storedPortfolios.filter(p => p !== name);
      localStorage.setItem('portfolios', JSON.stringify(updatedPortfolios));

      // If this was the selected portfolio, switch to ZEBRE
      const selectedPortfolio = localStorage.getItem('selectedPortfolio');
      if (selectedPortfolio === name) {
        localStorage.setItem('selectedPortfolio', 'ZEBRE');
        window.dispatchEvent(new CustomEvent('portfolioChanged', { detail: { portfolio: 'ZEBRE' } }));
      }

      // Reload portfolios
      await loadPortfolios();

      // Trigger refresh event so PortfolioContext updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refreshPortfolios'));
      }

      alert(`Portfolio "${name}" has been deleted successfully.`);
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      alert('Failed to delete portfolio: ' + error.message);
    }
  };

  // Filter accounts based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredAccounts(accounts);
    } else {
      const filtered = accounts.filter(account =>
        account.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAccounts(filtered);
    }
  }, [searchTerm, accounts]);

  const handleAddAccount = () => {
    setEditingAccount(null);
    setFormData({
      username: '',
      email: '',
      role: 'user',
      status: 'active',
      portfolioAccess: []
    });
    setShowAddModal(true);
  };

  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setFormData({
      username: account.username,
      email: account.email,
      role: account.role,
      status: account.status,
      portfolioAccess: [...account.portfolioAccess]
    });
    setShowAddModal(true);
  };

  const handleDeleteAccount = (accountId) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      const updatedAccounts = accounts.filter(acc => acc.id !== accountId);
      setAccounts(updatedAccounts);
      setFilteredAccounts(updatedAccounts);
      localStorage.setItem('accounts', JSON.stringify(updatedAccounts));
    }
  };

  const handleSaveAccount = () => {
    if (!formData.username || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }

    let updatedAccounts;
    if (editingAccount) {
      // Update existing account
      updatedAccounts = accounts.map(acc =>
        acc.id === editingAccount.id
          ? { ...acc, ...formData }
          : acc
      );
    } else {
      // Add new account
      const newAccount = {
        id: Date.now(),
        ...formData
      };
      updatedAccounts = [...accounts, newAccount];
    }

    setAccounts(updatedAccounts);
    setFilteredAccounts(updatedAccounts);
    localStorage.setItem('accounts', JSON.stringify(updatedAccounts));
    setShowAddModal(false);
    setEditingAccount(null);
  };

  const togglePortfolioAccess = (portfolio) => {
    setFormData(prev => {
      const access = prev.portfolioAccess || [];
      if (access.includes(portfolio)) {
        return { ...prev, portfolioAccess: access.filter(p => p !== portfolio) };
      } else {
        return { ...prev, portfolioAccess: [...access, portfolio] };
      }
    });
  };

  const getAvailablePortfolios = () => {
    // Use the portfolios state if available, otherwise fallback to localStorage
    if (portfolios.length > 0) {
      return portfolios.map(p => typeof p === 'string' ? p : p.name);
    }
    const stored = localStorage.getItem('portfolios');
    const storedPortfolios = stored ? JSON.parse(stored) : [];
    return ['ZEBRE', 'xxx', ...storedPortfolios];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-8 h-8 text-gray-700" />
            <h1 className="text-3xl font-bold text-gray-900">Administrator</h1>
          </div>
          <p className="text-gray-600">
            Manage accounts, portfolios, and user access controls
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('accounts')}
              className={`py-4 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'accounts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Accounts</span>
            </button>
            <button
              onClick={() => setActiveTab('portfolios')}
              className={`py-4 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'portfolios'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Portfolios</span>
            </button>
          </nav>
        </div>

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <>
            {/* Search and Add Button */}
            <div className="mb-6 flex justify-between items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={handleAddAccount}
                className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Account</span>
              </button>
            </div>

            {/* Accounts Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Portfolio Access
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No accounts found
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {account.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        account.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {account.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        account.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {account.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {account.portfolioAccess && account.portfolioAccess.length > 0 ? (
                          account.portfolioAccess.map((portfolio) => (
                            <span
                              key={portfolio}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {portfolio}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">No access</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditAccount(account)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

            {/* Add/Edit Account Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editingAccount ? 'Edit Account' : 'Add New Account'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingAccount(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="user">User</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Portfolio Access
                  </label>
                  <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                    {getAvailablePortfolios().length === 0 ? (
                      <p className="text-sm text-gray-500">No portfolios available</p>
                    ) : (
                      <div className="space-y-2">
                        {getAvailablePortfolios().map((portfolio) => (
                          <label
                            key={portfolio}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.portfolioAccess?.includes(portfolio) || false}
                              onChange={() => togglePortfolioAccess(portfolio)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{portfolio}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingAccount(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAccount}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
            )}
          </>
        )}

        {/* Portfolios Tab */}
        {activeTab === 'portfolios' && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Deleting a portfolio will permanently remove all associated assets, assumptions, and results from the database. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Portfolio Management</h3>
                <p className="text-sm text-gray-600 mt-1">Manage and delete portfolios</p>
              </div>

              {loadingPortfolios ? (
                <div className="px-6 py-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="text-gray-500 mt-2">Loading portfolios...</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {portfolios.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No portfolios found
                    </div>
                  ) : (
                    portfolios.map((portfolio) => {
                      const portfolioName = typeof portfolio === 'string' ? portfolio : portfolio.name;
                      const portfolioTitle = typeof portfolio === 'string' ? portfolio : (portfolio.title || portfolio.name);
                      const assetCount = typeof portfolio === 'object' ? (portfolio.assetCount || 0) : 0;
                      const lastUpdated = typeof portfolio === 'object' ? portfolio.lastUpdated : null;
                      const isDefault = portfolioName === 'ZEBRE' || portfolioName === 'xxx';
                      const isEditing = editingPortfolioTitle === portfolioName;
                      
                      // Format last updated date
                      const formatDate = (dateString) => {
                        if (!dateString) return null;
                        try {
                          const date = new Date(dateString);
                          return date.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          });
                        } catch {
                          return null;
                        }
                      };

                      const handleEditTitle = () => {
                        setEditingPortfolioTitle(portfolioName);
                        setPortfolioTitleValue(portfolioTitle);
                      };

                      const handleSaveTitle = async () => {
                        if (!portfolioTitleValue.trim()) {
                          alert('Portfolio title cannot be empty');
                          return;
                        }

                        try {
                          const response = await fetch('/api/update-portfolio-title', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              portfolioName: portfolioName,
                              portfolioTitle: portfolioTitleValue.trim()
                            })
                          });

                          const data = await response.json();
                          if (data.success) {
                            setEditingPortfolioTitle(null);
                            setPortfolioTitleValue('');
                            // Reload portfolios to get updated title
                            loadPortfolios();
                          } else {
                            alert('Failed to update portfolio title: ' + (data.error || 'Unknown error'));
                          }
                        } catch (error) {
                          console.error('Error updating portfolio title:', error);
                          alert('Failed to update portfolio title: ' + error.message);
                        }
                      };

                      const handleCancelEdit = () => {
                        setEditingPortfolioTitle(null);
                        setPortfolioTitleValue('');
                      };
                      
                      return (
                        <div
                          key={portfolioName}
                          className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <Briefcase className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {isEditing ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <input
                                      type="text"
                                      value={portfolioTitleValue}
                                      onChange={(e) => setPortfolioTitleValue(e.target.value)}
                                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveTitle();
                                        } else if (e.key === 'Escape') {
                                          handleCancelEdit();
                                        }
                                      }}
                                      autoFocus
                                    />
                                    <button
                                      onClick={handleSaveTitle}
                                      className="px-2 py-1 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md"
                                      title="Save"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-2 py-1 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md"
                                      title="Cancel"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-sm font-medium text-gray-900">
                                      {portfolioTitle}
                                    </div>
                                    {portfolioTitle !== portfolioName && (
                                      <span className="text-xs text-gray-400" title={`Identifier: ${portfolioName}`}>
                                        ({portfolioName})
                                      </span>
                                    )}
                                    {isDefault && (
                                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                        Default
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">{assetCount}</span>
                                  <span>{assetCount === 1 ? 'asset' : 'assets'}</span>
                                </span>
                                {lastUpdated && formatDate(lastUpdated) && (
                                  <span className="flex items-center gap-1">
                                    <span>Updated:</span>
                                    <span className="font-medium">{formatDate(lastUpdated)}</span>
                                  </span>
                                )}
                                {!isDefault && (
                                  <span className="text-gray-400">Custom portfolio</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {!isEditing && (
                              <button
                                onClick={handleEditTitle}
                                className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md flex items-center space-x-1 transition-colors"
                                title="Edit portfolio title"
                              >
                                <Edit className="w-4 h-4" />
                                <span>Edit Title</span>
                              </button>
                            )}
                            {!isDefault && !isEditing && (
                              <button
                                onClick={() => handleDeletePortfolio(portfolioName)}
                                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md flex items-center space-x-1 transition-colors"
                                title="Delete portfolio"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

