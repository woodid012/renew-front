'use client'

import Link from 'next/link';
import { Settings, Sliders, DollarSign, FileText, Users, Shield } from 'lucide-react';

export default function SettingsPage() {
  const settingsSections = [
    {
      title: 'Asset Defaults',
      description: 'Configure default values for solar, wind, and storage assets',
      href: '/pages/settings/asset-defaults',
      icon: Sliders,
      color: 'green'
    },
    {
      title: 'Administrator',
      description: 'Manage accounts and user access controls',
      href: '/pages/settings/administrator',
      icon: Shield,
      color: 'blue'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="w-8 h-8 text-gray-700" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">
            Manage platform configuration and default values
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.href}
                href={section.href}
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg bg-${section.color}-100`}>
                    <Icon className={`w-6 h-6 text-${section.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {section.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
