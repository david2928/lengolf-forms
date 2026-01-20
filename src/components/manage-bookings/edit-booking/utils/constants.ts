/**
 * EditBookingModal Constants
 * Extracted from the original component
 */

import type { Employee } from './types';

// Bay mapping to match API expectations
export const BAY_NAME_TO_API_BAY_NAME: { [key: string]: string } = {
  'Bay 1': 'Bay 1 (Bar)',
  'Bay 2': 'Bay 2',
  'Bay 3': 'Bay 3 (Entrance)',
  'Bay 4': 'Bay 4',
};

export const BAY_OPTIONS = Object.keys(BAY_NAME_TO_API_BAY_NAME);

// Employees list
export const EMPLOYEES_LIST: Employee[] = [
  { value: 'Dolly', label: 'Dolly' },
  { value: 'Net', label: 'Net' },
  { value: 'May', label: 'May' },
  { value: 'Ashley', label: 'Ashley' },
  { value: 'David', label: 'David' },
];