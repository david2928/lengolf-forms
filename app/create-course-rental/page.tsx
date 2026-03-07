import { Metadata } from 'next'
import { CourseRentalClient } from './course-rental-client'

export const metadata: Metadata = {
  title: 'Create Course Rental | LENGOLF',
  description: 'Create club rental bookings for on-course use',
}

export default function CreateCourseRentalPage() {
  return <CourseRentalClient />
}
