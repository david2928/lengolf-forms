'use client'

import { User, Users } from 'lucide-react'
import { NavigationTab } from '@/types/staff-schedule'

interface BottomNavigationProps {
  activeTab: NavigationTab
  onTabChange: (tab: NavigationTab) => void
  showPersonalTab?: boolean
  className?: string
}

const navigationItems = [
  {
    id: 'personal' as NavigationTab,
    label: 'Me',
    icon: User,
    description: 'My schedule'
  },
  {
    id: 'all' as NavigationTab,
    label: 'All Staff',
    icon: Users,
    description: 'All staff schedules'
  }
]

export function BottomNavigation({ 
  activeTab, 
  onTabChange,
  showPersonalTab = true,
  className = '' 
}: BottomNavigationProps) {
  
  const availableItems = navigationItems.filter(item => 
    showPersonalTab || item.id !== 'personal'
  )
  return (
    <div className={`bg-white border-t border-slate-200 ${className}`}>
      <div className="flex items-center justify-center px-4 py-3">
        <div className="flex items-center bg-slate-100 rounded-lg p-1">
          {availableItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`
                  flex items-center justify-center px-4 py-2 rounded-md transition-all duration-200 min-w-[100px]
                  ${isActive 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                  }
                `}
                aria-label={item.description}
              >
                <Icon className={`h-4 w-4 mr-2 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-slate-600'}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}