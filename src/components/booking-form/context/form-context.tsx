import { createContext, useContext } from 'react';
import type { FormData, FormErrors } from '../types';

// New customer type for the customer management system
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
  // Legacy compatibility
  stable_hash_id?: string;
}

export interface FormContextType {
  formData: FormData;
  errors: FormErrors;
  setFormValue: (field: string, value: any) => void;
  handleCustomerSelect: (customer: NewCustomer) => void;
  handlePackageSelection: (id: string | null, name: string) => void;
  isSubmitting: boolean;
  customers: NewCustomer[];
  mutateCustomers?: () => Promise<any>;
  // Search functionality
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  // Customer cache
  selectedCustomerCache: NewCustomer | null;
}

export const FormContext = createContext<FormContextType | null>(null);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) throw new Error('useFormContext must be used within FormProvider');
  return context;
};