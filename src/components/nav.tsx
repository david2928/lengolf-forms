'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { signOut, useSession } from 'next-auth/react'
import { Home, LogOut, Calendar } from 'lucide-react'
import { PackageMonitorNavButton } from './package-monitor/nav-button'

export function Nav() {
  const pathname = usePathname()
  const { status } = useSession()

  if (status !== 'authenticated') return null;

  const DesktopMenu = () => (
    <div className="flex items-center w-full">
      <div className="flex items-center space-x-4">
        <Link href="/">
          <Button variant={pathname === '/' ? 'secondary' : 'ghost'} size="sm" className="gap-2">
            <Home className="h-4 w-4" />
            Home
          </Button>
        </Link>
        <Link href="/create-booking">
          <Button variant={pathname === '/create-booking' ? 'secondary' : 'ghost'} size="sm">
            Create Booking
          </Button>
        </Link>
        <Link href="/bookings-calendar">
          <Button 
            variant={pathname === '/bookings-calendar' ? 'secondary' : 'ghost'} 
            size="sm"
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </Button>
        </Link>
        <Link href="/create-package">
          <Button variant={pathname === '/create-package' ? 'secondary' : 'ghost'} size="sm">
            Create Package
          </Button>
        </Link>
        <Link href="/update-package">
          <Button variant={pathname === '/update-package' ? 'secondary' : 'ghost'} size="sm">
            Update Package
          </Button>
        </Link>
        <Link href="/package-monitor">
          <Button variant={pathname === '/package-monitor' ? 'secondary' : 'ghost'} size="sm">
            Package Monitor
          </Button>
        </Link>
      </div>
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
      <PackageMonitorNavButton />
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