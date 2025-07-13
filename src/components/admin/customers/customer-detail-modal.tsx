/**
 * Customer Detail Modal Component
 * CMS-011: Comprehensive customer detail view modal with tabs
 * 
 * Displays:
 * - Overview: Basic customer information and contact details
 * - Transaction History: POS sales linked to customer
 * - Package History: Active and expired packages
 * - Booking History: All bookings with package usage
 * - Analytics: Customer spending patterns and metrics
 */

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar,
  MapPin,
  DollarSign,
  Package,
  CalendarDays,
  TrendingUp,
  Edit,
  X
} from 'lucide-react';
import { useCustomer } from '@/hooks/useCustomerManagement';
import { CustomerFormModal } from './customer-form-modal';

interface CustomerDetailModalProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerUpdated: () => void;
}

interface TransactionRecord {
  id: string;
  date: string;
  receipt_number: string;
  sales_net: number;
  items?: string;
  item_count?: number;
  payment_method?: string;
  staff?: string;
}

interface PackageRecord {
  id: string;
  package_name: string;
  purchase_date: string;
  expiration_date?: string;
  first_use_date?: string;
  uses_remaining?: number;
  status: 'active' | 'expired' | 'unused';
}

interface BookingRecord {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
  package_used?: string;
}

export function CustomerDetailModal({ 
  customerId, 
  open, 
  onOpenChange, 
  onCustomerUpdated 
}: CustomerDetailModalProps) {
  const { customer, loading, error, refetch } = useCustomer(customerId);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobile, setIsMobile] = useState(false);

  // Check if screen is mobile size
  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // Tab-specific data
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loadingTab, setLoadingTab] = useState<string | null>(null);
  
  // Pagination state for bookings
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsPagination, setBookingsPagination] = useState({ total: 0, hasMore: false });
  const BOOKINGS_PER_PAGE = 10;

  // Fetch tab-specific data
  const fetchTransactions = async () => {
    if (!customerId) return;
    setLoadingTab('transactions');
    try {
      const response = await fetch(`/api/customers/${customerId}/transactions`);
      const data = await response.json();
      if (response.ok) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTab(null);
    }
  };

  const fetchPackages = async () => {
    if (!customerId) return;
    setLoadingTab('packages');
    try {
      const response = await fetch(`/api/customers/${customerId}/packages`);
      const data = await response.json();
      if (response.ok) {
        setPackages(data.packages);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoadingTab(null);
    }
  };

  const fetchBookings = async (page = 1) => {
    if (!customerId) return;
    setLoadingTab('bookings');
    try {
      const offset = (page - 1) * BOOKINGS_PER_PAGE;
      const response = await fetch(`/api/customers/${customerId}/bookings?limit=${BOOKINGS_PER_PAGE}&offset=${offset}`);
      const data = await response.json();
      if (response.ok) {
        setBookings(data.bookings);
        setBookingsPagination({
          total: data.pagination.total,
          hasMore: data.pagination.hasMore
        });
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoadingTab(null);
    }
  };

  useEffect(() => {
    if (customerId && open) {
      setActiveTab('overview');
      // Reset data when opening
      setTransactions([]);
      setPackages([]);
      setBookings([]);
      setBookingsPage(1);
      setBookingsPagination({ total: 0, hasMore: false });
      setLoadedTabs(new Set());
    }
  }, [customerId, open]);

  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  // Fetch data when tab changes
  useEffect(() => {
    if (!customerId || !open) return;

    const tabKey = `${customerId}-${activeTab}`;
    if (loadedTabs.has(tabKey)) return; // Already loaded

    switch (activeTab) {
      case 'transactions':
        fetchTransactions();
        break;
      case 'packages':
        fetchPackages();
        break;
      case 'bookings':
        fetchBookings(1);
        break;
    }
    
    setLoadedTabs(prev => new Set(prev).add(tabKey));
  }, [activeTab, customerId, open]);

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    refetch();
    onCustomerUpdated();
  };

  // Mobile Transaction Card Component
  const TransactionCard = ({ transaction }: { transaction: TransactionRecord }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold text-gray-900">
              ฿{transaction.sales_net.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">
              {format(new Date(transaction.date), 'dd MMM yyyy')}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {transaction.item_count || 0} items
          </Badge>
        </div>
        <p className="text-xs font-mono text-gray-500">
          Receipt: {transaction.receipt_number}
        </p>
      </CardContent>
    </Card>
  );

  // Mobile Package Card Component
  const PackageCard = ({ pkg }: { pkg: PackageRecord }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {pkg.package_name}
            </p>
            <p className="text-sm text-gray-600">
              Purchased: {format(new Date(pkg.purchase_date), 'dd MMM yyyy')}
            </p>
            {pkg.expiration_date && (
              <p className="text-sm text-gray-600">
                Expires: {format(new Date(pkg.expiration_date), 'dd MMM yyyy')}
              </p>
            )}
          </div>
          <div className="text-right">
            <Badge 
              variant={pkg.status === 'active' ? 'default' : 'secondary'}
              className="mb-1"
            >
              {pkg.status}
            </Badge>
            {pkg.uses_remaining && (
              <p className="text-xs text-gray-500">
                {pkg.uses_remaining} uses left
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Mobile Booking Card Component  
  const BookingCard = ({ booking }: { booking: BookingRecord }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold text-gray-900">
              {format(new Date(booking.date), 'dd MMM yyyy')} at {booking.time}
            </p>
            <p className="text-sm text-gray-600">
              {booking.type}
            </p>
            {booking.package_used && (
              <p className="text-xs text-gray-500 mt-1">
                Package: {booking.package_used}
              </p>
            )}
          </div>
          <Badge 
            variant={
              booking.status === 'confirmed' ? 'default' : 
              booking.status === 'cancelled' ? 'destructive' : 
              'secondary'
            }
          >
            {booking.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  if (!open || !customerId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`
          ${isMobile 
            ? 'max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] m-2' 
            : 'max-w-4xl max-h-[90vh] w-full'
          } 
          overflow-hidden flex flex-col [&>button]:hidden
        `}>
          <DialogHeader className="flex-shrink-0 px-4 md:px-6 py-4 border-b">
            <div className={`flex items-center justify-between ${isMobile ? 'gap-2' : 'gap-4'}`}>
              <DialogTitle className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold truncate`}>
                Customer Details
              </DialogTitle>
              <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "sm"}
                  onClick={() => setEditModalOpen(true)}
                  disabled={loading}
                  className={isMobile ? "px-2" : ""}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {!isMobile && "Edit"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-500">Error loading customer: {error}</p>
              <Button 
                variant="outline" 
                onClick={refetch}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          ) : customer ? (
            <div className="flex-1 overflow-hidden">
              {/* Customer Header */}
              <div className={`${isMobile ? 'px-4 py-3' : 'px-6 py-4'} border-b bg-muted/50`}>
                <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-start justify-between'}`}>
                  <div className="flex-1 min-w-0">
                    <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center gap-2'}`}>
                      <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold truncate`}>
                        {customer.customer.customer_name}
                      </h2>
                      <Badge variant="outline" className="font-normal w-fit">
                        {customer.customer.customer_code}
                      </Badge>
                    </div>
                    <div className={`${isMobile ? 'flex flex-col gap-1 mt-2' : 'flex items-center gap-4 mt-2'} text-sm text-muted-foreground`}>
                      {customer.customer.contact_number && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{customer.customer.contact_number}</span>
                        </span>
                      )}
                      {customer.customer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{customer.customer.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={isMobile ? 'flex justify-start' : ''}>
                    <Badge 
                      variant={customer.customer.is_active ? "default" : "secondary"}
                    >
                      {customer.customer.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs 
                value={activeTab} 
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col h-full"
              >
                {isMobile ? (
                  /* Mobile Tabs - Scrollable */
                  <div className="border-b overflow-x-auto">
                    <TabsList className="inline-flex h-10 items-center justify-start rounded-none bg-transparent p-0 w-max">
                      <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-2 text-sm">
                        Info
                      </TabsTrigger>
                      <TabsTrigger value="transactions" className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-2 text-sm">
                        Sales
                      </TabsTrigger>
                      <TabsTrigger value="packages" className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-2 text-sm">
                        Packages
                      </TabsTrigger>
                      <TabsTrigger value="bookings" className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-2 text-sm">
                        Bookings
                      </TabsTrigger>
                      <TabsTrigger value="profiles" className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-2 text-sm">
                        Login
                      </TabsTrigger>
                      <TabsTrigger value="analytics" className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-2 text-sm">
                        Stats
                      </TabsTrigger>
                    </TabsList>
                  </div>
                ) : (
                  /* Desktop Tabs - Grid */
                  <TabsList className="grid w-full grid-cols-6 px-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="packages">Packages</TabsTrigger>
                    <TabsTrigger value="bookings">Bookings</TabsTrigger>
                    <TabsTrigger value="profiles">Profiles</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>
                )}

                <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-4 mt-0">
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Basic Information */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium">
                            Basic Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Full Name</p>
                              <p className="font-medium">{customer.customer.customer_name}</p>
                            </div>
                          </div>
                          
                          {customer.customer.date_of_birth && (
                            <div className="flex items-center gap-3">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Date of Birth</p>
                                <p className="font-medium">
                                  {format(new Date(customer.customer.date_of_birth), 'dd MMM yyyy')}
                                </p>
                              </div>
                            </div>
                          )}

                          {customer.customer.address && (
                            <div className="flex items-start gap-3">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                              <div>
                                <p className="text-sm text-muted-foreground">Address</p>
                                <p className="font-medium">{customer.customer.address}</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Contact Information */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium">
                            Contact Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Phone Number</p>
                              <p className="font-medium">
                                {customer.customer.contact_number || 'Not provided'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Email</p>
                              <p className="font-medium">
                                {customer.customer.email || 'Not provided'}
                              </p>
                            </div>
                          </div>

                          {customer.customer.preferred_contact_method && (
                            <div className="pt-2">
                              <p className="text-sm text-muted-foreground mb-1">
                                Preferred Contact Method
                              </p>
                              <Badge variant="secondary">
                                {customer.customer.preferred_contact_method}
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Business Summary */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium">
                            Business Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Customer Since</p>
                              <p className="font-medium">
                                {format(new Date(customer.customer.customer_create_date), 'dd MMM yyyy')}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Last Visit</p>
                              <p className="font-medium">
                                {customer.customer.last_visit_date 
                                  ? format(new Date(customer.customer.last_visit_date), 'dd MMM yyyy')
                                  : 'Never'}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Total Visits</p>
                              <p className="text-2xl font-bold">
                                {customer.customer.total_visits || 0}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Lifetime Value</p>
                              <p className="text-2xl font-bold">
                                ฿{customer.customer.total_lifetime_value?.toLocaleString() || '0'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Quick Stats */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium">
                            Quick Stats
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="space-y-1">
                              <DollarSign className="h-8 w-8 mx-auto text-green-600" />
                              <p className="text-sm text-muted-foreground">Total Spent</p>
                              <p className="font-bold">
                                ฿{customer.transactionSummary.totalSpent.toLocaleString()}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <Package className="h-8 w-8 mx-auto text-blue-600" />
                              <p className="text-sm text-muted-foreground">Active Packages</p>
                              <p className="font-bold">
                                {customer.packageSummary.activePackages}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <CalendarDays className="h-8 w-8 mx-auto text-purple-600" />
                              <p className="text-sm text-muted-foreground">Total Bookings</p>
                              <p className="font-bold">
                                {customer.bookingSummary.totalBookings}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Notes Section */}
                    {customer.customer.notes && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium">Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="max-h-24 sm:max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {customer.customer.notes}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Transaction History Tab */}
                  <TabsContent value="transactions" className="mt-0 h-full flex flex-col">
                    <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} mb-4 px-1`}>
                      <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
                        Transaction History
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        Total: ฿{customer.transactionSummary.totalSpent.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col min-h-0">
                        {loadingTab === 'transactions' ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">Loading transactions...</p>
                            </div>
                          </div>
                        ) : transactions.length > 0 ? (
                          isMobile ? (
                            /* Mobile Card View */
                            <div className="flex-1 overflow-y-auto space-y-3">
                              {transactions.map((transaction) => (
                                <TransactionCard key={transaction.id} transaction={transaction} />
                              ))}
                            </div>
                          ) : (
                            /* Desktop Table View */
                            <div className="flex-1 flex flex-col space-y-2">
                              <div className="flex-1 border border-gray-200 rounded-lg bg-white min-h-0 max-h-96 overflow-y-auto">
                                <Table className="w-full">
                                  <TableHeader>
                                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                    <TableHead className="font-semibold text-gray-700 py-6 px-8 w-[160px]">Date</TableHead>
                                    <TableHead className="font-semibold text-gray-700 py-6 px-6 w-[150px]">Receipt #</TableHead>
                                    <TableHead className="font-semibold text-gray-700 py-6 px-6 w-[80px] text-center"># Items</TableHead>
                                    <TableHead className="font-semibold text-gray-700 py-6 px-6 w-[140px] text-right">Amount</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {transactions.map((transaction, index) => (
                                    <TableRow 
                                      key={transaction.id}
                                      className={`
                                        hover:bg-gray-50/50 transition-colors
                                        ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/25'}
                                      `}
                                    >
                                      <TableCell className="py-6 px-8 font-medium text-gray-900 text-base">
                                        {format(new Date(transaction.date), 'dd MMM yyyy')}
                                      </TableCell>
                                      <TableCell className="py-6 px-6 font-mono text-sm text-gray-700">
                                        {transaction.receipt_number}
                                      </TableCell>
                                      <TableCell className="py-6 px-6 text-gray-600 text-center">
                                        {transaction.item_count || 0}
                                      </TableCell>
                                      <TableCell className="py-6 px-6 text-right font-semibold text-gray-900 text-base">
                                        ฿{transaction.sales_net.toLocaleString()}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>No transactions found for this customer</p>
                            <p className="text-sm mt-1">
                              Customer-transaction linking in progress (CMS-016.2)
                            </p>
                            <p className="text-xs mt-1 text-gray-400">
                              Found {(transactions || []).length} matching phone records
                            </p>
                          </div>
                        )}
                    </div>
                  </TabsContent>

                  {/* Package History Tab */}
                  <TabsContent value="packages" className="mt-0 h-full flex flex-col">
                    <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} mb-4 px-1`}>
                      <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
                        Package History
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        Active: {customer.packageSummary.activePackages} / Total: {customer.packageSummary.totalPackages}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col min-h-0">
                        {loadingTab === 'packages' ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">Loading packages...</p>
                            </div>
                          </div>
                        ) : packages.length > 0 ? (
                          isMobile ? (
                            /* Mobile Card View */
                            <div className="flex-1 overflow-y-auto space-y-3">
                              {packages.map((pkg) => (
                                <PackageCard key={pkg.id} pkg={pkg} />
                              ))}
                            </div>
                          ) : (
                            /* Desktop Table View */
                            <div className="flex-1 border border-gray-200 rounded-lg bg-white min-h-0 max-h-96 overflow-y-auto">
                              <Table className="w-full">
                                <TableHeader>
                                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                    <TableHead className="font-semibold text-gray-700 py-6 px-8">Package Name</TableHead>
                                    <TableHead className="font-semibold text-gray-700 py-6 px-6 w-[150px]">Purchase Date</TableHead>
                                    <TableHead className="font-semibold text-gray-700 py-6 px-6 w-[150px]">Expiry Date</TableHead>
                                    <TableHead className="font-semibold text-gray-700 py-6 px-6 w-[140px]">Uses Remaining</TableHead>
                                    <TableHead className="font-semibold text-gray-700 py-6 px-6 w-[120px]">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {packages.map((pkg, index) => (
                                    <TableRow 
                                      key={pkg.id}
                                      className={`
                                        hover:bg-gray-50/50 transition-colors
                                        ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/25'}
                                      `}
                                    >
                                      <TableCell className="py-6 px-8 font-medium text-gray-900 text-base">
                                        {pkg.package_name}
                                      </TableCell>
                                      <TableCell className="py-6 px-6 text-gray-700">
                                        {format(new Date(pkg.purchase_date), 'dd MMM yyyy')}
                                      </TableCell>
                                      <TableCell className="py-6 px-6 text-gray-700">
                                        {pkg.expiration_date 
                                          ? format(new Date(pkg.expiration_date), 'dd MMM yyyy')
                                          : <span className="text-gray-400 italic">No expiry</span>}
                                      </TableCell>
                                      <TableCell className="py-6 px-6 text-gray-700 text-center">
                                        {pkg.uses_remaining || (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="py-6 px-6">
                                        <Badge 
                                          variant={pkg.status === 'active' ? 'default' : 'secondary'}
                                          className="font-medium"
                                        >
                                          {pkg.status}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>No packages found</p>
                          </div>
                        )}
                    </div>
                  </TabsContent>

                  {/* Booking History Tab */}
                  <TabsContent value="bookings" className="mt-0 h-full flex flex-col">
                    <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} mb-4 px-1`}>
                      <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
                        Booking History
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        Total: {customer.bookingSummary.totalBookings} | Upcoming: {customer.bookingSummary.upcomingBookings}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col min-h-0">
                        {loadingTab === 'bookings' ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">Loading bookings...</p>
                            </div>
                          </div>
                        ) : bookings.length > 0 ? (
                          <div className="flex-1 flex flex-col space-y-2">
                            {isMobile ? (
                              /* Mobile Card View */
                              <div className="flex-1 overflow-y-auto space-y-3">
                                {bookings.map((booking) => (
                                  <BookingCard key={booking.id} booking={booking} />
                                ))}
                              </div>
                            ) : (
                              /* Desktop Table View */
                              <div className="flex-1 border border-gray-200 rounded-lg bg-white min-h-0 max-h-96 overflow-y-auto">
                                <Table className="w-full">
                                  <TableHeader>
                                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                      <TableHead className="font-semibold text-gray-700 py-6 px-8 w-[140px]">Date</TableHead>
                                      <TableHead className="font-semibold text-gray-700 py-6 px-6 w-[100px]">Time</TableHead>
                                      <TableHead className="font-semibold text-gray-700 py-6 px-6 w-[120px]">Type</TableHead>
                                      <TableHead className="font-semibold text-gray-700 py-6 px-6">Package Used</TableHead>
                                      <TableHead className="font-semibold text-gray-700 py-6 px-6 w-[120px]">Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {bookings.map((booking, index) => (
                                      <TableRow 
                                        key={booking.id}
                                        className={`
                                          hover:bg-gray-50/50 transition-colors
                                          ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/25'}
                                        `}
                                      >
                                        <TableCell className="py-6 px-8 font-medium text-gray-900 text-base">
                                          {format(new Date(booking.date), 'dd MMM yyyy')}
                                        </TableCell>
                                        <TableCell className="py-6 px-6 text-gray-700 font-mono text-sm">
                                          {booking.time}
                                        </TableCell>
                                        <TableCell className="py-6 px-6 text-gray-700">
                                          {booking.type}
                                        </TableCell>
                                        <TableCell className="py-6 px-6 text-gray-600">
                                          {booking.package_used || (
                                            <span className="text-gray-400 italic">No package</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="py-6 px-6">
                                          <Badge 
                                            variant={
                                              booking.status === 'confirmed' ? 'default' : 
                                              booking.status === 'cancelled' ? 'destructive' : 
                                              'secondary'
                                            }
                                            className="font-medium"
                                          >
                                            {booking.status}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}

                            {/* Pagination Controls */}
                            {bookingsPagination.total > BOOKINGS_PER_PAGE && (
                              <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center justify-between'} px-2`}>
                                <div className={`text-sm text-gray-500 ${isMobile ? 'text-center' : ''}`}>
                                  Showing {((bookingsPage - 1) * BOOKINGS_PER_PAGE) + 1} to{' '}
                                  {Math.min(bookingsPage * BOOKINGS_PER_PAGE, bookingsPagination.total)} of{' '}
                                  {bookingsPagination.total} bookings
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const newPage = bookingsPage - 1;
                                      setBookingsPage(newPage);
                                      fetchBookings(newPage);
                                    }}
                                    disabled={bookingsPage === 1 || loadingTab === 'bookings'}
                                    className="h-8"
                                  >
                                    Previous
                                  </Button>
                                  <span className="text-sm text-gray-500 px-2">
                                    Page {bookingsPage} of {Math.ceil(bookingsPagination.total / BOOKINGS_PER_PAGE)}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const newPage = bookingsPage + 1;
                                      setBookingsPage(newPage);
                                      fetchBookings(newPage);
                                    }}
                                    disabled={!bookingsPagination.hasMore || loadingTab === 'bookings'}
                                    className="h-8"
                                  >
                                    Next
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>No bookings found</p>
                          </div>
                        )}
                    </div>
                  </TabsContent>

                  {/* Analytics Tab */}
                  <TabsContent value="analytics" className="space-y-4 mt-0">
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Spending Analytics */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium">
                            Spending Analytics
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Total Lifetime Value
                              </span>
                              <span className="font-bold">
                                ฿{customer.transactionSummary.totalSpent.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Average Transaction
                              </span>
                              <span className="font-medium">
                                ฿{customer.transactionSummary.averageTransaction.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Total Transactions
                              </span>
                              <span className="font-medium">
                                {customer.transactionSummary.totalTransactions}
                              </span>
                            </div>
                          </div>
                          
                          {customer.transactionSummary.lastTransaction && (
                            <div className="pt-2 border-t">
                              <p className="text-sm text-muted-foreground">
                                Last Transaction
                              </p>
                              <p className="font-medium">
                                {customer.transactionSummary.lastTransaction}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Visit Patterns */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium">
                            Visit Patterns
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Total Visits
                              </span>
                              <span className="font-bold">
                                {customer.bookingSummary.totalBookings}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Customer Since
                              </span>
                              <span className="font-medium">
                                {format(new Date(customer.customer.customer_create_date), 'MMM yyyy')}
                              </span>
                            </div>
                            {customer.bookingSummary.lastBooking && (
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">
                                  Last Booking
                                </span>
                                <span className="font-medium">
                                  {customer.bookingSummary.lastBooking}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t">
                            <p className="text-sm text-muted-foreground mb-1">
                              Customer Status
                            </p>
                            <Badge 
                              variant={
                                customer.bookingSummary.upcomingBookings > 0 ? 'default' : 
                                customer.bookingSummary.lastBooking && 
                                new Date(customer.bookingSummary.lastBooking) > 
                                new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) 
                                ? 'secondary' : 'outline'
                              }
                            >
                              {customer.bookingSummary.upcomingBookings > 0 ? 'Active' : 
                               customer.bookingSummary.lastBooking && 
                               new Date(customer.bookingSummary.lastBooking) > 
                               new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) 
                               ? 'Recent' : 'Inactive'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Package Analytics */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium">
                            Package Analytics
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Total Packages
                              </span>
                              <span className="font-bold">
                                {customer.packageSummary.totalPackages}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Active Packages
                              </span>
                              <span className="font-medium text-green-600">
                                {customer.packageSummary.activePackages}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Expired Packages
                              </span>
                              <span className="font-medium text-muted-foreground">
                                {customer.packageSummary.totalPackages - customer.packageSummary.activePackages}
                              </span>
                            </div>
                          </div>

                          {customer.packageSummary.lastPackagePurchase && (
                            <div className="pt-2 border-t">
                              <p className="text-sm text-muted-foreground">
                                Last Package Purchase
                              </p>
                              <p className="font-medium">
                                {customer.packageSummary.lastPackagePurchase}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Engagement Score */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-medium">
                            Engagement Score
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-4">
                            <TrendingUp className="h-12 w-12 mx-auto mb-2 text-primary" />
                            <p className="text-3xl font-bold text-primary">
                              {calculateEngagementScore(customer)}%
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Based on visit frequency and spending
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Profiles Tab */}
                  <TabsContent value="profiles" className="space-y-4 mt-0">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium">
                          Linked Login Profiles
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {customer.customer.customer_profiles && 
                         customer.customer.customer_profiles.length > 0 ? (
                          <div className="space-y-4">
                            {customer.customer.customer_profiles.map((profile: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{profile.display_name || 'Website User'}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      {profile.provider && (
                                        <Badge variant="outline" className="text-xs">
                                          {profile.provider === 'google' ? 'Google' :
                                           profile.provider === 'facebook' ? 'Facebook' :
                                           profile.provider === 'line' ? 'LINE' :
                                           profile.provider === 'guest' ? 'Guest' : 
                                           profile.provider}
                                        </Badge>
                                      )}
                                      {profile.email && profile.email !== 'info@len.golf' && (
                                        <span className="flex items-center gap-1">
                                          <Mail className="w-3 h-3" />
                                          {profile.email}
                                        </span>
                                      )}
                                    </div>
                                    {profile.provider_id && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Provider ID: <span className="font-mono">{profile.provider_id}</span>
                                      </p>
                                    )}
                                    {profile.updated_at && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Last active: {format(new Date(profile.updated_at), 'dd MMM yyyy')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Profile ID</p>
                                  <p className="text-xs font-mono">{profile.id}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No login profiles linked</p>
                            <p className="text-sm">This customer hasn&apos;t logged in through the website</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <CustomerFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onCustomerCreated={handleEditSuccess}
        customerId={customerId}
      />
    </>
  );
}

// Helper function to calculate engagement score
function calculateEngagementScore(customer: any): number {
  // Simple engagement calculation based on various factors
  let score = 0;
  
  // Recent activity (last 90 days)
  if (customer.bookingSummary.lastBooking) {
    const daysSinceLastBooking = Math.floor(
      (Date.now() - new Date(customer.bookingSummary.lastBooking).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastBooking < 30) score += 30;
    else if (daysSinceLastBooking < 60) score += 20;
    else if (daysSinceLastBooking < 90) score += 10;
  }
  
  // Visit frequency
  const monthsSinceJoined = Math.max(1, Math.floor(
    (Date.now() - new Date(customer.customer.customer_create_date).getTime()) / 
    (1000 * 60 * 60 * 24 * 30)
  ));
  const visitsPerMonth = customer.bookingSummary.totalBookings / monthsSinceJoined;
  if (visitsPerMonth >= 2) score += 30;
  else if (visitsPerMonth >= 1) score += 20;
  else if (visitsPerMonth >= 0.5) score += 10;
  
  // Active packages
  if (customer.packageSummary.activePackages > 0) score += 20;
  
  // Spending level
  const avgTransaction = customer.transactionSummary.averageTransaction;
  if (avgTransaction > 1000) score += 20;
  else if (avgTransaction > 500) score += 10;
  
  return Math.min(100, score);
}