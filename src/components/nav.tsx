'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { signOut, useSession } from 'next-auth/react'
import { Home, LogOut, Calendar, ClipboardList, Package, Edit, Settings, PlusCircle, PackageSearch, PackageCheck, Archive, ChevronDown, TrendingUp, Calculator, FileText, Activity, Mail, Receipt, Users, UserCheck, Link2, BarChart3, Cog, Timer, Clock, ShoppingCart } from 'lucide-react'
import { PackageMonitorNavButton } from './package-monitor/nav-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import React from 'react'

export function Nav() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [isClient, setIsClient] = React.useState(false)
  
  React.useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Development bypass - show nav even without authentication
  const shouldBypass = (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
  );
  
  // In development bypass mode, grant admin access by default
  // Only apply role-based rendering after client hydration to avoid hydration mismatch
  const isAdmin = isClient && (shouldBypass ? true : (session?.user?.isAdmin || false));
  const isCoach = isClient && (shouldBypass ? false : (session?.user?.isCoach || false));
  
  // Only apply authentication check after client hydration
  if (isClient && !shouldBypass && status !== 'authenticated') return null;

  const DesktopMenu = () => (
    <div className="flex items-center w-full">
      <nav className="flex items-center space-x-1">
        {/* Home */}
        <Link href="/">
          <Button
            variant={pathname === '/' ? 'secondary' : 'ghost'}
            size="sm"
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Home
          </Button>
        </Link>

        {/* Bookings Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={pathname.startsWith('/create-booking') || pathname.startsWith('/manage-bookings') || pathname === '/bookings-calendar' ? 'secondary' : 'ghost'}
              size="sm"
              className="flex items-center gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              Bookings
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/create-booking" className="flex items-center gap-2 w-full">
                <PlusCircle className="h-4 w-4" />
                Create Booking
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/manage-bookings" className="flex items-center gap-2 w-full">
                <Edit className="h-4 w-4" />
                Manage Bookings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/bookings-calendar" className="flex items-center gap-2 w-full">
                <Calendar className="h-4 w-4" />
                Bookings Calendar
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Packages Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={pathname.startsWith('/create-package') || pathname.startsWith('/update-package') || pathname.startsWith('/package-monitor') ? 'secondary' : 'ghost'}
              size="sm"
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Packages
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/create-package" className="flex items-center gap-2 w-full">
                <PlusCircle className="h-4 w-4" />
                Create Package
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/update-package" className="flex items-center gap-2 w-full">
                <PackageCheck className="h-4 w-4" />
                Update Package
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/package-monitor" className="flex items-center gap-2 w-full">
                <PackageSearch className="h-4 w-4" />
                Package Monitor
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Customers Dropdown - Only for Admin Users */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={pathname.startsWith('/admin/customers') ? 'secondary' : 'ghost'}
                size="sm"
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Customers
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/admin/customers" className="flex items-center gap-2 w-full">
                  <UserCheck className="h-4 w-4" />
                  Customer Management
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/customers/mapping" className="flex items-center gap-2 w-full">
                  <Link2 className="h-4 w-4" />
                  Customer Mapping
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Coaching Portal - Only for Coaches */}
        {isCoach && (
          <Link href="/coaching">
            <Button
              variant={pathname.startsWith('/coaching') ? 'secondary' : 'ghost'}
              size="sm"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Coaching Portal
            </Button>
          </Link>
        )}

        {/* Staff Time Clock - Available to All Users */}
        <Link href="/time-clock">
          <Button
            variant={pathname === '/time-clock' ? 'secondary' : 'ghost'}
            size="sm"
            className="flex items-center gap-2"
          >
            <Timer className="h-4 w-4" />
            Time Clock
          </Button>
        </Link>

        {/* Admin Dropdown - Only for Admin Users */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={pathname.startsWith('/admin') ? 'secondary' : 'ghost'}
                size="sm"
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Admin
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {/* System & Dashboard */}
              <DropdownMenuItem asChild>
                <Link href="/admin" className="flex items-center gap-2 w-full">
                  <Cog className="h-4 w-4" />
                  Admin Portal
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Analytics & Reports */}
              <DropdownMenuItem asChild>
                <Link href="/admin/sales-dashboard" className="flex items-center gap-2 w-full">
                  <TrendingUp className="h-4 w-4" />
                  Sales Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/transactions" className="flex items-center gap-2 w-full">
                  <Receipt className="h-4 w-4" />
                  Transaction History
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/performance" className="flex items-center gap-2 w-full">
                  <Activity className="h-4 w-4" />
                  Performance Analytics
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Operations */}
              <DropdownMenuItem asChild>
                <Link href="/admin/reconciliation" className="flex items-center gap-2 w-full">
                  <Calculator className="h-4 w-4" />
                  Reconciliation
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/inventory" className="flex items-center gap-2 w-full">
                  <Archive className="h-4 w-4" />
                  Inventory Management
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/products" className="flex items-center gap-2 w-full">
                  <ShoppingCart className="h-4 w-4" />
                  Product Management
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/staff-management" className="flex items-center gap-2 w-full">
                  <Users className="h-4 w-4" />
                  Staff Management
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/invoices" className="flex items-center gap-2 w-full">
                  <FileText className="h-4 w-4" />
                  Invoice Management
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* External & Other */}
              <DropdownMenuItem asChild>
                <Link href="/admin/meta-leads" className="flex items-center gap-2 w-full">
                  <Mail className="h-4 w-4" />
                  Meta Leads
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/coaching" className="flex items-center gap-2 w-full">
                  <Settings className="h-4 w-4" />
                  Coaching Management
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>

      <div className="ml-auto">
        <Button variant="outline" size="sm" onClick={() => signOut()} className="border border-gray-200">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )

  const MobileMenu = () => (
    <>
      <Link href="/" className="flex-1">
        <Button variant={pathname === '/' ? 'secondary' : 'ghost'} size="sm" className="w-full">
          <Home className="h-3.5 w-3.5" />
        </Button>
      </Link>
      <Link href="/bookings-calendar" className="flex-1">
        <Button 
          variant={pathname === '/bookings-calendar' ? 'secondary' : 'ghost'} 
          size="sm" 
          className="w-full flex justify-center"
        >
          <Calendar className="h-3.5 w-3.5" />
        </Button>
      </Link>
      <Link href="/manage-bookings" className="flex-1">
        <Button 
          variant={pathname === '/manage-bookings' ? 'secondary' : 'ghost'} 
          size="sm" 
          className="w-full flex justify-center"
        >
          <ClipboardList className="h-3.5 w-3.5" />
        </Button>
      </Link>
      <PackageMonitorNavButton />
      {isAdmin && (
        <Link href="/admin/customers" className="flex-1">
          <Button 
            variant={pathname.startsWith('/admin/customers') ? 'secondary' : 'ghost'} 
            size="sm" 
            className="w-full flex justify-center"
          >
            <Users className="h-3.5 w-3.5" />
          </Button>
        </Link>
      )}
      {!isAdmin && (
        <Link href="/time-clock" className="flex-1">
          <Button 
            variant={pathname === '/time-clock' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="w-full flex justify-center"
          >
            <Timer className="h-3.5 w-3.5" />
          </Button>
        </Link>
      )}
      {isAdmin && (
        <Link href="/admin" className="flex-1">
          <Button 
            variant={pathname.startsWith('/admin') && !pathname.startsWith('/admin/customers') ? 'secondary' : 'ghost'} 
            size="sm" 
            className="w-full flex justify-center"
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </Link>
      )}
      <Button variant="outline" size="sm" onClick={() => signOut()} className="flex-1 border border-gray-200">
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </>
  )

  return (
    <div className="border-b">
      <div className="container h-14 flex items-center">
        <div className="hidden md:flex items-center w-full">
          <DesktopMenu />
        </div>
        <div className="flex md:hidden items-center space-x-2 w-full">
          <MobileMenu />
        </div>
      </div>
    </div>
  )
}

