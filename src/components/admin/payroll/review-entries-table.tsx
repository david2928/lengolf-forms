'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Edit, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ReviewEntry {
  id: number;
  staff_id: number;
  staff_name: string;
  date: string;
  timestamp: string;
  action: 'clock_in' | 'clock_out';
  session_duration: number;
  daily_total: number;
  issues: string[];
  has_missing_clockout: boolean;
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
        setEntries(data.entries || []);
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
    setNewTimestamp(entry.timestamp);
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry || !newTimestamp) return;
    
    try {
      setSaving(true);
      
      const response = await fetch(`/api/admin/payroll/time-entry/${editingEntry.id}`, {
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

  const getIssueColor = (issue: string) => {
    switch (issue.toLowerCase()) {
      case 'short_day':
        return 'bg-yellow-100 text-yellow-800';
      case 'long_day':
        return 'bg-red-100 text-red-800';
      case 'short_session':
        return 'bg-blue-100 text-blue-800';
      case 'long_session':
        return 'bg-purple-100 text-purple-800';
      case 'missing_clockout':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
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
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
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
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Daily Total</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.staff_name}</TableCell>
                  <TableCell>
                    {new Date(entry.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.action === 'clock_in' ? 'default' : 'secondary'}>
                      {entry.action === 'clock_in' ? 'Clock In' : 'Clock Out'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatTimestamp(entry.timestamp)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {entry.daily_total.toFixed(1)} hours
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {entry.issues.map((issue, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className={`text-xs ${getIssueColor(issue)}`}
                        >
                          {getIssueText(issue)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEntry(entry)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Time Entry</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Staff</Label>
                            <div className="mt-1 text-sm">{entry.staff_name}</div>
                          </div>
                          <div>
                            <Label>Action</Label>
                            <div className="mt-1 text-sm">{entry.action}</div>
                          </div>
                          <div>
                            <Label htmlFor="timestamp">New Timestamp</Label>
                            <Input
                              id="timestamp"
                              type="datetime-local"
                              value={newTimestamp.slice(0, 16)}
                              onChange={(e) => setNewTimestamp(e.target.value + ':00')}
                            />
                          </div>
                          <div className="flex gap-2">
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
                            <Button
                              variant="outline"
                              onClick={() => setEditingEntry(null)}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
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