import { CalendarRange, FileText, Clock, Package2, ListOrdered, ClipboardList, Trophy } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

export interface MenuItem {
  icon: LucideIcon
  title: string
  path: string
  description: string
}

export const menuItems: MenuItem[] = [
  {
    icon: CalendarRange,
    title: "Create Booking",
    path: '/create-booking',
    description: "Book bays and manage appointments"
  },
  {
    icon: FileText,
    title: "Create Package",
    path: '/create-package',
    description: "Create new packages for customers"
  },
  {
    icon: Clock,
    title: "Update Package Usage",
    path: '/update-package',
    description: "Record package usage for customers"
  },
  {
    icon: Package2,
    title: "Package Monitor",
    path: '/package-monitor',
    description: "Monitor Diamond and expiring packages"
  },
  {
    icon: ListOrdered,
    title: "Manage Bookings",
    path: '/manage-bookings',
    description: "Amend or cancel existing bookings"
  },
  {
    icon: ClipboardList,
    title: "Inventory Management",
    path: '/inventory',
    description: "Submit daily inventory reports"
  },
  {
    icon: Trophy,
    title: "US Open",
    path: '/special-events/us-open',
    description: "Record US Open scores and results"
  }
] 