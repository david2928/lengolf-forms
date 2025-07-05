'use client'

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
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
  const [searchQuery, setSearchQuery] = useState("")
  const { packages, isLoading: isLoadingPackages, error } = usePackages()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open, isMobile])

  const formatPackageDetails = (pkg: Package) => {
    return (
      <div className="flex flex-col w-full text-left">
        <div className="text-base font-medium text-foreground text-left">{pkg.details.customerName}</div>
        <div className="text-sm text-muted-foreground text-left">
          {pkg.details.packageTypeName} - {
            pkg.details.firstUseDate 
              ? new Date(pkg.details.firstUseDate).toLocaleDateString()
              : 'Not Activated'
          }
        </div>
      </div>
    )
  }

  const selectedPackage = packages?.find(pkg => pkg.id === value)
  const displayValue = selectedPackage ? selectedPackage.label : 'Select package'
  const isLoading = isLoadingProp || isLoadingPackages

  const filteredPackages = packages?.filter(pkg => {
    if (!searchQuery) return true;
    const searchTerm = searchQuery.toLowerCase()
    return (
      pkg.details.customerName.toLowerCase().includes(searchTerm) ||
      pkg.details.packageTypeName.toLowerCase().includes(searchTerm)
    )
  })

  const handleSelectPackage = (pkg: Package) => {
    onChange(pkg.id, pkg.label)
    setOpen(false)
    setSearchQuery("")
  }

  if (error) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between text-left h-auto min-h-[2.5rem] py-2"
        disabled
      >
        Failed to load packages
      </Button>
    )
  }

  return (
    <div className="flex flex-col space-y-1.5">
      <Label>Package</Label>
      
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-label="Select a package"
        className={cn(
          "w-full justify-between text-left h-auto min-h-[2.5rem] py-2 whitespace-normal bg-white",
          !value && "text-muted-foreground"
        )}
        onClick={() => setOpen(true)}
        disabled={isLoading}
      >
        <span className="truncate text-left">{isLoading ? "Loading..." : displayValue}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        isMobile ? (
          <div className="fixed inset-0 bg-background z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background shadow-sm">
              <h2 className="text-lg font-semibold">Select Package</h2>
              <Button 
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => {
                  setOpen(false)
                  setSearchQuery("")
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-2 border-b bg-background">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Search by name or package type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center px-4 py-3">
                  <span className="text-muted-foreground text-left">Loading packages...</span>
                </div>
              ) : (
                <>
                  {(!filteredPackages || filteredPackages.length === 0) && (
                    <div className="px-4 py-3 text-sm text-muted-foreground text-left">
                      No packages found
                    </div>
                  )}
                  <div className="divide-y">
                    {filteredPackages?.map((pkg) => (
                      <button
                        type="button"
                        key={pkg.id}
                        onClick={() => handleSelectPackage(pkg)}
                        className={cn(
                          "w-full flex items-start justify-between px-4 py-3 hover:bg-accent focus:bg-accent outline-none transition-colors",
                          value === pkg.id && "bg-accent"
                        )}
                      >
                        {formatPackageDetails(pkg)}
                        {value === pkg.id && (
                          <Check className="h-5 w-5 shrink-0 text-primary ml-3 flex-shrink-0 mt-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="fixed inset-0 z-50 flex items-start justify-center">
              <div className="fixed inset-0 bg-background/80" onClick={() => {
                setOpen(false)
                setSearchQuery("")
              }} />
              <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md mt-[10vh]">
                <div className="flex flex-col max-h-[80vh]">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h2 className="text-lg font-semibold">Select Package</h2>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => {
                        setOpen(false)
                        setSearchQuery("")
                      }}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Search by name or package type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                      />
                    </div>
                  </div>

                  <div className="overflow-y-auto max-h-[calc(80vh-8.5rem)]">
                    {isLoading ? (
                      <div className="px-4 py-3">
                        <span className="text-muted-foreground text-left">Loading packages...</span>
                      </div>
                    ) : (
                      <>
                        {(!filteredPackages || filteredPackages.length === 0) && (
                          <div className="px-4 py-3 text-sm text-muted-foreground text-left">
                            No packages found
                          </div>
                        )}
                        {filteredPackages?.map((pkg) => (
                          <button
                            type="button"
                            key={pkg.id}
                            onClick={() => handleSelectPackage(pkg)}
                            className={cn(
                              "flex w-full items-start justify-between px-4 py-3 border-b hover:bg-accent cursor-pointer text-left",
                              value === pkg.id && "bg-accent"
                            )}
                          >
                            {formatPackageDetails(pkg)}
                            {value === pkg.id && (
                              <Check className="h-5 w-5 shrink-0 text-primary ml-2 mt-1" />
                            )}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      )}
    </div>
  )
}