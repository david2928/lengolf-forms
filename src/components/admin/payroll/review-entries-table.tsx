'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Edit, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ReviewEntry {
  entry_id: number;
  staff_id: number;
  staff_name: string;
  date: string;
  clock_in_time: string;
  clock_out_time: string | null;
  note: string;
  hours_worked: number;
  session_duration: number;
  has_missing_clockout: boolean;
  total_daily_hours: number;
  flagged_reasons: string[];
  // Computed fields for display
  timestamp?: string;
  action?: 'clock_in' | 'clock_out';
  issues?: string[];
  daily_total?: number;
}

interface ReviewEntriesTableProps {
  selectedMonth: string;
  onEntryUpdated: () => void;
}

export function ReviewEntriesTable({ selectedMonth, onEntryUpdated }: ReviewEntriesTableProps) {
  const [entries, setEntries] = useState<ReviewEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<ReviewEntry | null>(null);
  const [newTimestamp, setNewTimestamp] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedMonth) {
      fetchReviewEntries();
    }
  }, [selectedMonth]);

  const fetchReviewEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/payroll/${selectedMonth}/review-entries`);
      const data = await response.json();
      
      if (response.ok) {
        // Transform the API response to match component expectations
        const transformedEntries = (data.entries || []).map((entry: any) => ({
          ...entry,
          // Add backward compatibility fields
          timestamp: entry.clock_in_time,
          action: entry.clock_out_time ? 'clock_out' : 'clock_in',
          issues: entry.flagged_reasons || [],
          daily_total: entry.total_daily_hours || 0
        }));
        setEntries(transformedEntries);
      } else {
        const errorMessage = data.userMessage || data.error || 'Failed to fetch review entries';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching review entries:', error);
      setError('Failed to connect to payroll service');
      toast({
        title: 'Error',
        description: 'Failed to connect to payroll service',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditEntry = (entry: ReviewEntry) => {
    setEditingEntry(entry);
    setNewTimestamp(entry.clock_in_time || '');
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry || !newTimestamp) return;
    
    try {
      setSaving(true);
      
      const response = await fetch(`/api/admin/payroll/time-entry/${editingEntry.entry_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timestamp: newTimestamp
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Time entry updated successfully'
        });
        
        setEditingEntry(null);
        setNewTimestamp('');
        fetchReviewEntries();
        onEntryUpdated();
      } else {
        const errorMessage = data.userMessage || data.error || 'Failed to update time entry';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating time entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to update time entry',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeOnly = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getIssueColor = (issue: string) => {
    switch (issue.toLowerCase()) {
      case 'short_day':
        return 'secondary';
      case 'long_day':
        return 'destructive';
      case 'short_session':
        return 'outline';
      case 'long_session':
        return 'secondary';
      case 'missing_clockout':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getIssueText = (issue: string) => {
    switch (issue.toLowerCase()) {
      case 'short_day':
        return 'Short Day';
      case 'long_day':
        return 'Long Day';
      case 'short_session':
        return 'Short Session';
      case 'long_session':
        return 'Long Session';
      case 'missing_clockout':
        return 'Missing Clock-out';
      default:
        return issue;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Review Time Entries
          </CardTitle>
          <CardDescription>Loading flagged time entries...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[300px]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Review Time Entries
          </CardTitle>
          <CardDescription>Error loading time entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{error}</p>
            <Button 
              variant="outline" 
              onClick={fetchReviewEntries}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Review Time Entries
          </CardTitle>
          <CardDescription>
            All time entries look good for {selectedMonth}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Issues Found</h3>
            <p className="text-muted-foreground">
              All time entries for {selectedMonth} are within normal parameters.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Review Time Entries
        </CardTitle>
        <CardDescription>
          {entries.length} time entries need review for {selectedMonth}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Staff</TableHead>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[140px]">Times</TableHead>
                <TableHead className="w-[80px] text-center">Hours</TableHead>
                <TableHead className="w-[120px]">Issues</TableHead>
                <TableHead className="w-[60px] text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.entry_id} className="hover:bg-muted/50">
                  <TableCell className="font-medium py-3">{entry.staff_name}</TableCell>
                  <TableCell className="py-3">
                    <div className="text-sm text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        In: <span className="font-mono">{formatTimeOnly(entry.clock_in_time)}</span>
                      </div>
                      {entry.clock_out_time ? (
                        <div className="text-xs text-muted-foreground">
                          Out: <span className="font-mono">{formatTimeOnly(entry.clock_out_time)}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-red-500">No clock-out</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <div className="text-sm font-medium">
                      {(entry.total_daily_hours || 0).toFixed(1)}h
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {(entry.flagged_reasons || []).slice(0, 2).map((issue, index) => (
                        <Badge
                          key={index}
                          variant={getIssueColor(issue)}
                          className="text-xs px-1.5 py-0.5"
                        >
                          {getIssueText(issue)}
                        </Badge>
                      ))}
                      {(entry.flagged_reasons || []).length > 2 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                          +{(entry.flagged_reasons || []).length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditEntry(entry)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Edit Time Entry</DialogTitle>
                          <div className="text-sm text-muted-foreground">
                            {entry.staff_name} • {new Date(entry.date).toLocaleDateString()}
                          </div>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                            <div>
                              <Label className="text-xs text-muted-foreground">Status</Label>
                              <div className="text-sm font-medium">
                                {entry.clock_out_time ? 'Complete' : 'Incomplete'}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Daily Hours</Label>
                              <div className="text-sm font-medium">
                                {(entry.total_daily_hours || 0).toFixed(1)}h
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="timestamp">Clock In Time</Label>
                            <Input
                              id="timestamp"
                              type="datetime-local"
                              value={newTimestamp ? newTimestamp.slice(0, 16) : ''}
                              onChange={(e) => setNewTimestamp(e.target.value + ':00')}
                              className="mt-1"
                            />
                          </div>

                          {(entry.flagged_reasons || []).length > 0 && (
                            <div>
                              <Label className="text-sm font-medium">Issues</Label>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(entry.flagged_reasons || []).map((issue, index) => (
                                  <Badge
                                    key={index}
                                    variant={getIssueColor(issue)}
                                    className="text-xs"
                                  >
                                    {getIssueText(issue)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setEditingEntry(null)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleUpdateEntry}
                            disabled={saving}
                            className="flex-1"
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Save Changes
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 