'use client'

import { User, Users, Clock, RefreshCw } from 'lucide-react'
import { NavigationTab } from '@/types/staff-schedule'

interface BottomNavigationProps {
  activeTab: NavigationTab
  onTabChange: (tab: NavigationTab) => void
  className?: string
}

const navigationItems = [
  {
    id: 'personal' as NavigationTab,
    label: 'Only me',
    icon: User,
    description: 'Personal schedule'
  },
  {
    id: 'team' as NavigationTab,
    label: 'Everyone',
    icon: Users,
    description: 'Team schedule'
  },
  {
    id: 'availability' as NavigationTab,
    label: 'Availability',
    icon: Clock,
    description: 'Manage availability'
  },
  {
    id: 'replacements' as NavigationTab,
    label: 'Replacements',
    icon: RefreshCw,
    description: 'Shift coverage'
  }
]

export function BottomNavigation({ 
  activeTab, 
  onTabChange,
  className = '' 
}: BottomNavigationProps) {
  return (
    <div className={`bg-white border-t border-slate-200 ${className}`}>
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }
              `}
              aria-label={item.description}
            >
              <Icon className={`
                h-5 w-5 mb-1
                ${isActive ? 'text-blue-600' : 'text-slate-400'}
              `} />
              <span className={`
                text-xs font-medium
                ${isActive ? 'text-blue-600' : 'text-slate-500'}
              `}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}