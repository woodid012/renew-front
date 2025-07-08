// app/pages/wip/page.jsx
'use client'

import { Wrench } from 'lucide-react';

const WIPPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <Wrench className="mx-auto h-24 w-24 text-gray-400" />
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Work In Progress
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          This page is currently under construction. Please check back later!
        </p>
      </div>
    </div>
  );
};

export default WIPPage;