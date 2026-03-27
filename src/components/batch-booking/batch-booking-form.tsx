'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

import { EnhancedEmployeeSelector } from '@/components/booking-form-new/selectors/enhanced-employee-selector';
import { EnhancedCustomerTypeSelector } from '@/components/booking-form-new/selectors/enhanced-customer-type-selector';
import { EnhancedContactMethodSelector } from '@/components/booking-form-new/selectors/enhanced-contact-method-selector';
import { EnhancedBookingTypeSelector } from '@/components/booking-form-new/selectors/enhanced-booking-type-selector';
import { CustomerDetails } from '@/components/booking-form-new/customer-details';
import { PackageSelector } from '@/components/booking-form-new/package-selector';
import { MultiDatePicker } from './multi-date-picker';
import { generateBookingId } from '@/lib/booking-utils';

interface NewCustomer {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_number?: string;
  email?: string;
  preferred_contact_method?: 'Phone' | 'LINE' | 'Email';
  customer_status: string;
  lifetime_spending: string;
  total_bookings: number;
  last_visit_date?: string;
  stable_hash_id?: string;
}

interface BatchBookingResult {
  date: string;
  status: 'pending' | 'creating' | 'success' | 'failed';
  bookingId?: string;
  bay?: string;
  error?: string;
}

