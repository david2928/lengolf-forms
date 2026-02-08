'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, ExternalLink, FileText, Settings } from 'lucide-react'
import { VendorReceiptForm } from '@/components/vendor-receipts/VendorReceiptForm'
import type { VendorReceiptWithVendor } from '@/types/vendor-receipts'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function VendorReceiptsPage() {
  const [recentReceipts, setRecentReceipts] = useState<VendorReceiptWithVendor[]>([])
  const [showRecent, setShowRecent] = useState(false)

  const fetchRecent = useCallback(async () => {
    try {
      const response = await fetch('/api/vendor-receipts?limit=10')
      if (response.ok) {
        const data = await response.json()
        setRecentReceipts(data)
      }
    } catch (error) {
      console.error('Error fetching recent receipts:', error)
    }
  }, [])

  useEffect(() => {
    fetchRecent()
  }, [fetchRecent])

  const handleSubmitted = () => {
    fetchRecent()
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-md">
      <VendorReceiptForm onSubmitted={handleSubmitted} />

      {recentReceipts.length > 0 && (
        <div className="mt-4">
          <Button
            variant="ghost"
            className="w-full justify-between text-muted-foreground"
            onClick={() => setShowRecent(!showRecent)}
          >
            <span className="text-sm">Recent Submissions ({recentReceipts.length})</span>
            {showRecent ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {showRecent && (
            <Card className="mt-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recent Receipts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 text-sm"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{receipt.vendor_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {receipt.receipt_date
                          ? new Date(receipt.receipt_date + 'T00:00:00').toLocaleDateString()
                          : 'No date'}
                        {receipt.submitted_by && ` · ${receipt.submitted_by}`}
                      </p>
                    </div>
                    {receipt.file_url && (
                      <a
                        href={receipt.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
