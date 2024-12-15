'use client'

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePackages, Package } from "@/hooks/usePackages"
import { Label } from "@/components/ui/label"

interface PackageSelectorProps {
  value: string | null
  onChange: (value: string, name: string) => void
  isLoading?: boolean
}

export function PackageSelector({ value, onChange, isLoading: isLoadingProp }: PackageSelectorProps) {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [search, setSearch] = useState("")
  const { packages, isLoading: isLoadingPackages, error } = usePackages()

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle body scroll when modal is open
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open, isMobile])

  // Format package display for mobile
  const formatPackageDisplay = (pkg: Package, isList: boolean = false) => {
    if (isList) {
      return (
        <div className="flex flex-col">
          <span className="font-medium">{pkg.details.customerName}</span>
          <span className="text-sm text-muted-foreground">
            {pkg.details.packageTypeName} - {new Date(pkg.details.firstUseDate).toLocaleDateString()}
          </span>
        </div>
      )
    }
    
    return pkg.label
  }

  // Find the selected package name
  const selectedPackage = packages?.find(pkg => pkg.id === value)
  const displayValue = selectedPackage ? selectedPackage.label : 'Select package'

  const isLoading = isLoadingProp || isLoadingPackages

  // Filter packages based on search
  const filteredPackages = packages?.filter(pkg => {
    if (!search) return true;
    const searchTerm = search.toLowerCase()
    const searchableText = `${pkg.details.customerName} ${pkg.details.packageTypeName}`.toLowerCase()
    return searchableText.includes(searchTerm)
  })

  const MobileSelector = () => (
    <>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-label="Select a package"
        className={cn(
          "w-full justify-between text-left h-auto min-h-[2.5rem] py-2 whitespace-normal",
          !value && "text-muted-foreground"
        )}
        onClick={() => setOpen(true)}
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : displayValue}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div 
          className="fixed inset-0 bg-background z-50 flex flex-col"
          style={{ height: '100vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background shadow-sm">
            <h2 className="text-lg font-semibold">Select Package</h2>
            <Button 
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="p-2 border-b bg-background">
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search packages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-sm text-muted-foreground">Loading packages...</div>
            </div>
          )}

          {/* Results */}
          {!isLoading && (
            <div className="flex-1 overflow-y-auto p-0">
              <div className="h-full">
                {(!filteredPackages || filteredPackages.length === 0) && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No packages found.
                  </div>
                )}
                <div className="space-y-0">
                  {filteredPackages?.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => {
                        onChange(pkg.id, pkg.label)
                        setOpen(false)
                        setSearch("")
                      }}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-3 border-b hover:bg-accent cursor-pointer text-left",
                        value === pkg.id && "bg-accent"
                      )}
                    >
                      {formatPackageDisplay(pkg, true)}
                      {value === pkg.id && (
                        <Check className="h-5 w-5 shrink-0 text-primary ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )

  const DesktopSelector = () => (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a package"
          className={cn(
            "w-full justify-between text-left h-auto min-h-[2.5rem] py-2 whitespace-normal",
            !value && "text-muted-foreground"
          )}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : displayValue}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" side="bottom" align="start">
        <div className="p-2 border-b">
          <h2 className="font-medium">Select Package</h2>
        </div>
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search packages..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>No packages found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {filteredPackages?.map((pkg) => (
              <CommandItem
                key={pkg.id}
                value={pkg.details.customerName}
                onSelect={() => {
                  onChange(pkg.id, pkg.label)
                  setOpen(false)
                  setSearch("")
                }}
              >
                {formatPackageDisplay(pkg, true)}
                {value === pkg.id && (
                  <Check className="ml-2 h-4 w-4 shrink-0" />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )

  if (error) {
    return (
      <Button
        variant="outline"
        className="w-full justify-between text-left h-auto min-h-[2.5rem] py-2"
        disabled
      >
        Failed to load packages
      </Button>
    );
  }

  return (
    <div className="flex flex-col space-y-1.5">
      <Label>Select Package</Label>
      {isMobile ? <MobileSelector /> : <DesktopSelector />}
    </div>
  )
}