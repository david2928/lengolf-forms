'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Download, Calendar } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { format } from 'date-fns'

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  subtotal: number
  tax_amount: number
  total_amount: number
  pdf_file_path?: string
  created_at: string
  supplier: {
    id: string
    name: string
    tax_id?: string
  }
}

export function InvoiceHistoryTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (dateFilter) params.append('date', dateFilter)

      const response = await fetch(`/api/admin/invoices?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load invoices',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast({
        title: 'Error',
        description: 'Failed to load invoices',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [searchTerm, dateFilter])

  const handleDownloadPDF = async (invoice: Invoice) => {
    if (!invoice.pdf_file_path) {
      toast({
        title: 'Error',
        description: 'PDF not available for this invoice',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${invoice.invoice_number}_${invoice.supplier.name}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to download PDF',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast({
        title: 'Error',
        description: 'Failed to download PDF',
        variant: 'destructive',
      })
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.supplier.tax_id?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Invoices</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Invoice number, supplier name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button 
                onClick={() => {
                  setSearchTerm('')
                  setDateFilter('')
                }}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Invoice History ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading invoices...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold px-6 py-4">Invoice #</TableHead>
                    <TableHead className="font-semibold px-6 py-4">Supplier</TableHead>
                    <TableHead className="font-semibold px-6 py-4">Date</TableHead>
                    <TableHead className="font-semibold text-right px-6 py-4">Amount</TableHead>
                    <TableHead className="font-semibold text-center px-6 py-4 w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium px-6 py-4">
                        <span className="text-primary font-mono">{invoice.invoice_number}</span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{invoice.supplier.name}</div>
                          {invoice.supplier.tax_id && (
                            <div className="text-xs text-muted-foreground">
                              Tax ID: {invoice.supplier.tax_id}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="text-sm">
                          {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-bold text-lg">
                            ฿{invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Net of ฿{invoice.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} WHT
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center px-6 py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(invoice)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No invoices found matching your criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 