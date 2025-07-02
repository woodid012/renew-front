// app/page.jsx
'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { 
  Building2, 
  Home, 
  TrendingUp, 
  Calculator,
  Settings,
  Menu,
  X,
  BarChart3,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

// Create a context for global save state
const SaveContext = createContext();

export const useSaveContext = () => {
  const context = useContext(SaveContext);
  if (!context) {
    return {
      hasUnsavedChanges: false,
      setHasUnsavedChanges: () => {},
      saveFunction: null,
      setSaveFunction: () => {},
      saving: false,
      setSaving: () => {}
    };
  }
  return context;
};

// Navigation items with sections
const navigationItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
    section: null
  },
  {
    section: 'Inputs',
    isSection: true
  },
  {
    name: 'Asset Definition',
    href: '/assets',
    icon: Building2,
    section: 'inputs'
  },
  {
    name: 'Price Curves',
    href: '/price-curves',
    icon: BarChart3,
    section: 'inputs'
  },
  {
    section: 'Analysis',
    isSection: true
  },
  {
    name: 'Revenue Analysis',
    href: '/revenue',
    icon: TrendingUp,
    section: 'analysis'
  },
  {
    name: 'Project Finance',
    href: '/finance',
    icon: Calculator,
    section: 'analysis'
  },
  {
    name: 'Scenario Manager',
    href: '/scenarios',
    icon: BarChart3,
    section: 'analysis'
  },
  {
    section: 'Outputs',
    isSection: true
  },
  {
    name: 'Reporting',
    href: '/reporting',
    icon: TrendingUp,
    section: 'outputs'
  },
  {
    name: 'Exports',
    href: '/exports',
    icon: Save,
    section: 'outputs'
  },
  {
    section: 'Settings',
    isSection: true
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    section: 'settings'
  }
]

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('/')
  const [mounted, setMounted] = useState(false)

  // Global save state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveFunction, setSaveFunction] = useState(null)
  const [saving, setSaving] = useState(false)

  // Single user/portfolio state
  const [currentUser] = useState({
    name: 'Test User',
    email: 'test@example.com',
    company: 'Test Company'
  })
  const [currentPortfolio] = useState({
    portfolioId: 'main',
    portfolioName: 'Main Portfolio'
  })

  // Fix hydration mismatch by only showing dynamic content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleGlobalSave = async () => {
    if (saveFunction && hasUnsavedChanges) {
      setSaving(true);
      try {
        await saveFunction();
      } catch (error) {
        console.error('Save failed:', error);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleNavigation = (href) => {
    setCurrentPage(href);
    setSidebarOpen(false);
  };

  const saveContextValue = {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    saveFunction,
    setSaveFunction,
    saving,
    setSaving
  };

  const getCurrentPageName = () => {
    const currentItem = navigationItems.find(item => !item.isSection && item.href === currentPage);
    return currentItem?.name || 'Dashboard';
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case '/':
        return (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to RenewableAssets</h2>
            <p className="text-gray-600 mb-4">Portfolio Analysis Platform</p>
            <p className="text-sm text-gray-500">Current Portfolio: {currentPortfolio.portfolioName}</p>
          </div>
        );
      case '/assets':
        return (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Asset Definition</h2>
            <p className="text-gray-600">Configure your renewable energy assets</p>
          </div>
        );
      case '/price-curves':
        return (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Price Curves</h2>
            <p className="text-gray-600">Manage electricity price curves and forecasts</p>
          </div>
        );
      case '/revenue':
        return (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Revenue Analysis</h2>
            <p className="text-gray-600">Analyze portfolio revenue projections</p>
          </div>
        );
      case '/finance':
        return (
          <div className="text-center py-12">
            <Calculator className="w-16 h-16 text-orange-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Finance</h2>
            <p className="text-gray-600">Financial modeling and project finance analysis</p>
          </div>
        );
      case '/scenarios':
        return (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Scenario Manager</h2>
            <p className="text-gray-600">Create and compare different scenarios</p>
          </div>
        );
      case '/reporting':
        return (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-pink-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reporting</h2>
            <p className="text-gray-600">Generate comprehensive reports</p>
          </div>
        );
      case '/exports':
        return (
          <div className="text-center py-12">
            <Save className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Exports</h2>
            <p className="text-gray-600">Export data and reports</p>
          </div>
        );
      case '/settings':
        return (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
            <p className="text-gray-600">Configure platform settings</p>
          </div>
        );
      default:
        return (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
            <p className="text-gray-600">The requested page could not be found</p>
          </div>
        );
    }
  };

  return (
    <SaveContext.Provider value={saveContextValue}>
      <div className="min-h-screen flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                RenewableAssets
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-6 px-3">
            <div className="space-y-1">
              {navigationItems.map((item, index) => {
                // Render section headers
                if (item.isSection) {
                  return (
                    <div key={`section-${index}`} className="pt-4 pb-2">
                      <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {item.section}
                      </h3>
                    </div>
                  )
                }

                // Render navigation items
                const Icon = item.icon
                const isActive = currentPage === item.href
                
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    className={`
                      w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                      ${isActive
                        ? 'bg-green-100 text-green-900 border-r-2 border-green-600'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className={`
                      mr-3 h-5 w-5 transition-colors duration-200
                      ${isActive ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-500'}
                    `} />
                    {item.name}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Bottom section */}
          <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
            {/* User info */}
            <div className="px-3 py-2 mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {currentUser.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {currentPortfolio.portfolioName}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status indicator */}
            <div className="px-3 py-2 bg-green-50 rounded-md">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="ml-2 text-xs text-green-700 font-medium">
                  System Online
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col lg:ml-0">
          {/* Top navigation bar */}
          <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center">
                {/* Mobile menu button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <Menu className="w-6 h-6" />
                </button>

                {/* Page title */}
                <div className="ml-4 lg:ml-0">
                  <h1 className="text-lg font-semibold text-gray-900">
                    {getCurrentPageName()}
                  </h1>
                </div>
              </div>

              {/* Right side actions */}
              <div className="flex items-center space-x-4">
                {/* Global Save Button */}
                {hasUnsavedChanges && (
                  <button
                    onClick={handleGlobalSave}
                    disabled={saving || !saveFunction}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      saving 
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500'
                    }`}
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                )}

                {/* Unsaved changes indicator */}
                {hasUnsavedChanges && !saving && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-orange-100 rounded-md">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-xs text-orange-800 font-medium">Unsaved</span>
                  </div>
                )}

                {/* Saved indicator */}
                {!hasUnsavedChanges && mounted && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 rounded-md">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-800 font-medium">Saved</span>
                  </div>
                )}

                {/* Portfolio info */}
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-md">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {currentPortfolio.portfolioId}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {renderPageContent()}
            </div>
          </main>
        </div>
      </div>
    </SaveContext.Provider>
  )
}