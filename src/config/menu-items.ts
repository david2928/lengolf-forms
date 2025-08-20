import { CalendarRange, FileText, Clock, Package2, ListOrdered, ClipboardList, Calendar, Users, UserCheck, Link2, Trophy, Timer, ShoppingCart, Target, PencilLine, TrendingUp, CreditCard, Phone, Banknote, Search, BarChart3, Facebook, Share2, Activity, DollarSign, Settings } from 'lucide-react'
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
    icon: Link2,
    title: "Product Mapping",
    path: '/admin/products/mapping',
    description: "Map unmapped POS products to catalog products"
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
  },
  {
    icon: Users,
    title: "Staff Scheduling Admin",
    path: '/admin/staff-scheduling',
    description: "Manage staff schedules and coverage"
  },
  {
    icon: Target,
    title: "Competitor Tracking",
    path: '/admin/competitors',
    description: "Monitor competitor social media metrics"
  },
  {
    icon: PencilLine,
    title: "Quick Manual Entry",
    path: '/admin/competitors/manual',
    description: "Quickly enter competitor metrics manually"
  },
  {
    icon: TrendingUp,
    title: "Referral Analytics",
    path: '/admin/referral-analytics',
    description: "Analyze customer acquisition sources and trends"
  },
  {
    icon: CreditCard,
    title: "POS System",
    path: '/pos',
    description: "Point of Sale system with table management"
  },
  {
    icon: Phone,
    title: "Lead Feedback",
    path: '/lead-feedback',
    description: "Record B2C lead call outcomes and feedback"
  },
  {
    icon: Banknote,
    title: "Cash Check",
    path: '/cash-check',
    description: "Record opening and closing cash amounts"
  },
  {
    icon: Search,
    title: "Google Ads Analytics",
    path: '/admin/google-ads',
    description: "View Google Ads campaign and keyword performance data"
  },
  {
    icon: BarChart3,
    title: "Google Ads Strategic",
    path: '/admin/google-ads-strategic',
    description: "Strategic dashboard for offline business attribution and optimization"
  },
  {
    icon: Facebook,
    title: "Meta Leads Analytics",
    path: '/admin/meta-leads',
    description: "Analyze Meta lead forms and spam filtering performance"
  },
  {
    icon: Share2,
    title: "Meta Ads Analytics",
    path: '/admin/meta-ads',
    description: "View Meta Ads campaign performance and booking correlation data"
  },
  {
    icon: BarChart3,
    title: "Meta Ads Strategic",
    path: '/admin/meta-ads-strategic',
    description: "Strategic Meta Ads dashboard for offline business attribution and optimization"
  },
  {
    icon: Facebook,
    title: "Meta Ads Simple",
    path: '/admin/meta-ads-simple',
    description: "Simple Meta Ads dashboard with key metrics and trends"
  },
  {
    icon: Activity,
    title: "Marketing Dashboard",
    path: '/admin/marketing-dashboard',
    description: "Unified Google + Meta Ads performance dashboard with KPIs and trends"
  },
  {
    icon: DollarSign,
    title: "Finance Dashboard",
    path: '/admin/finance-dashboard',
    description: "Monthly P&L statements with actual vs run-rate projections"
  },
  {
    icon: Settings,
    title: "Operating Expenses",
    path: '/admin/finance-dashboard/operating-expenses',
    description: "Manage recurring expenses like rent, utilities, and staff costs"
  }
] 