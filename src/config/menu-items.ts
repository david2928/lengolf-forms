import { CalendarRange, FileText, Clock, Package2, ListOrdered, ClipboardList, Calendar, Users, UserCheck, Link2, Trophy, Timer, ShoppingCart } from 'lucide-react'
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
    description: "Monitor Unlimited and expiring packages"
  },
  {
    icon: ListOrdered,
    title: "Manage Bookings",
    path: '/manage-bookings',
    description: "Amend or cancel existing bookings"
  },
  {
    icon: Calendar,
    title: "Bookings Calendar",
    path: '/bookings-calendar',
    description: "Visual calendar view of all bookings"
  },
  {
    icon: ClipboardList,
    title: "Inventory Management",
    path: '/inventory',
    description: "Submit daily inventory reports"
  },
  {
    icon: ShoppingCart,
    title: "Product Management",
    path: '/admin/products',
    description: "Manage products, categories, and pricing"
  },
  {
    icon: Users,
    title: "Coaching Assistant",
    path: '/coaching-assist',
    description: "Help students find available coaching slots"
  },
  {
    icon: UserCheck,
    title: "Customer Management",
    path: '/admin/customers',
    description: "Manage customer information and analytics"
  },
  {
    icon: Link2,
    title: "Customer Mapping",
    path: '/admin/customers/mapping',
    description: "Link unmapped bookings and sales to customers"
  },
  {
    icon: Trophy,
    title: "US Open",
    path: '/special-events/us-open',
    description: "Record US Open scores and results"
  },
  {
    icon: Timer,
    title: "Staff Time Clock",
    path: '/time-clock',
    description: "Staff clock in/out system"
  },
  {
    icon: Calendar,
    title: "Staff Schedule",
    path: '/staff-schedule',
    description: "View personal work schedule"
  }
] 