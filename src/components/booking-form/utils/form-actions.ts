import { FormData } from '../types';

export async function submitBooking(formData: FormData) {
  const response = await fetch('/api/bookings/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    throw new Error('Failed to create booking');
  }

  return response.json();
}