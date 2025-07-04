// app/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Building2, 
  Home, 
  TrendingUp, 
  Calculator,
  Settings,
  Menu,
  X,
  BarChart3,
  Wifi,
  User,
  Briefcase,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

import DashboardPage from './pages/dashboard/page'
import AssetsPage from './pages/assets/page'
import PriceCurvesPage from './pages/price-curves/page'

import TestConnectionPage from './pages/test-connection/page'
import AssetOutputPage from './pages/asset-output/page'
import PortfolioOutputPage from './pages/portfolio-output/page'
import PriceCurves2Page from './pages/price-curves2/page'
import RunModelPage from './pages/run-model/page'

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
    name: 'assets',
    href: '/pages/assets',
    icon: Building2,
    section: 'inputs'
  },
  {
    name: 'Price Curves',
    href: '/pages/price-curves',
    icon: BarChart3,
    section: 'inputs'
  },
  {
    name: 'Price Curves 2',
    href: '/pages/price-curves2',
    icon: BarChart3,
    section: 'inputs'
  },
  {
    section: 'Analysis',
    isSection: true
  },
  {
    name: 'Run Calculation',
    href: '/pages/run-model',
    icon: Calculator,
    section: 'analysis'
  },
  
  {
    name: 'Asset Output',
    href: '/pages/asset-output',
    icon: TrendingUp,
    section: 'analysis'
  },
  {
    name: 'Portfolio Output',
    href: '/pages/portfolio-output',
    icon: TrendingUp,
    section: 'analysis'
  },
  {
    section: 'Settings',
    isSection: true
  },
  {
    name: 'Settings',
    href: '/pages/settings',
    icon: Settings,
    section: 'settings'
  },
  {
    name: 'TestConnection',
    href: '/pages/test-connection',
    icon: Wifi,
    section: 'settings'
  },
]

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('/')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // null, 'success', 'error'

  const handleNavigation = (href) => {
    setCurrentPage(href)
    setSidebarOpen(false)
  }

  const getCurrentPageName = () => {
    const currentItem = navigationItems.find(item => !item.isSection && item.href === currentPage)
    return currentItem?.name || 'Dashboard'
  }

  const renderPageContent = () => {
    switch (currentPage) {
      case '/':
        return <DashboardPage />
      case '/pages/assets':
        return <AssetsPage />
      case '/pages/price-curves':
        return <PriceCurvesPage />
      case '/pages/price-curves2':
        return <PriceCurves2Page />
      
      case '/pages/asset-output':
        return <AssetOutputPage />
      case '/pages/portfolio-output':
        return <PortfolioOutputPage />
      case '/pages/run-model':
        return <RunModelPage />
      case '/pages/finance':
        return (
          <div className="text-center py-12">
            <Calculator className="w-16 h-16 text-orange-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Finance</h2>
            <p className="text-gray-600">Financial modeling and project finance analysis</p>
          </div>
        )
      case '/pages/scenarios':
        return (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Scenario Manager</h2>
            <p className="text-gray-600">Create and compare different scenarios</p>
          </div>
        )
      case '/pages/reporting':
        return (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-pink-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reporting</h2>
            <p className="text-gray-600">Generate comprehensive reports</p>
          </div>
        )
      case '/pages/exports':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Exports</h2>
            <p className="text-gray-600">Export data and reports</p>
          </div>
        )
      case '/pages/settings':
        return (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
            <p className="text-gray-600">Configure platform settings</p>
          </div>
        )
      case '/pages/test-connection':
        return <TestConnectionPage />
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
            <p className="text-gray-600">The requested page could not be found</p>
          </div>
        )
    }
  }

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
              {/* Save Status */}
              {saveStatus === 'success' && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-md">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Saved successfully</span>
                </div>
              )}
              
              {saveStatus === 'error' && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-md">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Save failed</span>
                </div>
              )}

              <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-md">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Placeholder User</span>
                <span className="text-sm text-gray-400">|</span>
                <Briefcase className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">ZEBRE</span>
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
  )
}