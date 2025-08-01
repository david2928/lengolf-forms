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
  Percent
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

// Admin Menu Items Configuration - Only existing features
const analyticsItems = [
  {
    icon: TrendingUp,
    title: "Sales Dashboard",
    description: "View revenue trends, KPIs, and business analytics",
    path: "/admin/sales-dashboard"
  },
  {
    icon: Receipt,
    title: "Transaction History",
    description: "View and manage POS transactions",
    path: "/admin/transactions"
  },
  {
    icon: Calculator,
    title: "Reconciliation",
    description: "Reconcile transactions and payments",
    path: "/admin/reconciliation"
  },
  {
    icon: Mail,
    title: "Meta Leads",
    description: "Analyze Facebook/Instagram leads and spam detection",
    path: "/admin/meta-leads"
  }
];

const customerItems = [
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
  }
];

const systemItems = [
  {
    icon: Activity,
    title: "Availability Performance",
    description: "Monitor real-time availability system performance",
    path: "/admin/performance"
  }
];

const inventoryItems = [
  {
    icon: Archive,
    title: "Inventory Dashboard",
    description: "Monitor stock levels and manage products",
    path: "/admin/inventory"
  },
  {
    icon: ShoppingCart,
    title: "Product Management",
    description: "Manage product catalog, categories, and pricing for POS system",
    path: "/admin/products"
  },
  {
    icon: Percent,
    title: "Discount Management",
    description: "Create and manage discounts for POS system",
    path: "/admin/discounts"
  },
  {
    icon: FileText,
    title: "Invoice Management",
    description: "Generate and manage supplier invoices",
    path: "/admin/invoices"
  },
  {
    icon: Clock,
    title: "Time Clock",
    description: "Comprehensive time tracking reports and photo administration",
    path: "/admin/time-clock"
  },
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

  const DesktopMenuItem = ({ icon: Icon, title, description, onClick }: AdminMenuItemProps) => (
    <div 
      className="flex flex-col p-6 border rounded-lg transition-colors cursor-pointer h-full hover:bg-accent/50"
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center flex-1">
        <Icon className="h-12 w-12 mb-4 text-primary" />
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-2 flex-grow">{description}</p>}
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
          <h2 className="text-lg font-semibold mb-3">Analytics & Reporting</h2>
          <div className="space-y-3">
            {analyticsItems.map((item) => (
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
            {customerItems.map((item) => (
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
          <h2 className="text-lg font-semibold mb-3">Inventory & Operations</h2>
          <div className="space-y-3">
            {inventoryItems.map((item) => (
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
          <h2 className="text-lg font-semibold mb-3">System Management</h2>
          <div className="space-y-3">
            {systemItems.map((item) => (
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
          <h2 className="text-2xl font-semibold mb-4 text-center md:text-left">Analytics & Reporting</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {analyticsItems.map((item) => (
              <DesktopMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={isMobile ? undefined : item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4 mt-8 text-center md:text-left">Customer Management</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {customerItems.map((item) => (
              <DesktopMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={isMobile ? undefined : item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4 mt-8 text-center md:text-left">Inventory & Operations</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {inventoryItems.map((item) => (
              <DesktopMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={isMobile ? undefined : item.description}
                onClick={() => router.push(item.path)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4 mt-8 text-center md:text-left">System Management</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {systemItems.map((item) => (
              <DesktopMenuItem
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={isMobile ? undefined : item.description}
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