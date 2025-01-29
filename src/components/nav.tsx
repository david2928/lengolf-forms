'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { signOut, useSession } from 'next-auth/react'
import { Home, LogOut } from 'lucide-react'
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
        <Link href="/create-booking">
          <Button variant={pathname === '/create-booking' ? 'secondary' : 'ghost'} size="sm">
            Create Booking
          </Button>
        </Link>
        <PackageMonitorNavButton />
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
        <Button variant={pathname === '/' ? 'secondary' : 'ghost'} size="sm" className="w-full gap-2">
          <Home className="h-4 w-4" />
          Home
        </Button>
      </Link>
      <PackageMonitorNavButton />
      <Button variant="outline" size="sm" onClick={() => signOut()} className="flex-1 border border-gray-200">
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
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