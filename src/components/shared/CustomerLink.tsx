'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useCustomerModal } from '@/contexts/CustomerModalContext';

interface CustomerLinkProps {
  customerId: string | null | undefined;
  customerName: string;
  customerCode?: string | null | undefined;
  fromLocation?: string;
  fromLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export const CustomerLink: React.FC<CustomerLinkProps> = ({
  customerId,
  customerName,
  customerCode,
  fromLocation,
  fromLabel,
  className,
  children
}) => {
  const { openCustomerModal } = useCustomerModal();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (customerId) {
      openCustomerModal(
        customerId,
        customerName,
        customerCode,
        fromLocation,
        fromLabel
      );
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'text-blue-600 hover:text-blue-800 hover:underline transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded',
        'text-left font-medium',
        className
      )}
      title={`View customer details for ${customerName}`}
    >
      {children || customerName}
    </button>
  );
};