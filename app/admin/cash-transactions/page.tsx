'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CashTransactionsTab } from '@/components/admin/cash-transactions/CashTransactionsTab'
import { Banknote } from 'lucide-react'

export default function AdminCashTransactionsPage() {
  return (
    <div className="container max-w-7xl py-6">
      <div className="flex items-center gap-3 mb-6">
        <Banknote className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Cash Transactions</h1>
          <p className="text-muted-foreground">
            View all petty cash spending records and receipts
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            All cash transactions with filters. Click a row to preview the receipt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CashTransactionsTab />
        </CardContent>
      </Card>
    </div>
  )
}
