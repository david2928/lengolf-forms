/**
 * Customer Mapping Admin Page
 * Allows staff to manually link unmapped bookings and sales to customers
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Receipt, 
  Phone, 
  Mail, 
  AlertCircle, 
  CheckCircle,
  Link2,
  Search,
  Filter,
  Loader2,
  Package,
  Users,
  Merge,
  Trash2,
  UserX,
  UserPlus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { CustomerSearchSelect } from '@/components/admin/customers/customer-search-select';
import { CustomerFormModal } from '@/components/admin/customers/customer-form-modal';
import { ManualMergeTab } from '@/components/admin/customers/ManualMergeTab';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface GroupedUnmappedRecord {
  groupKey: string;
  customerName: string;
  phoneNumber: string;
  normalizedPhone: string;
  email?: string;
  recordCount: number;
  bookingCount: number;
  salesCount: number;
  packageCount: number;
  totalAmount: number;
  latestDate: string;
  oldestDate: string;
  recordIds: string[];
  suggestedCustomers?: Array<{
    id: string;
    customerCode: string;
    customerName: string;
    contactNumber: string;
    matchScore: number;
    matchReason: string;
  }>;
}

interface MappingState {
  [groupKey: string]: {
    customerId: string;
    customerName: string;
    loading: boolean;
  };
}

interface DuplicateCustomerGroup {
  contact_number: string;
  customer_count: number;
  customers: Array<{
    id: string;
    customer_code: string;
    customer_name: string;
    contact_number: string;
    email: string | null;
    created_at: string;
    total_visits: number;
    total_lifetime_value: number;
    last_visit_date: string | null;
    bookings_count: number;
    sales_count: number;
    packages_count: number;
  }>;
  suggested_primary_id: string;
  merge_conflicts: {
    different_names: boolean;
    different_emails: boolean;
  };
}

export default function CustomerMappingPage() {
  // Unmapped tab state
  const [records, setRecords] = useState<GroupedUnmappedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    unmappedBookings: 0,
    unmappedSales: 0,
    unmappedPackages: 0,
    total: 0
  });
  const [filter, setFilter] = useState<'all' | 'booking' | 'sale' | 'package'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mappingState, setMappingState] = useState<MappingState>({});
  const [successCount, setSuccessCount] = useState(0);

  // Duplicates tab state
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateCustomerGroup[]>([]);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [duplicatesTotals, setDuplicatesTotals] = useState({
    duplicate_groups: 0,
    duplicate_customers: 0,
    extra_customers: 0
  });
  const [duplicatesSearchTerm, setDuplicatesSearchTerm] = useState('');
  const [includeTestData, setIncludeTestData] = useState(false);
  const [mergedCount, setMergedCount] = useState(0);
  const [activeTab, setActiveTab] = useState('unmapped');
  
  // Create customer modal state
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [prePopulateData, setPrePopulateData] = useState<{
    fullName: string;
    primaryPhone: string;
    email?: string;
  } | null>(null);

  const fetchDuplicateCustomers = useCallback(async () => {
    setDuplicatesLoading(true);
    try {
      const params = new URLSearchParams({
        search: duplicatesSearchTerm,
        limit: '20',
        includeTestData: includeTestData.toString()
      });

      const response = await fetch(`/api/customers/duplicates?${params}`);
      if (!response.ok) throw new Error('Failed to fetch duplicate customers');

      const data = await response.json();
      setDuplicateGroups(data.groups);
      setDuplicatesTotals(data.totals);
    } catch (error) {
      console.error('Error fetching duplicate customers:', error);
      toast.error('Failed to load duplicate customers');
    } finally {
      setDuplicatesLoading(false);
    }
  }, [duplicatesSearchTerm, includeTestData]);

  const fetchUnmappedRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: filter,
        search: searchTerm,
        limit: '20'
      });

      const response = await fetch(`/api/customers/unmapped?${params}`);
      if (!response.ok) throw new Error('Failed to fetch records');

      const data = await response.json();
      setRecords(data.records);
      setTotals(data.totals);
    } catch (error) {
      console.error('Error fetching unmapped records:', error);
      toast.error('Failed to load unmapped records');
    } finally {
      setLoading(false);
    }
  }, [filter, searchTerm]);

  useEffect(() => {
    if (activeTab === 'unmapped') {
      fetchUnmappedRecords();
    } else if (activeTab === 'duplicates') {
      fetchDuplicateCustomers();
    }
  }, [fetchUnmappedRecords, fetchDuplicateCustomers, activeTab]);

  const handleCustomerSelect = (groupKey: string, customerId: string, customer: any) => {
    setMappingState(prev => ({
      ...prev,
      [groupKey]: {
        customerId,
        customerName: customer.customer_name,
        loading: false
      }
    }));
  };

  const handleLinkCustomer = async (record: GroupedUnmappedRecord) => {
    const mapping = mappingState[record.groupKey];
    if (!mapping?.customerId) {
      toast.error('Please select a customer first');
      return;
    }

    setMappingState(prev => ({
      ...prev,
      [record.groupKey]: { ...prev[record.groupKey], loading: true }
    }));

    try {
      const response = await fetch('/api/customers/unmapped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordIds: record.recordIds,
          customerId: mapping.customerId,
          groupKey: record.groupKey
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link customer');
      }

      const result = await response.json();
      
      toast.success(result.message, {
        description: `${record.recordCount} records for ${record.customerName} linked to ${result.customer.customer_name}`,
        duration: 5000
      });

      // Remove the linked group from the list
      setRecords(prev => prev.filter(r => r.groupKey !== record.groupKey));
      setSuccessCount(prev => prev + record.recordCount);
      
      // Update totals (subtract the actual records that were linked)
      setTotals(prev => ({ 
        ...prev, 
        unmappedBookings: prev.unmappedBookings - record.bookingCount, 
        unmappedSales: prev.unmappedSales - record.salesCount,
        unmappedPackages: prev.unmappedPackages - record.packageCount,
        total: prev.total - record.recordCount 
      }));

    } catch (error: any) {
      console.error('Error linking customer:', error);
      toast.error(error.message || 'Failed to link customer');
    } finally {
      setMappingState(prev => ({
        ...prev,
        [record.groupKey]: { ...prev[record.groupKey], loading: false }
      }));
    }
  };

  const handleMergeCustomers = async (group: DuplicateCustomerGroup, primaryId: string, duplicateIds: string[]) => {
    try {
      const response = await fetch('/api/customers/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryCustomerId: primaryId,
          duplicateCustomerIds: duplicateIds,
          mergeStrategy: 'combine_data'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to merge customers');
      }

      const result = await response.json();
      
      toast.success(result.message, {
        description: `Merged ${result.deleted_customers} customers with ${result.merged_counts.total} records`,
        duration: 5000
      });

      setMergedCount(prev => prev + result.deleted_customers);
      fetchDuplicateCustomers();
      
    } catch (error: any) {
      console.error('Error merging customers:', error);
      toast.error(error.message || 'Failed to merge customers');
    }
  };

  const handleDeleteCustomers = async (customerIds: string[]) => {
    try {
      const response = await fetch('/api/customers/duplicates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerIds,
          force: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete customers');
      }

      const result = await response.json();
      
      toast.success(result.message, {
        description: result.warnings ? 'Some customers had associated records' : undefined,
        duration: 5000
      });

      fetchDuplicateCustomers();
      
    } catch (error: any) {
      console.error('Error deleting customers:', error);
      toast.error(error.message || 'Failed to delete customers');
    }
  };

  const handleCreateNewCustomer = (record: GroupedUnmappedRecord) => {
    setPrePopulateData({
      fullName: record.customerName,
      primaryPhone: record.phoneNumber,
      email: record.email && record.email !== 'info@len.golf' ? record.email : undefined
    });
    setShowCreateCustomer(true);
  };

  const handleCustomerCreated = () => {
    // Refresh unmapped records after creating a new customer
    fetchUnmappedRecords();
    setPrePopulateData(null);
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Customer Mapping</h1>
        <p className="text-muted-foreground">
          Link unmapped bookings, sales, and packages to existing customers
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="unmapped" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Unmapped Records
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Duplicate Customers
          </TabsTrigger>
          <TabsTrigger value="manual-merge" className="flex items-center gap-2">
            <Merge className="h-4 w-4" />
            Manual Merge
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unmapped" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unmapped Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.unmappedBookings}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unmapped Sales</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.unmappedSales}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unmapped Packages</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.unmappedPackages}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Unmapped</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Linked Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{successCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter unmapped records by type or search</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Records</SelectItem>
                    <SelectItem value="booking">Bookings Only</SelectItem>
                    <SelectItem value="sale">Sales Only</SelectItem>
                    <SelectItem value="package">Packages Only</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Button 
                  onClick={fetchUnmappedRecords} 
                  variant="outline"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Filter className="h-4 w-4" />
                  )}
                  <span className="ml-2">Refresh</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle>Unmapped Records</CardTitle>
              <CardDescription>
                Select a customer for each record and click Link to associate them
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading unmapped records...
                </div>
              ) : records.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {searchTerm || filter !== 'all' 
                      ? 'No unmapped records found matching your filters.'
                      : 'Great! All bookings, sales, and packages are linked to customers.'}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Records</TableHead>
                        <TableHead className="w-[140px]">Date Range</TableHead>
                        <TableHead className="w-[280px]">Customer Information</TableHead>
                        <TableHead className="w-[220px]">Record IDs</TableHead>
                        <TableHead className="w-[320px]">Select Customer</TableHead>
                        <TableHead className="w-[120px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.groupKey} className="h-auto">
                          <TableCell className="py-4">
                            <div className="space-y-2">
                              <div className="font-bold text-xl text-primary">{record.recordCount} records</div>
                              <div className="flex flex-wrap gap-1">
                                {record.bookingCount > 0 && (
                                  <Badge variant="default" className="text-xs">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {record.bookingCount} booking{record.bookingCount > 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {record.salesCount > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Receipt className="h-3 w-3 mr-1" />
                                    {record.salesCount} sale{record.salesCount > 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {record.packageCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    <Package className="h-3 w-3 mr-1" />
                                    {record.packageCount} package{record.packageCount > 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {record.totalAmount > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {formatCurrency(record.totalAmount)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 whitespace-nowrap font-medium">
                            <div className="text-sm">
                              <div className="font-semibold">{format(new Date(record.oldestDate), 'dd MMM yyyy')}</div>
                              {record.oldestDate !== record.latestDate && (
                                <div className="text-muted-foreground">
                                  to {format(new Date(record.latestDate), 'dd MMM yyyy')}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="space-y-2">
                              <div className="font-semibold text-lg leading-tight">{record.customerName}</div>
                              <div className="space-y-1">
                                {record.phoneNumber && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Phone className="h-4 w-4 flex-shrink-0" />
                                    <span className="font-mono text-base">{record.phoneNumber}</span>
                                  </div>
                                )}
                                {record.email && record.email !== 'info@len.golf' && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{record.email}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="text-xs font-mono space-y-1 max-h-24 overflow-y-auto bg-muted/30 p-2 rounded">
                              {record.recordIds.slice(0, 4).map(id => (
                                <div key={id} className="truncate">{id}</div>
                              ))}
                              {record.recordIds.length > 4 && (
                                <div className="text-muted-foreground font-sans">
                                  +{record.recordIds.length - 4} more...
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="space-y-2">
                              <CustomerSearchSelect
                                value={mappingState[record.groupKey]?.customerId}
                                onSelect={(customerId, customer) => 
                                  handleCustomerSelect(record.groupKey, customerId, customer)
                                }
                                placeholder="Search and select customer..."
                                disabled={mappingState[record.groupKey]?.loading}
                                suggestedCustomers={record.suggestedCustomers}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCreateNewCustomer(record)}
                                disabled={mappingState[record.groupKey]?.loading}
                                className="w-full text-xs"
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Create New Customer
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Button
                              size="default"
                              onClick={() => handleLinkCustomer(record)}
                              disabled={!mappingState[record.groupKey]?.customerId || mappingState[record.groupKey]?.loading}
                              className="whitespace-nowrap"
                            >
                              {mappingState[record.groupKey]?.loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Link2 className="h-4 w-4" />
                              )}
                              <span className="ml-2">Link All</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-4">
          {/* Duplicate Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Duplicate Groups</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{duplicatesTotals.duplicate_groups}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Duplicates</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{duplicatesTotals.duplicate_customers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Extra Customers</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{duplicatesTotals.extra_customers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Merged Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{mergedCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Duplicate Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter duplicate customers by phone number or include test data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by phone number..."
                    value={duplicatesSearchTerm}
                    onChange={(e) => setDuplicatesSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeTestData"
                    checked={includeTestData}
                    onChange={(e) => setIncludeTestData(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="includeTestData" className="text-sm">
                    Include test data
                  </label>
                </div>

                <Button 
                  onClick={fetchDuplicateCustomers} 
                  variant="outline"
                  disabled={duplicatesLoading}
                >
                  {duplicatesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Filter className="h-4 w-4" />
                  )}
                  <span className="ml-2">Refresh</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Duplicate Results */}
          <Card>
            <CardHeader>
              <CardTitle>Duplicate Customer Groups</CardTitle>
              <CardDescription>
                Review and merge duplicate customers with the same contact number
              </CardDescription>
            </CardHeader>
            <CardContent>
              {duplicatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading duplicate customers...
                </div>
              ) : duplicateGroups.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {duplicatesSearchTerm || !includeTestData
                      ? 'No duplicate customers found matching your filters.'
                      : 'Great! No duplicate customers found.'}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {duplicateGroups.map((group) => (
                    <Card key={group.contact_number} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span className="font-semibold">{group.contact_number}</span>
                            <Badge variant="outline">{group.customer_count} customers</Badge>
                            {group.merge_conflicts.different_names && (
                              <Badge variant="destructive">Different names</Badge>
                            )}
                            {group.merge_conflicts.different_emails && (
                              <Badge variant="destructive">Different emails</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Usage</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.customers.map((customer) => (
                                <TableRow 
                                  key={customer.id}
                                  className={customer.id === group.suggested_primary_id ? 'bg-green-50' : ''}
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{customer.customer_name}</span>
                                      {customer.id === group.suggested_primary_id && (
                                        <Badge variant="default" className="text-xs">Primary</Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{customer.customer_code}</TableCell>
                                  <TableCell className="text-sm">{customer.email || '-'}</TableCell>
                                  <TableCell className="text-sm">
                                    {format(new Date(customer.created_at), 'dd MMM yyyy')}
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm space-y-1">
                                      <div>{customer.bookings_count} bookings</div>
                                      <div>{customer.sales_count} sales</div>
                                      <div>{customer.packages_count} packages</div>
                                      <div className="font-medium">{formatCurrency(customer.total_lifetime_value)}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      {customer.id !== group.suggested_primary_id && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            const duplicateIds = group.customers
                                              .filter(c => c.id !== group.suggested_primary_id)
                                              .map(c => c.id);
                                            handleMergeCustomers(group, group.suggested_primary_id, duplicateIds);
                                          }}
                                        >
                                          <Merge className="h-3 w-3 mr-1" />
                                          Merge All
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDeleteCustomers([customer.id])}
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Delete
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual-merge" className="space-y-4">
          <ManualMergeTab />
        </TabsContent>
      </Tabs>

      {/* Create Customer Modal */}
      <CustomerFormModal
        open={showCreateCustomer}
        onOpenChange={setShowCreateCustomer}
        onCustomerCreated={handleCustomerCreated}
        prePopulateData={prePopulateData}
      />
    </div>
  );
}