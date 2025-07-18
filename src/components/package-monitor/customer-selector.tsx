'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, X, Check, ChevronsUpDown, ChevronDown, ChevronUp, History, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import { differenceInDays } from 'date-fns'
import { UsageHistoryDialog } from "@/components/package-monitor/usage-history-dialog"

interface Package {
  id: string;
  package_name: string;
  package_type: string;
  purchase_date?: string;
  first_use_date: string | null;
  expiration_date: string;
  employee_name?: string | null;
  uses_remaining?: number;
  used_hours?: number;
  original_uses?: number;
  status: 'active' | 'expired' | 'unused' | 'fully_used' | 'unlimited';
}

interface Customer {
  customer_name: string;
  customer_id: string;
  has_active_packages: boolean;
}

interface CustomerSelectorProps {
  onCustomerSelect: (customerId: string) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({ onCustomerSelect }) => {
  const [showDialog, setShowDialog] = useState(false)
  const [showActive, setShowActive] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<string>()
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>()
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set())
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
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
        setIsLoadingCustomers(true);
        const searchParam = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
        const response = await fetch(`/api/customers/with-packages${searchParam}`)
        const data = await response.json()
        setCustomers(data)
      } catch (error) {
        console.error('Error fetching customers:', error)
      } finally {
        setIsLoadingCustomers(false);
      }
    }

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(fetchCustomers, searchQuery ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [searchQuery])

  useEffect(() => {
    async function fetchPackages() {
      if (selectedCustomerId) {
        try {
          // Use server-side filtering instead of client-side
          const includeExpired = !showActive;
          const includeUsed = !showActive;
          
          const response = await fetch(
            `/api/packages/customer/${selectedCustomerId}?include_expired=${includeExpired}&include_used=${includeUsed}`
          )
          const data = await response.json()
          // The API returns { packages: [...], summary: {...}, customer: {...} }
          setPackages(data.packages || [])
        } catch (error) {
          console.error('Error fetching packages:', error)
          setPackages([])
        }
      }
    }
    fetchPackages()
  }, [selectedCustomerId, showActive]) // Add showActive as dependency

  // No need for client-side filtering since we're doing server-side search
  const filteredCustomers = customers ?? [];

  // Remove client-side filtering since we're now doing it server-side
  const filteredPackages = packages;

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
    if (!selectedCustomer) {
      return "Search for a customer..."
    }
    return formatCustomerDisplay(selectedCustomer)
  }

  const formatCustomerDisplay = (customerName: string) => {
    const phoneMatch = customerName.match(/\((\d+)\)$/)
    const phone = phoneMatch ? phoneMatch[1] : ''
    const nameWithNickname = phoneMatch 
      ? customerName.slice(0, customerName.lastIndexOf('(')).trim() 
      : customerName

    return phone ? `${nameWithNickname} (${phone})` : nameWithNickname
  }

  // Safe date parsing function
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const renderPackageList = () => {
    if (!selectedCustomer) {
      return <div className="text-muted-foreground text-sm">Select a customer to view their packages</div>
    }

    if (filteredPackages.length === 0) {
      return <div className="text-muted-foreground text-sm">No packages found for this customer</div>
    }

    return (
      <div className="space-y-3">
        {filteredPackages.map((pkg) => {
          const isExpanded = expandedPackages.has(pkg.id);
          const isInactive = pkg.status === 'unused';
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const expirationDate = new Date(pkg.expiration_date);
          expirationDate.setHours(0, 0, 0, 0);
          const daysRemaining = differenceInDays(expirationDate, today);
          const isExpired = pkg.status === 'expired';
          
          const isUnlimited = pkg.status === 'unlimited';
          
          // Use the calculated values from API
          const remainingHoursNum = pkg.uses_remaining || 0;
          const usedHoursNum = pkg.used_hours || 0;
          const originalHours = pkg.original_uses || 0;
          
          const isFullyUsed = pkg.status === 'fully_used';

                     // Format the days remaining text
           const formatDaysRemaining = () => {
             if (isInactive) return 'Not activated';
             if (daysRemaining < 0) return 'Expired';
             if (daysRemaining === 0) return 'Expires today';
             if (daysRemaining === 1) return 'Expires tomorrow';
             if (daysRemaining === 2) return '2 days left';
             return `${daysRemaining} days left`;
           };

          const daysText = formatDaysRemaining();

          // Use selected customer name for display
          const baseName = selectedCustomer ? formatCustomerDisplay(selectedCustomer).split(' (')[0] : 'Customer';
          
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
                      variant={isExpired ? "destructive" : isFullyUsed ? "secondary" : isInactive ? "outline" : "default"}
                      className="text-xs"
                    >
                      {isInactive ? "INACTIVE" : isExpired ? "EXPIRED" : isFullyUsed ? "FULLY USED" : "ACTIVE"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isInactive ? "Purchase date: " + (pkg.purchase_date ? formatDate(pkg.purchase_date) : 'N/A') :
                     isExpired ? "Expired: " + formatDate(pkg.expiration_date) : 
                     "Expires: " + formatDate(pkg.expiration_date)}
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
                      <div className="font-medium">{selectedCustomer}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Package Type</div>
                      <div className="font-medium">{pkg.package_name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Purchase Date</div>
                      <div>{pkg.purchase_date ? formatDate(pkg.purchase_date) : 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">First Used</div>
                      <div>
                        {pkg.first_use_date ? formatDate(pkg.first_use_date) : 
                         (!isUnlimited && remainingHoursNum && remainingHoursNum > 0) ? 
                           `${remainingHoursNum.toFixed(1)} hours remaining` : 'Not used'}
                      </div>
                    </div>
                    {/* Remove Hours Used and Remaining Hours for Unlimited packages */}
                    {!isUnlimited && (
                      <>
                        <div>
                          <div className="text-sm text-muted-foreground">Hours Used</div>
                          <div>{usedHoursNum.toFixed(1)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Remaining Hours</div>
                          <div>{remainingHoursNum.toFixed(1)}</div>
                        </div>
                      </>
                    )}
                    {!isExpired && (
                      <div className="col-span-2">
                        <div className="text-sm text-muted-foreground">Days Remaining</div>
                        <div>{daysText}</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Only show Usage History button for non-Unlimited packages */}
                  {!isUnlimited && (
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
                  )}
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
        {isLoadingCustomers && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching customers...
            </div>
          </div>
        )}
        {!isLoadingCustomers && filteredCustomers.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {searchQuery ? "No customers found matching your search." : "No customers found."}
          </div>
        )}
        <div className="space-y-0">
          {!isLoadingCustomers && filteredCustomers.map((customer) => (
            <button
              key={customer.customer_id}
              onClick={() => {
                setSelectedCustomer(customer.customer_name)
                setSelectedCustomerId(customer.customer_id)
                setShowDialog(false)
                setSearchQuery("")
                onCustomerSelect(customer.customer_id)
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