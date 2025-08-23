'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  Archive, 
  Calculator,
  FileText,
  Shield,
  Activity,
  Mail,
  Receipt,
  Users,
  UserCheck,
  Link2,
  Clock,
  ShoppingCart,
  CalendarDays,
  Percent,
  BarChart3,
  Target,
  Settings,
  Cog,
  Camera,
  Package
} from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { ScreenSizeIndicator } from '@/components/ui/screen-size-indicator'

interface AdminMenuItemProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick: () => void;
}

// Admin Menu Items Configuration - Using new grouping structure
const salesAnalyticsItems = [
  {
    icon: TrendingUp,
    title: "Sales Dashboard",
    description: "View revenue trends, KPIs, and business analytics",
    path: "/admin/sales-dashboard"
  },
  {
    icon: FileText,
    title: "Sales Report",
    description: "Comprehensive sales reporting with daily breakdown and export",
    path: "/admin/sales-report"
  },
  {
    icon: Receipt,
    title: "Transaction History",
    description: "View and manage POS transactions",
    path: "/admin/transactions"
  },
  {
    icon: Activity,
    title: "Performance Analytics",
    description: "Monitor real-time availability system performance",
    path: "/admin/performance"
  },
  {
    icon: BarChart3,
    title: "Referral Analytics",
    description: "Track and analyze customer referral patterns",
    path: "/admin/referral-analytics"
  },
  {
    icon: Target,
    title: "Competitor Tracking",
    description: "Monitor competitor pricing and trends",
    path: "/admin/competitors"
  }
];

const customerManagementItems = [
  {
    icon: UserCheck,
    title: "Customer Management",
    description: "Manage customer information and view analytics",
    path: "/admin/customers"
  },
  {
    icon: Link2,
    title: "Customer Mapping",
    description: "Link unmapped bookings and sales to customers",
    path: "/admin/customers/mapping"
  },
  {
    icon: Package,
    title: "Package Management",
    description: "Advanced package administration and transfers",
    path: "/admin/packages"
  },
  {
    icon: Mail,
    title: "Meta Leads",
    description: "Analyze Facebook/Instagram leads and spam detection",
    path: "/admin/meta-leads"
  }
];

const productInventoryItems = [
  {
    icon: ShoppingCart,
    title: "Product Management",
    description: "Manage product catalog, categories, and pricing for POS system",
    path: "/admin/products"
  },
  {
    icon: Link2,
    title: "Product Mapping",
    description: "Map products across different systems",
    path: "/admin/products/mapping"
  },
  {
    icon: Archive,
    title: "Inventory Management",
    description: "Monitor stock levels and manage products",
    path: "/admin/inventory"
  },
  {
    icon: Percent,
    title: "Discount Management",
    description: "Create and manage discounts for POS system",
    path: "/admin/discounts"
  }
];

const staffPayrollItems = [
  {
    icon: Users,
    title: "Staff Management",
    description: "Manage staff accounts, permissions, and time tracking settings",
    path: "/admin/staff-management"
  },
  {
    icon: CalendarDays,
    title: "Staff Scheduling",
    description: "Manage staff schedules, view coverage, and resolve conflicts",
    path: "/admin/staff-scheduling"
  },
  {
    icon: Clock,
    title: "Time Clock",
    description: "Comprehensive time tracking reports and photo administration",
    path: "/admin/time-clock"
  },
  {
    icon: Calculator,
    title: "Payroll Calculations",
    description: "Calculate and review staff payroll",
    path: "/admin/payroll-calculations"
  }
];

const financialOperationsItems = [
  {
    icon: TrendingUp,
    title: "Finance Dashboard",
    description: "Comprehensive P&L analysis and financial KPIs",
    path: "/admin/finance-dashboard"
  },
  {
    icon: FileText,
    title: "Invoice Management",
    description: "Generate and manage supplier invoices",
    path: "/admin/invoices"
  },
  {
    icon: Calculator,
    title: "Reconciliation",
    description: "Reconcile transactions and payments",
    path: "/admin/reconciliation"
  }
];

const otherItems = [
  {
    icon: Camera,
    title: "Photo Management",
    description: "Manage staff photos and time clock images",
    path: "/admin/photo-management"
  },
  {
    icon: Settings,
    title: "Coaching Management",
    description: "Manage coaching schedules and availability",
    path: "/coaching"
  }
];

export default function AdminDashboard() {
  const router = useRouter()
  const isMobile = useMediaQuery('(max-width: 768px)')

  const MobileMenuItem = ({ icon: Icon, title, description, onClick }: AdminMenuItemProps) => (
    <div 
      className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{title}</h2>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  )

  const DesktopMenuItem = ({ icon: Icon, title, onClick }: AdminMenuItemProps) => (
    <div 
      className="flex flex-col p-6 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer h-full min-h-[240px]"
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center flex-1">
        <Icon className="h-12 w-12 mb-4 text-primary" />
        <h2 className="text-lg lg:text-xl font-semibold leading-tight">{title}</h2>
      </div>
      <Button 
        className="w-full mt-6" 
        variant="secondary"
      >
        {title}
      </Button>
    </div>
  )

  return (
    <div className="container max-w-6xl py-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">LENGOLF Admin</h1>
      </div>

      {/* Mobile Layout */}
      <div className="space-y-6 md:hidden">
        <div>
          <h2 className="text-lg font-semibold mb-3">Sales & Analytics</h2>
          <div className="space-y-3">
            {salesAnalyticsItems.map((item) => (
              <MobileMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Customer Management</h2>
          <div className="space-y-3">
            {customerManagementItems.map((item) => (
              <MobileMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Product & Inventory</h2>
          <div className="space-y-3">
            {productInventoryItems.map((item) => (
              <MobileMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Staff & Payroll</h2>
          <div className="space-y-3">
            {staffPayrollItems.map((item) => (
              <MobileMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Financial & Operations</h2>
          <div className="space-y-3">
            {financialOperationsItems.map((item) => (
              <MobileMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Other</h2>
          <div className="space-y-3">
            {otherItems.map((item) => (
              <MobileMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-center md:text-left">Sales & Analytics</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {salesAnalyticsItems.map((item) => (
              <DesktopMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4 mt-8 text-center md:text-left">Customer Management</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {customerManagementItems.map((item) => (
              <DesktopMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4 mt-8 text-center md:text-left">Product & Inventory</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {productInventoryItems.map((item) => (
              <DesktopMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4 mt-8 text-center md:text-left">Staff & Payroll</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {staffPayrollItems.map((item) => (
              <DesktopMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4 mt-8 text-center md:text-left">Financial & Operations</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {financialOperationsItems.map((item) => (
              <DesktopMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4 mt-8 text-center md:text-left">Other</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {otherItems.map((item) => (
              <DesktopMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>
      </div>



      {/* Screen Size Indicator - Only show in development */}
      <ScreenSizeIndicator />
    </div>
  )
} 