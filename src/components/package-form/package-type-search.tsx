'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from "@/lib/utils"

interface PackageType {
  id: number;
  name: string;
}

interface PackageTypeSearchProps {
  packageTypes: PackageType[];
  selectedTypeId?: number;
  showDialog: boolean;
  onPackageSelect: (packageType: PackageType) => void;
  onDialogOpenChange: (open: boolean) => void;
}

export function PackageTypeSearch({
  packageTypes,
  selectedTypeId,
  showDialog,
  onPackageSelect,
  onDialogOpenChange,
}: PackageTypeSearchProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isMobile && showDialog) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [showDialog, isMobile])

  const selectedPackage = packageTypes.find(p => p.id === selectedTypeId)

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        className="w-full justify-between text-left h-auto min-h-[2.5rem] py-2 whitespace-normal bg-white"
        onClick={() => onDialogOpenChange(true)}
      >
        <span className="truncate">{selectedPackage?.name || 'Select package type'}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {showDialog && isMobile && (
        <div 
          className="fixed inset-0 bg-background z-50 flex flex-col"
          style={{ height: '100dvh' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background shadow-sm">
            <h2 className="text-lg font-semibold">Select Package Type</h2>
            <Button 
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => onDialogOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-0">
            <div className="h-full">
              <div className="space-y-0">
                {packageTypes.map((packageType) => (
                  <button
                    key={packageType.id}
                    onClick={() => {
                      onPackageSelect(packageType)
                      onDialogOpenChange(false)
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-3 border-b hover:bg-accent cursor-pointer text-left",
                      selectedTypeId === packageType.id && "bg-accent"
                    )}
                  >
                    <span className="font-medium">{packageType.name}</span>
                    {selectedTypeId === packageType.id && (
                      <Check className="h-5 w-5 shrink-0 text-primary ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showDialog && !isMobile && (
        <div className="fixed inset-0 z-50 flex items-start justify-center">
          <div className="fixed inset-0 bg-background/80" onClick={() => onDialogOpenChange(false)} />
          <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md mt-[10vh]">
            <div className="flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h2 className="text-lg font-semibold">Select Package Type</h2>
                <Button 
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => onDialogOpenChange(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="overflow-y-auto max-h-[calc(80vh-4rem)]">
                {packageTypes.map((packageType) => (
                  <button
                    key={packageType.id}
                    onClick={() => {
                      onPackageSelect(packageType)
                      onDialogOpenChange(false)
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-3 border-b hover:bg-accent cursor-pointer text-left",
                      selectedTypeId === packageType.id && "bg-accent"
                    )}
                  >
                    <span className="font-medium">{packageType.name}</span>
                    {selectedTypeId === packageType.id && (
                      <Check className="h-5 w-5 shrink-0 text-primary ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}