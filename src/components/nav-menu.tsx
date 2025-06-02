'use client'

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Package2, Clock, CalendarRange, Diamond, ClipboardList } from "lucide-react"

const components: { title: string; href: string; description: string; icon: React.ReactNode }[] = [
  {
    title: "Create Booking",
    href: "/create-booking",
    description: "Book bays and manage appointments",
    icon: <CalendarRange className="h-6 w-6" />,
  },
  {
    title: "Manage Bookings",
    href: "/manage-bookings",
    description: "View, edit, and cancel existing bookings",
    icon: <ClipboardList className="h-6 w-6" />,
  },
  {
    title: "Create Package",
    href: "/create-package",
    description: "Create new packages for customers",
    icon: <Package2 className="h-6 w-6" />,
  },
  {
    title: "Update Package",
    href: "/update-package",
    description: "Record package usage for customers",
    icon: <Clock className="h-6 w-6" />,
  },
  {
    title: "Package Monitor",
    href: "/package-monitor",
    description: "Monitor Unlimited and expiring packages",
    icon: <Diamond className="h-6 w-6" />,
  },
]

export function NavMenu() {
  const pathname = usePathname()

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Forms</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:grid-cols-1">
              {components.map((component) => (
                <ListItem
                  key={component.title}
                  title={component.title}
                  href={component.href}
                  active={pathname === component.href}
                >
                  <div className="flex items-center gap-2">
                    {component.icon}
                    <span>{component.description}</span>
                  </div>
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { active?: boolean }
>(({ className, title, children, active, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            active && "bg-accent",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"