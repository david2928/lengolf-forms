/**
 * Customer Bookings Tab
 * Displays booking history with pagination
 * TODO: Full implementation in next phase
 */

import React from 'react';
import { PaginatedResponsiveDataView } from '../shared/ResponsiveDataView';
import { CustomerTabError } from '../shared/CustomerDetailError';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatBookingDateTime } from '../utils/customerFormatters';
import type { BookingRecord } from '../utils/customerTypes';

interface CustomerBookingsTabProps {
  customerId: string;
  data: BookingRecord[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

/**
 * Booking card for mobile view
 */
const BookingCard: React.FC<{ booking: BookingRecord }> = ({ booking }) => (
  <Card>
    <CardContent className="p-4">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium">{booking.type}</p>
            <p className="text-sm text-muted-foreground">
              {formatBookingDateTime(booking.date, booking.time)}
            </p>
          </div>
          <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
            {booking.status}
          </Badge>
        </div>
        
        {booking.bay && (
          <div className="text-sm">
            <span className="text-muted-foreground">Bay: </span>
            <span className="font-medium">{booking.bay}</span>
          </div>
        )}
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {booking.number_of_people} {booking.number_of_people === 1 ? 'person' : 'people'}
          </span>
          {booking.duration && <span>{booking.duration} min</span>}
        </div>
        
        {booking.package_used && (
          <div className="text-xs">
            <span className="text-muted-foreground">Package: </span>
            <span className="font-medium">{booking.package_used}</span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

/**
 * Bookings table for desktop view
 */
const BookingsTable: React.FC<{ bookings: BookingRecord[] }> = ({ bookings }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Date & Time</TableHead>
        <TableHead>Type</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Bay</TableHead>
        <TableHead>People</TableHead>
        <TableHead>Duration</TableHead>
        <TableHead>Package Used</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {bookings.map((booking) => (
        <TableRow key={booking.id}>
          <TableCell>
            <div>
              <p>{formatDate(booking.date)}</p>
              <p className="text-sm text-muted-foreground">{booking.time}</p>
            </div>
          </TableCell>
          <TableCell className="font-medium">{booking.type}</TableCell>
          <TableCell>
            <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
              {booking.status}
            </Badge>
          </TableCell>
          <TableCell>{booking.bay || 'N/A'}</TableCell>
          <TableCell>{booking.number_of_people}</TableCell>
          <TableCell>
            {booking.duration ? `${booking.duration} min` : 'N/A'}
          </TableCell>
          <TableCell className="text-sm">
            {booking.package_used || 'No package'}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

/**
 * Customer Bookings Tab Component
 */
export const CustomerBookingsTab: React.FC<CustomerBookingsTabProps> = ({
  customerId,
  data,
  loading,
  error,
  currentPage,
  totalPages,
  onPageChange,
  onRefresh
}) => {
  if (error) {
    return (
      <CustomerTabError 
        error={error} 
        onRetry={onRefresh}
        tabName="bookings"
      />
    );
  }

  return (
    <PaginatedResponsiveDataView
      data={data}
      loading={loading}
      renderCard={(booking) => <BookingCard booking={booking} />}
      renderTable={() => <BookingsTable bookings={data} />}
      emptyState="No bookings found for this customer"
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      onRefresh={onRefresh}
      onRetry={onRefresh}
    />
  );
};