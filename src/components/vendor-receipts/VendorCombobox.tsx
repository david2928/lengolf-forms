'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from '@/components/ui/use-toast'

interface VendorOption {
  id: string
  name: string
  receipt_count?: number
}

interface VendorComboboxProps {
  value: string
  onChange: (vendorId: string, vendorName: string) => void
}

export function VendorCombobox({ value, onChange }: VendorComboboxProps) {
  const [open, setOpen] = useState(false)
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const fetchVendors = useCallback(async () => {
    try {
      const response = await fetch('/api/vendors?with_counts=true')
      if (response.ok) {
        const data = await response.json()
        setVendors(data)
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }, [])

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  const selectedVendor = vendors.find((v) => v.id === value)

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(searchValue.toLowerCase())
  )

  // Top vendors by receipt count (show when not searching)
  const topVendors = vendors
    .filter((v) => (v.receipt_count ?? 0) > 0)
    .sort((a, b) => (b.receipt_count ?? 0) - (a.receipt_count ?? 0))
    .slice(0, 8)

  const isSearching = searchValue.trim().length > 0
  const topVendorIds = new Set(topVendors.map(v => v.id))

  const showAddNew = searchValue.trim().length > 0 &&
    !vendors.some((v) => v.name.toLowerCase() === searchValue.trim().toLowerCase())

  const handleCreateVendor = async () => {
    const name = searchValue.trim()
    if (!name) return

    setIsCreating(true)
    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (response.ok) {
        const newVendor = await response.json()
        setVendors((prev) => [...prev, newVendor].sort((a, b) => a.name.localeCompare(b.name)))
        onChange(newVendor.id, newVendor.name)
        setOpen(false)
        setSearchValue('')
        toast({
          title: 'Vendor created',
          description: `"${name}" has been added`,
        })
      } else {
        const err = await response.json()
        toast({
          title: 'Error',
          description: err.error || 'Failed to create vendor',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating vendor:', error)
      toast({
        title: 'Error',
        description: 'Failed to create vendor',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedVendor ? selectedVendor.name : 'Select vendor...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or add vendor..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No vendor found.</CommandEmpty>
            {!isSearching && topVendors.length > 0 && (
              <CommandGroup heading="Frequently Used">
                {topVendors.map((vendor) => (
                  <CommandItem
                    key={vendor.id}
                    value={vendor.name}
                    onSelect={() => {
                      onChange(vendor.id, vendor.name)
                      setOpen(false)
                      setSearchValue('')
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === vendor.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span>{vendor.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!isSearching && topVendors.length > 0 && <CommandSeparator />}
            <CommandGroup heading={isSearching ? 'Results' : 'All Vendors'}>
              {(isSearching ? filteredVendors : filteredVendors.filter(v => !topVendorIds.has(v.id))).map((vendor) => (
                <CommandItem
                  key={vendor.id}
                  value={vendor.name}
                  onSelect={() => {
                    onChange(vendor.id, vendor.name)
                    setOpen(false)
                    setSearchValue('')
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === vendor.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span>{vendor.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {showAddNew && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreateVendor}
                    disabled={isCreating}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {isCreating ? 'Creating...' : `Add "${searchValue.trim()}"`}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
