'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ExternalLink, Search, Trash2, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import type { CashTransaction } from '@/types/cash-transactions'
import { SPENDING_TYPES, CASH_STAFF_OPTIONS } from '@/types/cash-transactions'

function formatAmount(n: number | null): string {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function SourceBadge({ source }: { source: string }) {
  if (source === 'csv_import') {
    return <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700">Import</Badge>
  }
  return <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">Form</Badge>
}

// ── Detail Panel (expanded row) ─────────────────────────────────────────────

interface DetailPanelProps {
  transaction: CashTransaction
  colCount: number
}

function DetailPanel({ transaction, colCount }: DetailPanelProps) {
  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={colCount} className="p-0">
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
            {/* File Preview */}
            {transaction.file_id ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Receipt</h4>
                <div className="border rounded-md overflow-hidden bg-white" style={{ height: 360 }}>
                  <iframe
                    src={`https://drive.google.com/file/d/${transaction.file_id}/preview`}
                    className="w-full h-full"
                    allow="autoplay"
                    title="Receipt preview"
                  />
                </div>
                <a
                  href={transaction.file_url || `https://drive.google.com/file/d/${transaction.file_id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in Google Drive
                </a>
              </div>
            ) : transaction.file_url ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Receipt</h4>
                <div className="border rounded-md flex items-center justify-center text-muted-foreground text-sm bg-muted/20" style={{ height: 360 }}>
                  Preview not available
                </div>
                <a
                  href={transaction.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in Google Drive
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Receipt</h4>
                <div className="border rounded-md flex items-center justify-center text-muted-foreground text-sm bg-muted/20" style={{ height: 360 }}>
                  No file available
                </div>
              </div>
            )}

            {/* Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Details</h4>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{formatDate(transaction.transaction_date)}</span>
                  <span className="text-muted-foreground">Staff:</span>
                  <span>{transaction.staff_name}</span>
                  <span className="text-muted-foreground">Type:</span>
                  <span>{transaction.spending_type}</span>
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">{formatAmount(transaction.amount)} THB</span>
                  <span className="text-muted-foreground">Source:</span>
                  <span><SourceBadge source={transaction.source} /></span>
                  <span className="text-muted-foreground">Submitted By:</span>
                  <span>{transaction.submitted_by || '—'}</span>
                </div>
                {transaction.notes && (
                  <div className="pt-1">
                    <span className="text-muted-foreground">Notes: </span>
                    <span>{transaction.notes}</span>
                  </div>
                )}
                {transaction.original_drive_url && (
                  <div className="pt-1">
                    <span className="text-muted-foreground">Original URL: </span>
                    <a
                      href={transaction.original_drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      {transaction.original_drive_url}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

const COL_COUNT = 8

export function CashTransactionsTab() {
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [staffFilter, setStaffFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [offset, setOffset] = useState(0)
  const pageSize = 25

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('start_date', startDate)
      if (endDate) params.set('end_date', endDate)
      if (staffFilter) params.set('staff_name', staffFilter)
      if (typeFilter) params.set('spending_type', typeFilter)
      if (searchText) params.set('search', searchText)
      params.set('limit', pageSize.toString())
      params.set('offset', offset.toString())

      const response = await fetch(`/api/admin/cash-transactions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.data)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast({ title: 'Error', description: 'Failed to load transactions', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate, staffFilter, typeFilter, searchText, offset])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this cash transaction record?')) return

    try {
      const response = await fetch(`/api/admin/cash-transactions?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast({ title: 'Success', description: 'Transaction deleted' })
        setExpandedId(null)
        fetchTransactions()
      } else {
        toast({ title: 'Error', description: 'Failed to delete transaction', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast({ title: 'Error', description: 'Failed to delete transaction', variant: 'destructive' })
    }
  }

  const handleFilterReset = () => {
    setStartDate('')
    setEndDate('')
    setStaffFilter('')
    setTypeFilter('')
    setSearchText('')
    setOffset(0)
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const totalPages = Math.ceil(total / pageSize)
  const currentPage = Math.floor(offset / pageSize) + 1

  // Compute total amount for filtered results
  const pageTotal = transactions.reduce((sum, t) => sum + Number(t.amount), 0)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setOffset(0) }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setOffset(0) }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Staff</Label>
          <Select
            value={staffFilter}
            onValueChange={(v) => { setStaffFilter(v === 'all' ? '' : v); setOffset(0) }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All staff</SelectItem>
              {CASH_STAFF_OPTIONS.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select
            value={typeFilter}
            onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setOffset(0) }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {SPENDING_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Search</Label>
          <div className="flex items-center gap-1">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Notes, type, staff..."
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setOffset(0) }}
            />
          </div>
        </div>
        <Button variant="outline" onClick={handleFilterReset} className="h-9">
          Reset
        </Button>
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} transaction{total !== 1 ? 's' : ''} found</span>
        <span>Page total: {formatAmount(pageTotal)} THB</span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 px-2" />
              <TableHead className="px-3">Date</TableHead>
              <TableHead className="px-3">Staff</TableHead>
              <TableHead className="px-3">Spending Type</TableHead>
              <TableHead className="px-3 text-right">Amount</TableHead>
              <TableHead className="px-3">Source</TableHead>
              <TableHead className="px-3 w-10 text-center">File</TableHead>
              <TableHead className="px-3 w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={COL_COUNT} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COL_COUNT} className="text-center py-8 text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => {
                const isExpanded = expandedId === tx.id
                return (
                  <Fragment key={tx.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpand(tx.id)}
                    >
                      <TableCell className="px-2 text-center">
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground inline" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground inline" />}
                      </TableCell>
                      <TableCell className="px-3 whitespace-nowrap text-sm">
                        {formatDate(tx.transaction_date)}
                      </TableCell>
                      <TableCell className="px-3 text-sm">
                        {tx.staff_name}
                      </TableCell>
                      <TableCell className="px-3 font-medium text-sm">
                        {tx.spending_type}
                      </TableCell>
                      <TableCell className="px-3 text-sm text-right tabular-nums">
                        {formatAmount(tx.amount)}
                      </TableCell>
                      <TableCell className="px-3">
                        <SourceBadge source={tx.source} />
                      </TableCell>
                      <TableCell className="px-3 text-center">
                        {tx.file_url ? (
                          <a
                            href={tx.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                            title="View receipt"
                          >
                            <ExternalLink className="h-4 w-4 inline" />
                          </a>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="px-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDelete(tx.id) }}
                          className="h-7 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <DetailPanel
                        transaction={tx}
                        colCount={COL_COUNT}
                      />
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
              disabled={offset === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + pageSize)}
              disabled={offset + pageSize >= total}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
