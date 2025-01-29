'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, X, Check, ChevronsUpDown, ChevronDown, ChevronUp, History } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import { differenceInDays } from 'date-fns'
import { UsageHistoryDialog } from "@/components/package-monitor/usage-history-dialog"

interface Package {
  id: string;
  customer_name: string;
  package_type_name: string;
  purchase_date: string;
  first_use_date: string | null;
  expiration_date: string;
  employee_name: string | null;
  remaining_hours: number;
  used_hours: number;
}

interface Customer {
  customer_name: string;
  has_active_packages: boolean;
}

interface CustomerSelectorProps {
  onCustomerSelect: (customerId: string) => void;
}

export default function CustomerSelector({ onCustomerSelect }: CustomerSelectorProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [showActive, setShowActive] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<string>()
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set())
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const isMobile = useMediaQuery('(max-width: 768px)')

  useEffect(() => {
    if (isMobile && showDialog) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [showDialog, isMobile])

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await fetch('/api/customers/with-packages')
        const data = await response.json()
        setCustomers(data)
      } catch (error) {
        console.error('Error fetching customers:', error)
      }
    }
    fetchCustomers()
  }, [])

  useEffect(() => {
    async function fetchPackages() {
      if (selectedCustomer) {
        try {
          const response = await fetch(`/api/packages/customer/${selectedCustomer}`)
          const data = await response.json()
          setPackages(data)
        } catch (error) {
          console.error('Error fetching packages:', error)
        }
      }
    }
    fetchPackages()
  }, [selectedCustomer])

  const filteredCustomers = customers?.filter(customer => 
    customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  const filteredPackages = showActive 
    ? packages.filter(pkg => differenceInDays(new Date(pkg.expiration_date), new Date()) >= 0)
    : packages;

  const togglePackageExpand = (packageId: string) => {
    setExpandedPackages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(packageId)) {
        newSet.delete(packageId)
      } else {
        newSet.add(packageId)
      }
      return newSet
    })
  }

  const getSelectedCustomerDisplay = () => {
    if (!selectedCustomer) return "Search customers..."
    const customer = customers?.find(c => c.customer_name === selectedCustomer)
    if (!customer) return "Search customers..."
    const lastParenIndex = customer.customer_name.lastIndexOf('(')
    const displayName = lastParenIndex > -1 ? customer.customer_name.substring(0, lastParenIndex).trim() : customer.customer_name
    return displayName
  }

  const formatCustomerDisplay = (customerName: string) => {
    const lastParenIndex = customerName.lastIndexOf('(')
    const name = lastParenIndex > -1 ? customerName.substring(0, lastParenIndex).trim() : customerName
    const phone = lastParenIndex > -1 ? customerName.substring(lastParenIndex + 1, customerName.length - 1) : ''
    
    return (
      <div className="flex flex-col">
        <span className="font-medium">{name}</span>
        {phone && <span className="text-sm text-muted-foreground">{phone}</span>}
      </div>
    )
  }

  const renderPackageList = () => {
    if (!selectedCustomer || !packages.length) return null;

    return (
      <div className="space-y-2">
        {filteredPackages.map((pkg) => {
          const isExpanded = expandedPackages.has(pkg.id);
          const isExpired = differenceInDays(new Date(pkg.expiration_date), new Date()) < 0;
          
          // Extract base package name without parentheses
          const baseName = pkg.package_type_name.split('(')[0].trim();
          
          return (
            <Card key={pkg.id} className={cn(
              "overflow-hidden transition-colors",
              "hover:bg-accent/50 cursor-pointer",
              isExpanded && "bg-accent/50"
            )}>
              <div 
                className="p-4 flex items-center justify-between"
                onClick={() => togglePackageExpand(pkg.id)}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{baseName}</span>
                    <Badge 
                      variant={isExpired ? "destructive" : "default"}
                      className="text-xs"
                    >
                      {isExpired ? "Expired" : "Active"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isExpired ? "Expired: " : "Expires: "}
                    {new Date(pkg.expiration_date).toLocaleDateString()}
                  </div>
                </div>
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180"
                  )} 
                />
              </div>

              {isExpanded && (
                <CardContent className="border-t bg-muted/50 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Customer</div>
                      <div className="font-medium">{pkg.customer_name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Package Type</div>
                      <div className="font-medium">{pkg.package_type_name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Purchase Date</div>
                      <div>{new Date(pkg.purchase_date).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">First Used</div>
                      <div>{pkg.first_use_date ? new Date(pkg.first_use_date).toLocaleDateString() : 'Not used'}</div>
                    </div>
                    {pkg.remaining_hours !== null && (
                      <>
                        <div>
                          <div className="text-sm text-muted-foreground">Hours Used</div>
                          <div>{pkg.used_hours.toFixed(1)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Remaining Hours</div>
                          <div>{pkg.remaining_hours.toFixed(1)}</div>
                        </div>
                      </>
                    )}
                    {!isExpired && (
                      <div className="col-span-2">
                        <div className="text-sm text-muted-foreground">Days Remaining</div>
                        <div>{differenceInDays(new Date(pkg.expiration_date), new Date()) + 1} days</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPackageId(pkg.id)
                      }}
                    >
                      <History className="h-4 w-4" />
                      View Usage History
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  const searchContent = (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-lg font-semibold">Select Customer</h2>
        <Button 
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={() => setShowDialog(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={isMobile ? "flex-1 overflow-y-auto" : "overflow-y-auto max-h-[calc(80vh-8.5rem)]"}>
        {filteredCustomers.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No customers found.
          </div>
        )}
        <div className="space-y-0">
          {filteredCustomers.map((customer) => (
            <button
              key={customer.customer_name}
              onClick={() => {
                setSelectedCustomer(customer.customer_name)
                setShowDialog(false)
                setSearchQuery("")
                onCustomerSelect(customer.customer_name)
              }}
              className={cn(
                "flex w-full items-center justify-between px-4 py-3 border-b hover:bg-accent cursor-pointer text-left",
                selectedCustomer === customer.customer_name && "bg-accent"
              )}
            >
              {formatCustomerDisplay(customer.customer_name)}
              {selectedCustomer === customer.customer_name && (
                <Check className="h-5 w-5 shrink-0 text-primary ml-2" />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  )

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
            <div className="flex-1">
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className="w-full justify-between text-left font-normal"
                onClick={() => setShowDialog(true)}
              >
                <span className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span>{getSelectedCustomerDisplay()}</span>
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active-packages"
                checked={showActive}
                onCheckedChange={setShowActive}
              />
              <Label htmlFor="active-packages">Show Only Active Packages</Label>
            </div>
          </div>

          {renderPackageList()}
        </div>

        {showDialog && isMobile && (
          <div 
            className="fixed inset-0 bg-background z-50 flex flex-col"
            style={{ height: '100dvh' }}
          >
            {searchContent}
          </div>
        )}

        {showDialog && !isMobile && (
          <div className="fixed inset-0 z-50 flex items-start justify-center">
            <div className="fixed inset-0 bg-background/80" onClick={() => setShowDialog(false)} />
            <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md mt-[10vh]">
              <div className="flex flex-col max-h-[80vh]">
                {searchContent}
              </div>
            </div>
          </div>
        )}

        <UsageHistoryDialog
          packageId={selectedPackageId!}
          isOpen={!!selectedPackageId}
          onClose={() => setSelectedPackageId(null)}
        />
      </CardContent>
    </Card>
  )
}