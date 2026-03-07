import { Metadata } from 'next'
import { ManageRentalsClient } from './manage-rentals-client'

export const metadata: Metadata = {
  title: 'Manage Club Rentals | LENGOLF',
  description: 'View and manage course club rental bookings',
}

export default function ManageClubRentalsPage() {
  return <ManageRentalsClient />
}
