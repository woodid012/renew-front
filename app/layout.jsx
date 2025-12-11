'use client'

import './globals.css'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Home,
  TrendingUp,
  Calculator,
  Settings,
  Menu,
  X,
  BarChart3,
  User,
  Briefcase,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
  Plus,
  Play,
  Target,
  DollarSign
} from 'lucide-react'
import { RunModelProvider } from './context/RunModelContext'
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext'
import { DisplaySettingsProvider } from './context/DisplaySettingsContext'

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
    name: 'General',
    href: '/pages/asset-inputs/general',
    icon: Settings,
    section: 'inputs'
  },
  {
    name: 'Assets',
    href: '/pages/asset_3',
    icon: Building2,
    section: 'inputs'
  },
  {
    name: 'Price Curves',
    href: '/pages/price-curves2',
    icon: BarChart3,
    section: 'inputs'
  },
  {
    name: 'Finance',
    href: '/pages/asset-inputs/finance',
    icon: DollarSign,
    section: 'inputs'
  },
  {
    name: 'Sensitivity',
    href: '/pages/asset-inputs/sensitivity',
    icon: Target,
    section: 'inputs'
  },
  {
    section: 'Run',
    isSection: true
  },
  {
    name: 'Run Calculation',
    href: '/pages/run-model',
    icon: Calculator,
    section: 'run'
  },
  {
    section: 'Analysis',
    isSection: true
  },
  {
    name: 'Outputs',
    href: '/pages/output',
    icon: TrendingUp,
    section: 'analysis'
  },
  {
    name: '3-Way Forecast',
    href: '/pages/three-way-forecast',
    icon: TrendingUp,
    section: 'analysis'
  },
  {
    section: 'WIP',
    isSection: true
  },
  {
    name: 'Sensitivity Output',
    href: '/pages/output-sensitivity',
    icon: TrendingUp,
    section: 'wip'
  },
  {
    name: 'Export',
    href: '/pages/wip',
    icon: TrendingUp, // You can choose a more appropriate icon if you have one
    section: 'wip'
  },
  {
    section: 'SETTINGS',
    isSection: true
  },
  {
    name: 'Settings',
    href: '/pages/settings',
    icon: Settings,
    section: 'settings'
  },
]

function LayoutContent({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { selectedPortfolio, portfolios, changePortfolio, addPortfolio, getPortfolioTitle } = usePortfolio()
  const [showPortfolioDropdown, setShowPortfolioDropdown] = useState(false)
  const [showAddPortfolioModal, setShowAddPortfolioModal] = useState(false)
  const [newPortfolioName, setNewPortfolioName] = useState('')

  const getCurrentPageName = () => {
    const currentItem = navigationItems.find(item => !item.isSection && item.href === pathname)
    return currentItem?.name || 'Dashboard'
  }

  const handlePortfolioChange = async (portfolioName) => {
    if (portfolioName === 'add') {
      setShowAddPortfolioModal(true)
      return
    }
    
    changePortfolio(portfolioName)
    setShowPortfolioDropdown(false)
  }

  const handleAddPortfolio = async () => {
    if (!newPortfolioName.trim()) {
      alert('Please enter a portfolio name')
      return
    }
    
    const portfolioName = newPortfolioName.trim()
    
    try {
      await addPortfolio(portfolioName)
      setNewPortfolioName('')
      setShowAddPortfolioModal(false)
      setShowPortfolioDropdown(false)
    } catch (error) {
      console.error('Error creating portfolio:', error);
      alert('Failed to create portfolio: ' + error.message);
    }
  }

  // Portfolios are now managed by PortfolioContext, no need for local state

  return (
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
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
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
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          {/* Footer content can go here */}
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
              <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-md">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Placeholder User</span>
                <span className="text-sm text-gray-400">|</span>
                <Briefcase className="w-4 h-4 text-gray-500" />
                <div className="relative">
                  <button
                    onClick={() => setShowPortfolioDropdown(!showPortfolioDropdown)}
                    className="flex items-center space-x-1 text-sm text-gray-700 hover:text-gray-900 focus:outline-none"
                  >
                    <span>{getPortfolioTitle(selectedPortfolio) || selectedPortfolio}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {showPortfolioDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowPortfolioDropdown(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                        <div className="py-1">
                          {portfolios.map((portfolio) => {
                            const portfolioObj = typeof portfolio === 'string' 
                              ? { name: portfolio, title: portfolio, unique_id: portfolio }
                              : portfolio;
                            
                            const portfolioName = portfolioObj.name;
                            const uniqueId = portfolioObj.unique_id || portfolioObj.name;
                            const displayName = uniqueId === portfolioName 
                              ? portfolioName 
                              : `${portfolioName} (${uniqueId})`;
                            
                            return (
                              <button
                                key={uniqueId}
                                onClick={() => handlePortfolioChange(uniqueId)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                  selectedPortfolio === uniqueId ? 'bg-green-50 text-green-700' : 'text-gray-700'
                                }`}
                              >
                                {displayName}
                              </button>
                            );
                          })}
                          <div className="border-t border-gray-200 my-1" />
                          <button
                            onClick={() => handlePortfolioChange('add')}
                            className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center space-x-2"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add+ Portfolio</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <Link
                href="/pages/run-model"
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>RUN</span>
              </Link>
            </div>
            
            {/* Add Portfolio Modal */}
            {showAddPortfolioModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4">Add New Portfolio</h3>
                  <input
                    type="text"
                    value={newPortfolioName}
                    onChange={(e) => setNewPortfolioName(e.target.value)}
                    placeholder="Enter portfolio name"
                    className="w-full p-2 border border-gray-300 rounded-md mb-4"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddPortfolio()
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowAddPortfolioModal(false)
                        setNewPortfolioName('')
                      }}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddPortfolio}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Add Portfolio
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>RenewableAssets - Portfolio Analysis Platform</title>
        <meta name="description" content="Renewable energy portfolio analysis and management platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <DisplaySettingsProvider>
          <PortfolioProvider>
            <RunModelProvider>
              <LayoutContent>
                {children}
              </LayoutContent>
            </RunModelProvider>
          </PortfolioProvider>
        </DisplaySettingsProvider>
      </body>
    </html>
  )
}
