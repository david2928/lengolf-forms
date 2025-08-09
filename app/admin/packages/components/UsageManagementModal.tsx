'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Package {
  id: string;
  customer_name: string;
  package_type_name: string;
  total_hours?: number;
  total_used_hours: number;
  remaining_hours?: number;
  is_unlimited: boolean;
}

interface UsageRecord {
  id: string;
  used_hours: number;
  used_date: string;
  employee_name: string;
  booking_id?: string;
  created_at: string;
  modified_by?: string;
  modification_reason?: string;
}

interface UsageManagementModalProps {
  isOpen: boolean;
  package?: Package;
  onClose: () => void;
}

export const UsageManagementModal: React.FC<UsageManagementModalProps> = ({
  isOpen,
  package: selectedPackage,
  onClose
}) => {
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [showAddUsage, setShowAddUsage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch usage records when modal opens
  useEffect(() => {
    if (isOpen && selectedPackage?.id) {
      fetchUsageRecords();
    } else if (!isOpen) {
      // Reset state when modal closes
      setUsageRecords([]);
      setShowAddUsage(false);
    }
  }, [isOpen, selectedPackage?.id]);

  const fetchUsageRecords = async () => {
    if (!selectedPackage?.id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/packages/${selectedPackage.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch package details');
      }
      
      const result = await response.json();
      const packageData = result.data;
      
      if (packageData?.package_usage) {
        // Sort usage records by date in descending order (most recent first)
        const sortedRecords = [...packageData.package_usage].sort((a, b) => {
          const dateA = new Date(a.used_date).getTime();
          const dateB = new Date(b.used_date).getTime();
          return dateB - dateA; // Descending order
        });
        setUsageRecords(sortedRecords);
      }
    } catch (error) {
      console.error('Error fetching usage records:', error);
      // TODO: Show toast error
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUsage = () => {
    setShowAddUsage(true);
    // TODO: Implement add usage modal
  };

  const handleEditUsage = (record: UsageRecord) => {
    console.log('Edit usage:', record.id);
    // TODO: Implement edit usage
  };

  const handleDeleteUsage = (record: UsageRecord) => {
    if (window.confirm('Are you sure you want to delete this usage record?')) {
      console.log('Delete usage:', record.id);
      // TODO: Implement delete usage
    }
  };

  if (!selectedPackage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Usage Records</DialogTitle>
          <DialogDescription>
            {selectedPackage.customer_name} - {selectedPackage.package_type_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Package Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedPackage.is_unlimited ? '∞' : selectedPackage.total_hours || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Hours</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {selectedPackage.total_used_hours}
                  </div>
                  <div className="text-sm text-muted-foreground">Hours Used</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {selectedPackage.is_unlimited 
                      ? '∞' 
                      : selectedPackage.remaining_hours || 0
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Remaining</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {usageRecords.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Sessions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Usage Records</h3>
            <Button onClick={handleAddUsage} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Usage
            </Button>
          </div>

          {/* Usage Records Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading usage records...</p>
                </div>
              ) : usageRecords.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No usage records found for this package.</p>
                  <Button 
                    onClick={handleAddUsage} 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Usage Record
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-gray-50/50">
                      <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[20%]">Date</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center">Hours</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[20%]">Employee</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%]">Booking</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[20%]">Modified By</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[10%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">
                              {format(new Date(record.used_date), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {format(new Date(record.created_at), 'h:mm a')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          <div className="font-semibold text-gray-900">
                            {record.used_hours}h
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-blue-700">
                                {record.employee_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">{record.employee_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          {record.booking_id ? (
                            <Badge variant="outline" className="font-medium">
                              #{record.booking_id}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-500">Manual Entry</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          {record.modified_by ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {record.modified_by.split('@')[0]}
                              </div>
                              {record.modification_reason && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {record.modification_reason}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">System</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUsage(record)}
                              className="h-8 px-2"
                              title="Edit usage"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUsage(record)}
                              className="h-8 px-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                              title="Delete usage"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};