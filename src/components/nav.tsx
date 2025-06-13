'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { signOut, useSession } from 'next-auth/react'
import { Home, LogOut, Calendar, ClipboardList, Package, Edit, Settings, PlusCircle, PackageSearch, PackageCheck, Archive, ChevronDown, TrendingUp, Calculator, FileText } from 'lucide-react'
import { PackageMonitorNavButton } from './package-monitor/nav-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import React from 'react'

export function Nav() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.isAdmin || false;

  if (status !== 'authenticated') return null;

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
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/admin" className="flex items-center gap-2 w-full">
                  <Settings className="h-4 w-4" />
                  Admin Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/sales-dashboard" className="flex items-center gap-2 w-full">
                  <TrendingUp className="h-4 w-4" />
                  Sales Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/reconciliation" className="flex items-center gap-2 w-full">
                  <Calculator className="h-4 w-4" />
                  Reconciliation
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/inventory" className="flex items-center gap-2 w-full">
                  <Archive className="h-4 w-4" />
                  Inventory
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/invoices" className="flex items-center gap-2 w-full">
                  <FileText className="h-4 w-4" />
                  Invoice Management
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
        <Link href="/admin" className="flex-1">
          <Button 
            variant={pathname.startsWith('/admin') ? 'secondary' : 'ghost'} 
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