interface AvailabilityResult {
  available: boolean;
  availableBays: string[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Time options from 09:00 to 22:00 in 30-minute increments
const START_TIMES = Array.from({ length: 27 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9;
  const minute = (i % 2) * 30;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

const DURATION_OPTIONS = [
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
  { label: '2.5 hours', value: 150 },
  { label: '3 hours', value: 180 },
];

function getOrdinalSuffix(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

export function BatchBookingForm() {
  // Form state
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState<boolean | null>(null);
  const [customerContactedVia, setCustomerContactedVia] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<string | null>(null);
  const [numberOfPax, setNumberOfPax] = useState(1);
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(120);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<NewCustomer | null>(null);
  const [selectedCustomerCache, setSelectedCustomerCache] = useState<NewCustomer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Package state
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedPackageName, setSelectedPackageName] = useState<string>('');

  // Availability & submission state
  const [availability, setAvailability] = useState<Record<string, AvailabilityResult> | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<BatchBookingResult[] | null>(null);

  // Customer search
  const searchUrl =
    searchQuery.length >= 2
      ? `/api/customers?search=${encodeURIComponent(searchQuery)}&limit=100`
      : '/api/customers?limit=100&sortBy=lastVisit&sortOrder=desc';

  const { data: customersResponse } = useSWR<{
    customers: NewCustomer[];
  }>(isNewCustomer === false ? searchUrl : null, fetcher);

  // Computed display state (progressive disclosure)
  const showCustomerInfo = !!employeeName;
  const customerName = isNewCustomer ? newCustomerName : selectedCustomer?.customer_name || '';
  const customerPhone = isNewCustomer
    ? newCustomerPhone
    : selectedCustomer?.contact_number || '';
  const customerDetailsComplete = isNewCustomer !== null && (isNewCustomer ? !!newCustomerName && !!newCustomerPhone : !!selectedCustomer);
  const showBookingType = customerDetailsComplete;
  const showContactMethod = !!bookingType;
  const showTimeSelection = !!customerContactedVia;
  const showDateSelection = !!startTime;
  const showReview =
    selectedDates.length > 0 && !!startTime && !!bookingType && !!employeeName && !!customerContactedVia;

  const handleCustomerSelect = useCallback((customer: NewCustomer) => {
    setSelectedCustomer(customer);
    setSelectedCustomerCache(customer);
  }, []);

  const checkAvailability = useCallback(async () => {
    if (selectedDates.length === 0 || !startTime) return;

    setIsCheckingAvailability(true);
    try {
      const dateStrings = selectedDates.map((d) => format(d, 'yyyy-MM-dd'));
      const res = await fetch('/api/bookings/batch-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: dateStrings,
          start_time: startTime,
          duration,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAvailability(data.results);
      }
    } catch (error) {
      console.error('Availability check failed:', error);
    } finally {
      setIsCheckingAvailability(false);
    }
  }, [selectedDates, startTime, duration]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    const customerNameFinal = isNewCustomer ? newCustomerName : selectedCustomer?.customer_name || '';
    const customerPhoneFinal = isNewCustomer
      ? newCustomerPhone
      : selectedCustomer?.contact_number || '';
    const customerEmailFinal = isNewCustomer
      ? newCustomerEmail
      : selectedCustomer?.email || '';
    const customerId = isNewCustomer ? undefined : selectedCustomer?.id;

    setIsSubmitting(true);

    const bookingResults: BatchBookingResult[] = selectedDates.map((d) => ({
      date: format(d, 'yyyy-MM-dd'),
      status: 'pending' as const,
    }));
    setResults([...bookingResults]);

    const durationHours = duration / 60;
    const endTimeMinutes =
      parseInt(startTime!.split(':')[0]) * 60 +
      parseInt(startTime!.split(':')[1]) +
      duration;
    const endHour = Math.floor(endTimeMinutes / 60);
    const endMinute = endTimeMinutes % 60;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

    // Track customer_id across bookings (for new customer, first booking creates it)
    let resolvedCustomerId = customerId || null;

    for (let i = 0; i < bookingResults.length; i++) {
      const dateStr = bookingResults[i].date;

      // Skip dates with no availability
      if (availability && !availability[dateStr]?.available) {
        bookingResults[i] = {
          date: dateStr,
          status: 'failed',
          error: 'No bays available',
        };
        setResults([...bookingResults]);
        continue;
      }

      bookingResults[i].status = 'creating';
      setResults([...bookingResults]);

      try {
        const bookingId = generateBookingId();
        const bookingData: Record<string, unknown> = {
          id: bookingId,
          user_id: '059090f8-2d76-4f10-81de-5efe4d2d0fd8',
          name: customerNameFinal,
          email: customerEmailFinal || 'info@len.golf',
          phone_number: customerPhoneFinal,
          date: dateStr,
          start_time: startTime!,
          duration: durationHours,
          number_of_people: numberOfPax,
          status: 'confirmed',
          booking_type: bookingType,
          customer_notes: notes || null,
          package_name: selectedPackageName || null,
          package_id: selectedPackageId || null,
          customer_id: resolvedCustomerId,
          // Only mark as new customer on first booking in batch
          isNewCustomer: isNewCustomer && i === 0 && !resolvedCustomerId,
        };

        // Create booking
        const createRes = await fetch('/api/bookings/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingData),
        });

        if (!createRes.ok) {
          const errorData = await createRes.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${createRes.status}`);
        }

        const createResult = await createRes.json();
        const assignedBay = createResult.booking?.bay || 'Auto';

        // Capture customer_id from first booking for subsequent ones
        if (isNewCustomer && i === 0 && createResult.booking?.customer_id) {
          resolvedCustomerId = createResult.booking.customer_id;
        }

        // Format and send LINE notification
        const isNewCustomerFromApi = createResult.booking?.is_new_customer;
        const dateObj = new Date(dateStr + 'T00:00:00');
        const day = dateObj.getDate();
        const ordinalSuffix = getOrdinalSuffix(day);
        const weekday = format(dateObj, 'EEE');
        const month = format(dateObj, 'MMMM');
        const formattedDate = `${weekday}, ${day}${ordinalSuffix} ${month}`;

        const customerNameDisplay = isNewCustomerFromApi
          ? `${customerNameFinal} (New Customer)`
          : customerNameFinal;

        const bookingTypeDisplay = selectedPackageName
          ? `${bookingType} (${selectedPackageName})`
          : bookingType;

        let message = `Booking Notification (ID: ${bookingId})`;
        message += `\nName: ${customerNameDisplay}`;
        message += `\nPhone: ${customerPhoneFinal}`;
        message += `\nDate: ${formattedDate}`;
        message += `\nTime: ${startTime} - ${endTime}`;
        message += `\nBay: ${assignedBay}`;
        message += `\nType: ${bookingTypeDisplay}`;
        message += `\nPeople: ${numberOfPax}`;
        message += `\nChannel: ${customerContactedVia || 'N/A'}`;
        message += `\nCreated by: ${employeeName}`;
        if (notes) {
          message += `\nNotes: ${notes}`;
        }

        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, bookingType }),
        });

        bookingResults[i] = {
          date: dateStr,
          status: 'success',
          bookingId: createResult.bookingId,
          bay: assignedBay,
        };
      } catch (error) {
        bookingResults[i] = {
          date: dateStr,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      setResults([...bookingResults]);
    }

    setIsSubmitting(false);
  }, [
    isSubmitting,
    selectedDates,
    startTime,
    duration,
    bookingType,
    numberOfPax,
    notes,
    employeeName,
    customerContactedVia,
    isNewCustomer,
    newCustomerName,
    newCustomerPhone,
    newCustomerEmail,
    selectedCustomer,
    selectedPackageId,
    selectedPackageName,
    availability,
  ]);

  const handleReset = () => {
    setSelectedDates([]);
    setAvailability(null);
    setResults(null);
  };

  const handleFullReset = () => {
    setEmployeeName(null);
    setIsNewCustomer(null);
    setCustomerContactedVia(null);
    setBookingType(null);
    setNumberOfPax(1);
    setNotes('');
    setStartTime(null);
    setDuration(120);
    setSelectedDates([]);
    setSelectedCustomer(null);
    setSelectedCustomerCache(null);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
    setSearchQuery('');
    setSelectedPackageId(null);
    setSelectedPackageName('');
    setAvailability(null);
    setResults(null);
  };

  // Results view
  if (results) {
    const successCount = results.filter((r) => r.status === 'success').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating Bookings...
              </>
            ) : failedCount > 0 ? (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Batch Complete ({successCount}/{results.length} succeeded)
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                All {successCount} Bookings Created
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={result.date}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : result.status === 'failed'
                    ? 'bg-red-50 border-red-200'
                    : result.status === 'creating'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div>
                  <span className="font-medium text-sm">
                    {format(new Date(result.date + 'T00:00:00'), 'EEE, MMM d')}
                  </span>
                  <span className="text-sm text-gray-600 ml-2">
                    {startTime} ({duration / 60}h)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {result.status === 'success' && (
                    <>
                      <span className="text-gray-500">{result.bay}</span>
                      <span className="text-gray-400 text-xs">{result.bookingId}</span>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </>
                  )}
                  {result.status === 'failed' && (
                    <>
                      <span className="text-red-600 text-xs">{result.error}</span>
                      <XCircle className="h-4 w-4 text-red-600" />
                    </>
                  )}
                  {result.status === 'creating' && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  )}
                  {result.status === 'pending' && (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {!isSubmitting && (
            <div className="mt-4 flex gap-2">
              <Button onClick={handleReset} variant="outline" className="flex-1">
                Create Another Batch
              </Button>
              <Button onClick={handleFullReset} variant="ghost" className="flex-1">
                Start Fresh
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section 1: Staff */}
      <Card>
        <CardContent className="pt-4">
          <EnhancedEmployeeSelector
            value={employeeName}
            onChange={setEmployeeName}
          />
        </CardContent>
      </Card>

      {/* Section 2: Customer */}
      {showCustomerInfo && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EnhancedCustomerTypeSelector
              value={isNewCustomer}
              onChange={(val) => {
                setIsNewCustomer(val);
                setSelectedCustomer(null);
                setSelectedCustomerCache(null);
                setSelectedPackageId(null);
                setSelectedPackageName('');
                setBookingType(null);
              }}
            />

            {isNewCustomer !== null && (
              <CustomerDetails
                isNewCustomer={isNewCustomer}
                customers={customersResponse?.customers || []}
                selectedCustomerId={selectedCustomer?.id || ''}
                onCustomerSelect={handleCustomerSelect}
                customerName={isNewCustomer ? newCustomerName : selectedCustomer?.customer_name || ''}
                onCustomerNameChange={setNewCustomerName}
                phoneNumber={isNewCustomer ? newCustomerPhone : selectedCustomer?.contact_number || ''}
                onPhoneNumberChange={setNewCustomerPhone}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedCustomerCache={selectedCustomerCache}
                customerEmail={newCustomerEmail}
                onCustomerEmailChange={setNewCustomerEmail}
              />
            )}

            {/* Package selector for existing customers */}
            {!isNewCustomer && selectedCustomer && (
              <PackageSelector
                value={selectedPackageId || ''}
                customerName={selectedCustomer.customer_name}
                customerPhone={selectedCustomer.contact_number}
                customerId={selectedCustomer.id}
                bookingType={bookingType}
                onChange={(pkgId, pkgName) => {
                  setSelectedPackageId(pkgId);
                  setSelectedPackageName(pkgName);
                  if (pkgId) {
                    setBookingType('Package');
                  }
                }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 3: Booking Type & Contact Method */}
      {showBookingType && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <EnhancedBookingTypeSelector
              value={bookingType}
              onChange={setBookingType}
              hasSelectedPackage={!!selectedPackageId}
              packageName={selectedPackageName || undefined}
            />

            {showContactMethod && (
              <>
                <Separator />
                <EnhancedContactMethodSelector
                  value={customerContactedVia}
                  onChange={setCustomerContactedVia}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 4: Time & Dates */}
      {showTimeSelection && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time & Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pax */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Number of People</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={numberOfPax === n ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNumberOfPax(n)}
                    className="w-10"
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>

            {/* Start Time */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Start Time</Label>
              <div className="grid grid-cols-6 gap-1.5">
                {START_TIMES.map((time) => (
                  <Button
                    key={time}
                    type="button"
                    variant={startTime === time ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setStartTime(time);
                      setAvailability(null);
                    }}
                    className="text-xs px-1"
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Duration</Label>
              <div className="flex gap-2 flex-wrap">
                {DURATION_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={duration === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setDuration(opt.value);
                      setAvailability(null);
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Date Selection */}
            {showDateSelection && (
              <div>
                <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Select Dates
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  Click dates to select/deselect. All bookings will be at {startTime} for {duration / 60}h.
                </p>
                <MultiDatePicker
                  selectedDates={selectedDates}
                  onChange={(dates) => {
                    setSelectedDates(dates);
                    setAvailability(null);
                  }}
                />
              </div>
            )}

            {/* Notes */}
            {selectedDates.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-1 block">Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes applied to all bookings..."
                  rows={2}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 5: Review & Submit */}
      {showReview && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Review & Submit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <p><strong>Customer:</strong> {customerName}</p>
              <p><strong>Phone:</strong> {customerPhone}</p>
              <p><strong>Type:</strong> {selectedPackageName ? `${bookingType} (${selectedPackageName})` : bookingType}</p>
              <p><strong>Time:</strong> {startTime} ({duration / 60}h)</p>
              <p><strong>Pax:</strong> {numberOfPax}</p>
              <p><strong>Dates:</strong> {selectedDates.length}</p>
              {notes && <p><strong>Notes:</strong> {notes}</p>}
            </div>

            {/* Availability check */}
            {!availability && (
              <Button
                onClick={checkAvailability}
                disabled={isCheckingAvailability}
                className="w-full"
                variant="outline"
              >
                {isCheckingAvailability ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking Availability...
                  </>
                ) : (
                  'Check Availability'
                )}
              </Button>
            )}

            {/* Availability results */}
            {availability && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Availability:</p>
                {selectedDates.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const avail = availability[dateStr];
                  return (
                    <div
                      key={dateStr}
                      className={`flex items-center justify-between p-2 rounded border text-sm ${
                        avail?.available
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <span>{format(date, 'EEE, MMM d')}</span>
                      {avail?.available ? (
                        <span className="text-green-700 text-xs">
                          {avail.availableBays.join(', ')}
                        </span>
                      ) : (
                        <span className="text-red-700 text-xs flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> No bays available
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Submit button */}
                {Object.values(availability).some((a) => a.available) && (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full mt-3"
                  >
                    Create{' '}
                    {selectedDates.filter((d) => availability[format(d, 'yyyy-MM-dd')]?.available).length}{' '}
                    Bookings
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
