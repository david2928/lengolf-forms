'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Search } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import type { Vendor } from '@/types/vendor-receipts'

export function VendorsTab() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    tax_id: '',
    address: '',
    notes: '',
    is_company: false,
    is_domestic: true,
    is_active: true,
  })

  const resetForm = () => {
    setFormData({ name: '', tax_id: '', address: '', notes: '', is_company: false, is_domestic: true, is_active: true })
  }

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/admin/vendors')
      if (response.ok) {
        const data = await response.json()
        setVendors(data)
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
      toast({ title: 'Error', description: 'Failed to load vendors', variant: 'destructive' })
    }
  }

  useEffect(() => {
    fetchVendors()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        ...formData,
        notes: formData.notes || null,
        tax_id: formData.tax_id || null,
        address: formData.address || null,
      }

      const response = await fetch('/api/admin/vendors', {
        method: editingVendor ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingVendor ? { ...payload, id: editingVendor.id } : payload),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: editingVendor ? 'Vendor updated' : 'Vendor added',
        })
        setIsDialogOpen(false)
        setEditingVendor(null)
        resetForm()
        fetchVendors()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to save vendor',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving vendor:', error)
      toast({ title: 'Error', description: 'Failed to save vendor', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setFormData({
      name: vendor.name,
      tax_id: vendor.tax_id || '',
      address: vendor.address || '',
      notes: vendor.notes || '',
      is_company: vendor.is_company ?? false,
      is_domestic: vendor.is_domestic ?? true,
      is_active: vendor.is_active,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return

    try {
      const response = await fetch(`/api/admin/vendors?id=${id}`, { method: 'DELETE' })

      if (response.ok) {
        toast({ title: 'Success', description: 'Vendor deleted' })
        fetchVendors()
      } else {
        const err = await response.json()
        toast({
          title: 'Error',
          description: err.error || 'Failed to delete vendor',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting vendor:', error)
      toast({ title: 'Error', description: 'Failed to delete vendor', variant: 'destructive' })
    }
  }

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.tax_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or tax ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[300px]"
          />
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingVendor(null)
              resetForm()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
              <DialogDescription>
                {editingVendor ? 'Update vendor information' : 'Add a new vendor'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendor-name">Name *</Label>
                <Input
                  id="vendor-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-tax-id">Tax ID</Label>
                <Input
                  id="vendor-tax-id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  placeholder="e.g. 0105556012345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-address">Address</Label>
                <Input
                  id="vendor-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-notes">Notes</Label>
                <Input
                  id="vendor-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="vendor-company"
                    checked={formData.is_company}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_company: checked })}
                  />
                  <Label htmlFor="vendor-company">Company</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="vendor-domestic"
                    checked={formData.is_domestic}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_domestic: checked })}
                  />
                  <Label htmlFor="vendor-domestic">Domestic</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="vendor-active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="vendor-active">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : editingVendor ? 'Update' : 'Add'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 py-4">Name</TableHead>
              <TableHead className="px-6 py-4">Tax ID</TableHead>
              <TableHead className="px-6 py-4">Type</TableHead>
              <TableHead className="px-6 py-4">Status</TableHead>
              <TableHead className="px-6 py-4 w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.map((vendor) => (
              <TableRow key={vendor.id} className="hover:bg-muted/50">
                <TableCell className="px-6 py-4">
                  <div>
                    <span className="font-medium">{vendor.name}</span>
                    {vendor.address && (
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-[250px] truncate">{vendor.address}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 font-mono text-sm">
                  {vendor.tax_id || <span className="text-muted-foreground">&mdash;</span>}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <div className="flex gap-1">
                    {vendor.is_company ? (
                      <Badge variant="secondary">Company</Badge>
                    ) : (
                      <Badge variant="outline">Individual</Badge>
                    )}
                    {!vendor.is_domestic && (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">Foreign</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge variant={vendor.is_active ? 'default' : 'outline'}>
                    {vendor.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <div className="flex space-x-1">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(vendor)} className="h-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(vendor.id)}
                      className="h-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredVendors.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  {searchTerm ? 'No vendors found matching your search' : 'No vendors found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
