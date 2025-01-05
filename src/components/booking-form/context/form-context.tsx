import { createContext, useContext } from 'react';
import type { FormData, FormErrors } from '../types';
import type { Customer } from '@/types/package-form';

export interface FormContextType {
  formData: FormData;
  errors: FormErrors;
  setFormValue: (field: string, value: any) => void;
  handleCustomerSelect: (customer: Customer) => void;
  handlePackageSelection: (id: string, name: string) => void;
  isSubmitting: boolean;
  customers: Customer[];
}

export const FormContext = createContext<FormContextType | null>(null);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) throw new Error('useFormContext must be used within FormProvider');
  return context;
};