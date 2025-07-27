'use client';

import React, { useState } from 'react';
import { ReprintReceiptModal } from '@/components/pos/ReprintReceiptModal';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function ReprintReceiptPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Receipt Reprint System
          </h1>
          <p className="text-gray-600 mb-8">
            Reprint any receipt using the receipt number or transaction ID.
          </p>

          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Reprint</h2>
              <p className="text-gray-600 mb-4">
                Click the button below to open the reprint dialog and search for any receipt.
              </p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="w-full h-12 text-lg"
              >
                <Printer className="w-5 h-5 mr-2" />
                Open Reprint Dialog
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">API Usage</h2>
              <p className="text-gray-600 mb-4">
                You can also use the reprint API directly:
              </p>
              <div className="bg-gray-100 rounded p-4 font-mono text-sm">
                <div className="mb-2">
                  <strong>POST</strong> /api/pos/reprint
                </div>
                <div className="text-gray-600">
                  {`{
  "receiptNumber": "R20250726-0143",
  "format": "html",
  "language": "en"
}`}
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Test Receipt</h2>
              <p className="text-gray-600 mb-4">
                Use this receipt number for testing:
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <div className="font-mono font-semibold text-blue-900">
                  R20250726-0143
                </div>
                <div className="text-blue-700 text-sm mt-1">
                  Transaction ID: 131f10ea-b7a3-470b-a712-b6e845b4b339
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReprintReceiptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}