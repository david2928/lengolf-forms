'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, Search } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface Supplier {
  id: string
  name: string
  address_line1?: string
  address_line2?: string
  tax_id?: string
  default_description?: string
  default_unit_price?: number
  created_at: string
}

export function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    address_line1: '',
    address_line2: '',
    tax_id: '',
    default_description: '',
    default_unit_price: ''
  })

  const resetForm = () => {
    setFormData({
      name: '',
      address_line1: '',
      address_line2: '',
      tax_id: '',
      default_description: '',
      default_unit_price: ''
    })
  }

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

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        ...formData,
        default_unit_price: formData.default_unit_price ? parseFloat(formData.default_unit_price) : null
      }

      const response = await fetch('/api/admin/invoices/suppliers', {
        method: editingSupplier ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSupplier ? { ...payload, id: editingSupplier.id } : payload)
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: editingSupplier ? 'Supplier updated successfully' : 'Supplier added successfully',
        })
        setIsAddDialogOpen(false)
        setEditingSupplier(null)
        resetForm()
        fetchSuppliers()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.message || 'Failed to save supplier',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving supplier:', error)
      toast({
        title: 'Error',
        description: 'Failed to save supplier',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      address_line1: supplier.address_line1 || '',
      address_line2: supplier.address_line2 || '',
      tax_id: supplier.tax_id || '',
      default_description: supplier.default_description || '',
      default_unit_price: supplier.default_unit_price?.toString() || ''
    })
    setIsAddDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return

    try {
      const response = await fetch(`/api/admin/invoices/suppliers?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Supplier deleted successfully',
        })
        fetchSuppliers()
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete supplier',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting supplier:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete supplier',
        variant: 'destructive',
      })
    }
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.tax_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.address_line1?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[300px]"
          />
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) {
            setEditingSupplier(null)
            resetForm()
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </DialogTitle>
              <DialogDescription>
                {editingSupplier ? 'Update supplier information' : 'Add a new supplier to your directory'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_id">Tax ID</Label>
                  <Input
                    id="tax_id"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input
                  id="address_line1"
                  value={formData.address_line1}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={formData.address_line2}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_description">Default Service Description</Label>
                <Textarea
                  id="default_description"
                  value={formData.default_description}
                  onChange={(e) => setFormData({ ...formData, default_description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_unit_price">Default Unit Price (THB)</Label>
                <Input
                  id="default_unit_price"
                  type="number"
                  step="0.01"
                  value={formData.default_unit_price}
                  onChange={(e) => setFormData({ ...formData, default_unit_price: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : editingSupplier ? 'Update' : 'Add'} Supplier
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suppliers ({filteredSuppliers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4">Name</TableHead>
                  <TableHead className="px-6 py-4">Tax ID</TableHead>
                  <TableHead className="px-6 py-4">Address</TableHead>
                  <TableHead className="px-6 py-4">Default Price</TableHead>
                  <TableHead className="px-6 py-4 w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium px-6 py-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">{supplier.name}</div>
                        {supplier.default_description && (
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {supplier.default_description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="font-mono text-sm">
                        {supplier.tax_id || <span className="text-muted-foreground">—</span>}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="max-w-[250px]">
                        {[supplier.address_line1, supplier.address_line2].filter(Boolean).length > 0 ? (
                          <div className="text-sm space-y-1">
                            {supplier.address_line1 && <div>{supplier.address_line1}</div>}
                            {supplier.address_line2 && <div className="text-muted-foreground">{supplier.address_line2}</div>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {supplier.default_unit_price ? (
                        <span className="font-semibold">
                          ฿{supplier.default_unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(supplier)}
                          className="h-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(supplier.id)}
                          className="h-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSuppliers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      {searchTerm ? 'No suppliers found matching your search' : 'No suppliers found. Add your first supplier to get started.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 