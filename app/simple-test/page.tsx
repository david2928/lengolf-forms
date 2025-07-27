'use client'

import React from 'react'

export default function SimpleTest() {
  console.log('SimpleTest page rendered')
  
  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Simple Test Page
        </h1>
        
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p>This is a simple test page to verify basic functionality works.</p>
          <p>If you can see this, the Next.js app is working.</p>
        </div>
        
        <div className="mt-6 bg-yellow-100 border-2 border-red-500 p-4 rounded">
          <h2 className="text-red-800 font-bold text-xl">
            BASIC TEST COMPONENT
          </h2>
          <p>This should be visible if the page loads correctly.</p>
        </div>
      </div>
    </div>
  )
}