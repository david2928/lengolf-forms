'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { signOut, useSession } from 'next-auth/react'
import { Home, LogOut, Calendar, ClipboardList, Package, Edit, Settings, PlusCircle, PackageSearch, PackageCheck } from 'lucide-react'
import { PackageMonitorNavButton } from './package-monitor/nav-button'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import React from 'react'

export function Nav() {
  const pathname = usePathname()
  const { status } = useSession()

  if (status !== 'authenticated') return null;

  const DesktopMenu = () => (
    <div className="flex items-center w-full">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <Link href="/" legacyBehavior passHref>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), pathname === '/' ? "bg-accent text-accent-foreground" : "hover:bg-accent/50")}>
                <Home className="h-4 w-4 mr-2" />
                Home
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuTrigger className={cn(pathname.startsWith('/create-booking') || pathname.startsWith('/manage-bookings') ? "bg-accent text-accent-foreground" : "hover:bg-accent/50")}>
              <ClipboardList className="h-4 w-4 mr-2" />
              Bookings
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[200px] gap-3 p-4 md:w-[250px]">
                <ListItem href="/create-booking" title="Create Booking" active={pathname === '/create-booking'}>
                  <PlusCircle className="h-5 w-5" />
                </ListItem>
                <ListItem href="/manage-bookings" title="Manage Bookings" active={pathname === '/manage-bookings'}>
                  <Edit className="h-5 w-5" />
                </ListItem>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <Link href="/bookings-calendar" legacyBehavior passHref>
              <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), pathname === '/bookings-calendar' ? "bg-accent text-accent-foreground" : "hover:bg-accent/50")}>
                <Calendar className="h-4 w-4 mr-2" />
                Calendar
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuTrigger className={cn(pathname.startsWith('/create-package') || pathname.startsWith('/update-package') || pathname.startsWith('/package-monitor') ? "bg-accent text-accent-foreground" : "hover:bg-accent/50")}>
              <Package className="h-4 w-4 mr-2" />
              Packages
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[200px] gap-3 p-4 md:w-[250px]">
                <ListItem href="/create-package" title="Create Package" active={pathname === '/create-package'}>
                  <PlusCircle className="h-5 w-5" />
                </ListItem>
                <ListItem href="/update-package" title="Update Package" active={pathname === '/update-package'}>
                  <PackageCheck className="h-5 w-5" />
                </ListItem>
                <ListItem href="/package-monitor" title="Package Monitor" active={pathname === '/package-monitor'}>
                  <PackageSearch className="h-5 w-5" />
                </ListItem>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
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

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { active?: boolean }
>(({ className, title, children, active, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link href={props.href || "#"} legacyBehavior passHref>
          <a
            ref={ref}
            className={cn(
              "block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              active && "bg-accent text-accent-foreground font-semibold",
              className
            )}
            {...props}
          >
            <div className="flex items-center text-sm font-medium leading-none">
              {children}
              <span className="ml-2">{title}</span>
            </div>
          </a>
        </Link>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"