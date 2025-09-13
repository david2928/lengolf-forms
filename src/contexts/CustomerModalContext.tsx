'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationHistoryEntry {
  location: string;
  label: string;
}

interface CustomerModalState {
  isOpen: boolean;
  customerId: string | null;
  customerName: string | null;
  customerCode: string | null;
  navigationHistory: NavigationHistoryEntry[];
}

interface CustomerModalContextValue {
  state: CustomerModalState;
  openCustomerModal: (
    customerId: string | null | undefined,
    customerName: string,
    customerCode?: string | null | undefined,
    fromLocation?: string,
    fromLabel?: string
  ) => void;
  closeCustomerModal: () => void;
  goBack: () => void;
  canGoBack: boolean;
}

const CustomerModalContext = createContext<CustomerModalContextValue | undefined>(undefined);

interface CustomerModalProviderProps {
  children: ReactNode;
}

export const CustomerModalProvider: React.FC<CustomerModalProviderProps> = ({ children }) => {
  const [state, setState] = useState<CustomerModalState>({
    isOpen: false,
    customerId: null,
    customerName: null,
    customerCode: null,
    navigationHistory: []
  });

  const openCustomerModal = (
    customerId: string | null | undefined,
    customerName: string,
    customerCode?: string | null | undefined,
    fromLocation?: string,
    fromLabel?: string
  ) => {
    // Only open modal if we have a valid customerId
    if (!customerId) {
      return;
    }

    setState(prev => ({
      ...prev,
      isOpen: true,
      customerId,
      customerName,
      customerCode: customerCode || null,
      navigationHistory: fromLocation && fromLabel
        ? [{ location: fromLocation, label: fromLabel }]
        : []
    }));
  };

  const closeCustomerModal = () => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      customerId: null,
      customerName: null,
      customerCode: null,
      navigationHistory: []
    }));
  };

  const goBack = () => {
    // Close the modal - navigation history is used for display purposes
    closeCustomerModal();
  };

  const canGoBack = state.navigationHistory.length > 0;

  const value: CustomerModalContextValue = {
    state,
    openCustomerModal,
    closeCustomerModal,
    goBack,
    canGoBack
  };

  return (
    <CustomerModalContext.Provider value={value}>
      {children}
    </CustomerModalContext.Provider>
  );
};

export const useCustomerModal = (): CustomerModalContextValue => {
  const context = useContext(CustomerModalContext);
  if (context === undefined) {
    throw new Error('useCustomerModal must be used within a CustomerModalProvider');
  }
  return context;
};