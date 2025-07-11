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
  Package
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
import { CustomerSearchSelect } from '@/components/admin/customers/customer-search-select';
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

export default function CustomerMappingPage() {
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
    fetchUnmappedRecords();
  }, [fetchUnmappedRecords]);

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
                        <CustomerSearchSelect
                          value={mappingState[record.groupKey]?.customerId}
                          onSelect={(customerId, customer) => 
                            handleCustomerSelect(record.groupKey, customerId, customer)
                          }
                          placeholder="Search and select customer..."
                          disabled={mappingState[record.groupKey]?.loading}
                          suggestedCustomers={record.suggestedCustomers}
                        />
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
    </div>
  );
}