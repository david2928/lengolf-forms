'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, FileText, Download } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface Supplier {
  id: string
  name: string
  address_line1?: string
  address_line2?: string
  tax_id?: string
  default_description?: string
  default_unit_price?: number
}

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

interface Settings {
  default_wht_rate: string
  lengolf_name: string
  lengolf_address_line1: string
  lengolf_address_line2: string
  lengolf_tax_id: string
}

export function CreateInvoiceTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [invoiceData, setInvoiceData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    tax_rate: 3.00,
  })

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      description: '',
      quantity: 1,
      unit_price: 0,
      line_total: 0
    }
  ])

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/admin/invoices/suppliers')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data)
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load suppliers',
        variant: 'destructive',
      })
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/invoices/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setInvoiceData(prev => ({
          ...prev,
          tax_rate: parseFloat(data.default_wht_rate) || 3.00
        }))
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  useEffect(() => {
    fetchSuppliers()
    fetchSettings()
    
    // Generate default invoice number (YYYYMM format)
    const now = new Date()
    const defaultInvoiceNumber = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    setInvoiceData(prev => ({
      ...prev,
      invoice_number: defaultInvoiceNumber
    }))
  }, [])

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId)
    setSelectedSupplier(supplier || null)
    
    if (supplier?.default_description || supplier?.default_unit_price) {
      setItems([{
        id: '1',
        description: supplier.default_description || '',
        quantity: 1,
        unit_price: supplier.default_unit_price || 0,
        line_total: supplier.default_unit_price || 0
      }])
    }
  }

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      line_total: 0
    }
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unit_price') {
          updatedItem.line_total = updatedItem.quantity * updatedItem.unit_price
        }
        return updatedItem
      }
      return item
    }))
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)
    const tax_amount = subtotal * (invoiceData.tax_rate / 100)
    const total = subtotal - tax_amount // WHT is deducted from subtotal
    
    return { subtotal, tax_amount, total }
  }

  const handleGenerateInvoice = async () => {
    if (!selectedSupplier) {
      toast({
        title: 'Validation Error',
        description: 'Please select a supplier',
        variant: 'destructive',
      })
      return
    }

    // Invoice number is now optional - will be auto-generated if not provided

    if (items.length === 0 || items.every(item => !item.description)) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one invoice item',
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)
    
    try {
      const { subtotal, tax_amount, total } = calculateTotals()
      
      const payload = {
        supplier_id: selectedSupplier.id,
        invoice_number: undefined, // Always auto-generate
        invoice_date: invoiceData.invoice_date,
        tax_rate: invoiceData.tax_rate,
        subtotal,
        tax_amount,
        total_amount: total,
        items: items.filter(item => item.description.trim() !== '')
      }

      const response = await fetch('/api/admin/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: 'Success',
          description: 'Invoice generated successfully!',
        })
        
        // Immediately generate and download PDF
        try {
          const pdfResponse = await fetch(`/api/admin/invoices/${result.invoice_id}/pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })

          if (pdfResponse.ok) {
            const htmlContent = await pdfResponse.text()
            
            // Create a blob and download
            const blob = new Blob([htmlContent], { type: 'text/html' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${result.invoice_number}.html`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)

            toast({
              title: 'PDF Generated',
              description: 'Invoice PDF has been downloaded',
            })
          }
        } catch (pdfError) {
          console.error('PDF generation failed:', pdfError)
          toast({
            title: 'Warning',
            description: 'Invoice created but PDF generation failed',
            variant: 'destructive',
          })
        }
        
        // Reset form
        setSelectedSupplier(null)
        setItems([{
          id: '1',
          description: '',
          quantity: 1,
          unit_price: 0,
          line_total: 0
        }])
        
        // Generate new invoice number placeholder
        const now = new Date()
        const newInvoiceNumber = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}xxx`
        setInvoiceData(prev => ({
          ...prev,
          invoice_number: newInvoiceNumber
        }))
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.message || 'Failed to generate invoice',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error generating invoice:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate invoice',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const totals = calculateTotals()

  return (
    <div className="space-y-6">
      {/* Invoice Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Create New Invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="supplier" className="text-sm font-medium">Supplier *</Label>
              <Select onValueChange={handleSupplierChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_date" className="text-sm font-medium">Invoice Date *</Label>
              <Input
                id="invoice_date"
                type="date"
                value={invoiceData.invoice_date}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, invoice_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_number" className="text-sm font-medium">Invoice Number (Auto-generated)</Label>
              <Input
                id="invoice_number"
                value={invoiceData.invoice_number}
                readOnly
                className="bg-muted"
                placeholder="Will be auto-generated"
              />
            </div>
          </div>
          
          {selectedSupplier && (
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-medium mb-2 text-sm">Supplier Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">{selectedSupplier.name}</p>
                  {selectedSupplier.address_line1 && (
                    <p className="text-muted-foreground">{selectedSupplier.address_line1}</p>
                  )}
                  {selectedSupplier.address_line2 && (
                    <p className="text-muted-foreground">{selectedSupplier.address_line2}</p>
                  )}
                </div>
                <div>
                  {selectedSupplier.tax_id && (
                    <p className="text-muted-foreground">Tax ID: {selectedSupplier.tax_id}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Items */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Invoice Items</CardTitle>
            <Button onClick={addItem} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="border-muted">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* Description - spans more columns */}
                    <div className="lg:col-span-6 space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                      <Textarea
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        rows={3}
                        className="resize-none border-muted-foreground/20 focus:border-primary"
                        placeholder="Enter detailed item description..."
                      />
                    </div>
                    
                    {/* Quantity */}
                    <div className="lg:col-span-2 space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Qty</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="text-center h-11"
                      />
                    </div>
                    
                    {/* Unit Price */}
                    <div className="lg:col-span-2 space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Unit Price (฿)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="text-right h-11"
                      />
                    </div>
                    
                    {/* Total */}
                    <div className="lg:col-span-2 space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Total (฿)</Label>
                      <div className="h-11 px-3 py-2 border border-muted bg-muted/30 rounded-md flex items-center justify-end">
                        <span className="font-semibold">
                          ฿{item.line_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Remove button */}
                  {items.length > 1 && (
                    <div className="flex justify-end mt-4 pt-4 border-t border-muted">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Item
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Totals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">฿{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2">
                  <span>Withholding Tax:</span>
                  <div className="flex items-center space-x-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={invoiceData.tax_rate}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                      className="w-16 h-8 text-xs text-center"
                    />
                    <span className="text-xs">%</span>
                  </div>
                </div>
                <span className="font-medium text-red-600">-฿{totals.tax_amount.toFixed(2)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Net Total:</span>
                  <span className="text-primary">฿{totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <Button 
              onClick={handleGenerateInvoice}
              disabled={isGenerating || !selectedSupplier}
              className="w-full h-12 text-base"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Invoice & PDF...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 mr-2" />
                  Generate Invoice & Download PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 