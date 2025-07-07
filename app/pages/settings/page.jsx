'use client'

import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="space-y-4">
        <Link href="/pages/settings/defaults" className="block text-lg text-indigo-600 hover:text-indigo-800">
          Default Calculation Inputs
        </Link>
        {/* Add other settings links here */}
      </div>
    </div>
  );
}
