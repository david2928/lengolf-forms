'use client'

import { useState, useEffect } from 'react';
import { format, addMinutes, differenceInMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Shield, CheckCircle2, Loader2, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BayBlockingData, BayBlockingTemplate } from '@/types/booking-form';
import { BAY_BLOCKING_TEMPLATES } from '@/types/booking-form';

interface BayBlockingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string | null;
  onSuccess: (blockedBays: string[], reason: string, timeRange: string) => void;
}

// Available staff members for selection (same as in EnhancedEmployeeSelector)
const STAFF_MEMBERS = [
  'Eak',
  'Dolly',
  'Net',
  'May',
  'Winnie',
  'Other'
] as const;

const BAYS = [
  { id: 'Bay 1', name: 'Bay 1' },
  { id: 'Bay 2', name: 'Bay 2' },
  { id: 'Bay 3', name: 'Bay 3' },
  { id: 'Bay 4', name: 'Bay 4' }
];

export function BayBlockingModal({ 
  open, 
  onOpenChange, 
  employeeName, 
  onSuccess 
}: BayBlockingModalProps) {
  const [selectedBays, setSelectedBays] = useState<string[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [reason, setReason] = useState<string>('');
  const [localEmployeeName, setLocalEmployeeName] = useState<string>('');
  const [otherEmployeeName, setOtherEmployeeName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    bays: string[];
    reason: string;
    timeRange: string;
  } | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedBays([]);
      setDate(new Date());
      setStartTime('10:00');
      setEndTime('12:00');
      setReason('');
      setLocalEmployeeName(employeeName || ''); // Use provided employeeName or empty
      setOtherEmployeeName('');
      setIsSubmitting(false);
      setShowSuccess(false);
      setSuccessInfo(null);
    }
  }, [open, employeeName]);

  // Update end time when start time changes (default 2 hours duration)
  useEffect(() => {
    if (startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = addMinutes(startDate, 120); // 2 hours default
      setEndTime(format(endDate, 'HH:mm'));
    }
  }, [startTime]);

  const handleBayToggle = (bayId: string) => {
    setSelectedBays(prev => 
      prev.includes(bayId) 
        ? prev.filter(id => id !== bayId)
        : [...prev, bayId]
    );
  };

  const handleTemplateClick = (template: BayBlockingTemplate) => {
    setReason(template);
  };

  const calculateDuration = (): number => {
    if (!startTime || !endTime) return 0;
    
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);
    
    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);
    
    // Handle overnight scenario
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    return differenceInMinutes(endDate, startDate) / 60;
  };

  const isFormValid = () => {
    let effectiveEmployeeName = localEmployeeName || employeeName;
    
    // If "Other" is selected, use the otherEmployeeName
    if (localEmployeeName === 'Other' && otherEmployeeName.trim()) {
      effectiveEmployeeName = otherEmployeeName.trim();
    }
    
    return selectedBays.length > 0 && 
           reason.trim() !== '' && 
           startTime && 
           endTime && 
           effectiveEmployeeName && 
           effectiveEmployeeName.trim() !== '' &&
           !(localEmployeeName === 'Other' && !otherEmployeeName.trim()); // Ensure "Other" has a name
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setIsSubmitting(true);
    
    try {
      let effectiveEmployeeName = localEmployeeName || employeeName;
      
      // If "Other" is selected, use the otherEmployeeName
      if (localEmployeeName === 'Other' && otherEmployeeName.trim()) {
        effectiveEmployeeName = otherEmployeeName.trim();
      }
      
      const blockingData: BayBlockingData = {
        bays: selectedBays,
        date,
        startTime,
        endTime,
        reason,
        employeeName: effectiveEmployeeName!
      };

      const response = await fetch('/api/bookings/block-bays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blockingData),
      });

      if (!response.ok) {
        throw new Error('Failed to block bays');
      }

      const result = await response.json();
      
      if (result.success) {
        const timeRange = `${startTime} - ${endTime}`;
        setSuccessInfo({
          bays: selectedBays,
          reason,
          timeRange
        });
        setShowSuccess(true);
        
        // Notify parent component
        onSuccess(selectedBays, reason, timeRange);
        
        // Close modal after showing success
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to block bays');
      }
    } catch (error) {
      console.error('Error blocking bays:', error);
      // You could add error state handling here
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (showSuccess && successInfo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-screen h-screen max-w-none sm:w-auto sm:h-auto sm:max-w-[500px] p-4 sm:p-6 rounded-none sm:rounded-lg flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3 sm:space-y-4 py-4 sm:py-8">
            <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
            <div className="text-center space-y-1 sm:space-y-2">
              <h3 className="text-base sm:text-lg font-semibold">Bays Blocked Successfully</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {successInfo.bays.length} bay(s) blocked from {successInfo.timeRange}
              </p>
            </div>
            <Card className="w-full border-green-200 bg-green-50">
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="font-medium text-green-900 text-xs sm:text-sm">
                      Blocked Bays: {successInfo.bays.join(', ')}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-green-700">
                    Reason: {successInfo.reason}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none sm:w-auto sm:h-auto sm:max-w-[600px] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-none sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            Block Bays
          </DialogTitle>
          <DialogDescription className="text-sm">
            Block one or more bays for maintenance or events
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Bay Selection */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-sm sm:text-base">Select Bays to Block</Label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {BAYS.map((bay) => (
                <label key={bay.id} className="cursor-pointer">
                  <div className={cn(
                    "flex items-center rounded-lg border p-2 sm:p-3 transition-colors",
                    selectedBays.includes(bay.id)
                      ? "bg-destructive/10 border-destructive"
                      : "hover:bg-accent"
                  )}>
                    <Checkbox
                      checked={selectedBays.includes(bay.id)}
                      onCheckedChange={() => handleBayToggle(bay.id)}
                      className="mr-2 sm:mr-3"
                    />
                    <div className="flex items-center gap-2 sm:gap-3">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      <span className="font-medium text-sm sm:text-base">{bay.name}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Staff Member</Label>
            {employeeName ? (
              <div className="flex items-center p-2 sm:p-3 bg-muted rounded-md">
                <span className="font-medium text-sm sm:text-base">{employeeName}</span>
                <span className="text-xs sm:text-sm text-muted-foreground ml-2">(from booking form)</span>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                <Select value={localEmployeeName} onValueChange={(value) => {
                  setLocalEmployeeName(value);
                  if (value !== 'Other') {
                    setOtherEmployeeName(''); // Clear other name when selecting predefined staff
                  }
                }}>
                  <SelectTrigger className="text-sm sm:text-base">
                    <SelectValue placeholder="Select staff member who is blocking bays" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_MEMBERS.map((staff) => (
                      <SelectItem key={staff} value={staff} className="text-sm sm:text-base">
                        {staff}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {localEmployeeName === 'Other' && (
                  <Input
                    placeholder="Enter staff member name..."
                    value={otherEmployeeName}
                    onChange={(e) => setOtherEmployeeName(e.target.value)}
                    className="mt-2 text-sm sm:text-base"
                  />
                )}
              </div>
            )}
          </div>

          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2 text-sm sm:text-base">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={format(date, 'yyyy-MM-dd')}
                onChange={(e) => setDate(new Date(e.target.value))}
                className="text-sm sm:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm sm:text-base">
                <Clock className="h-4 w-4" />
                Duration: {calculateDuration()}h
              </Label>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Auto-calculated from time range
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="text-sm sm:text-base">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-sm sm:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="text-sm sm:text-base">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-sm sm:text-base">Reason for Blocking</Label>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              {BAY_BLOCKING_TEMPLATES.map((template) => (
                <Button
                  key={template}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTemplateClick(template)}
                  className={cn(
                    "text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 h-auto",
                    reason === template && "bg-accent text-accent-foreground"
                  )}
                >
                  {template}
                </Button>
              ))}
            </div>
            <Textarea
              placeholder="Enter reason for blocking or select from templates above..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="text-sm sm:text-base"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto order-2 sm:order-1 text-sm sm:text-base"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            className="w-full sm:w-auto order-1 sm:order-2 text-sm sm:text-base"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="text-sm sm:text-base">Blocking Bays...</span>
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                <span className="text-sm sm:text-base">Block {selectedBays.length} Bay{selectedBays.length !== 1 ? 's' : ''}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}