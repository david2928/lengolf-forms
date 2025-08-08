import React from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface BaseStaffCardProps {
  staffName: string
  borderColor?: 'blue' | 'orange' | 'purple'
  children: React.ReactNode
}

export const BaseStaffCard: React.FC<BaseStaffCardProps> = ({ 
  staffName, 
  borderColor = 'blue', 
  children 
}) => {
  const borderColorClass = `border-l-${borderColor}-500`
  const avatarColorClass = `bg-${borderColor}-100 text-${borderColor}-700`

  return (
    <Card className={`hover:shadow-md transition-shadow duration-200 border-l-4 ${borderColorClass}`}>
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Header with Avatar */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${avatarColorClass}`}>
                <span className="text-sm font-semibold">
                  {staffName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-lg truncate">{staffName}</h3>
            </div>
          </div>
          
          {/* Dynamic Content */}
          {children}
        </div>
      </CardContent>
    </Card>
  )
}