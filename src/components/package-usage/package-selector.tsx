'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { AvailablePackage, PackageSelectorProps } from '@/types/package-usage'

interface ExtendedPackageSelectorProps extends Omit<PackageSelectorProps, 'onChange'> {
  onChange: (id: string, label: string) => void;
}

export function PackageSelector({ value, onChange, isLoading = false }: ExtendedPackageSelectorProps) {
  const [open, setOpen] = useState(false)
  const [packages, setPackages] = useState<AvailablePackage[]>([])
  const [filteredPackages, setFilteredPackages] = useState<AvailablePackage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingPackages, setLoadingPackages] = useState(true)

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await fetch('/api/packages/available')
        if (!response.ok) throw new Error('Failed to fetch packages')
        
        const data = await response.json()
        setPackages(data)
        setFilteredPackages(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching packages:', err)
        setError('Failed to load packages')
      } finally {
        setLoadingPackages(false)
      }
    }

    fetchPackages()
  }, [])

  const handleSearch = (search: string) => {
    if (!search) {
      setFilteredPackages(packages)
      return
    }

    const searchLower = search.toLowerCase()
    const filtered = packages.filter(pkg => 
      pkg.details.customerName.toLowerCase().includes(searchLower) ||
      pkg.details.packageTypeName.toLowerCase().includes(searchLower)
    )
    setFilteredPackages(filtered)
  }

  const selectedPackage = packages.find(pkg => pkg.id === value)

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Select Package
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal"
            disabled={isLoading || loadingPackages}
          >
            <span className="truncate">
              {value && selectedPackage
                ? selectedPackage.label
                : "Select package..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[calc(100vw-2rem)] md:w-[700px] p-0" 
          align="start"
        >
          <Command>
            <CommandInput 
              placeholder="Search by customer name..." 
              onValueChange={handleSearch}
              className="h-9"
            />
            <CommandEmpty>No package found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {filteredPackages.map((pkg) => (
                <CommandItem
                  key={pkg.id}
                  value={pkg.details.customerName}
                  onSelect={() => {
                    onChange(pkg.id, pkg.label)
                    setOpen(false)
                  }}
                  className="flex items-center py-3 px-2"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 flex-shrink-0",
                      value === pkg.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 whitespace-normal text-sm">
                    {pkg.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}