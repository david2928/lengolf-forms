'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  FileText,
  Headphones
} from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { useMediaQuery } from '@/hooks/use-media-query'

interface StaffMenuItemProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick: () => void;
}

// Staff Menu Items Configuration
const communicationItems = [
  {
    icon: MessageSquare,
    title: "LINE Chat",
    description: "Manage LINE customer conversations and communication",
    path: "/staff/line-chat"
  },
  {
    icon: FileText,
    title: "Message Templates",
    description: "Manage standard reply templates for customer communication",
    path: "/staff/line-templates"
  }
];

export default function StaffDashboard() {
  const router = useRouter()
  const isMobile = useMediaQuery('(max-width: 768px)')

  const MobileMenuItem = ({ icon: Icon, title, description, onClick }: StaffMenuItemProps) => (
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

  const DesktopMenuItem = ({ icon: Icon, title, onClick }: StaffMenuItemProps) => (
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
        <h1 className="text-2xl font-bold">LENGOLF Staff Panel</h1>
      </div>

      {/* Mobile Layout */}
      <div className="space-y-6 md:hidden">
        <div>
          <h2 className="text-lg font-semibold mb-3">Communication & Messaging</h2>
          <div className="space-y-3">
            {communicationItems.map((item) => (
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
          <h2 className="text-2xl font-semibold mb-4 text-center md:text-left">Communication & Messaging</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 auto-rows-fr">
            {communicationItems.map((item) => (
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
    </div>
  )
}