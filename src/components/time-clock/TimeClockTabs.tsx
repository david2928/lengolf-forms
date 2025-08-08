import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTimeClockContext } from './context/TimeClockProvider'
import { TimeEntriesView } from './views/TimeEntriesView'
import { WorkShiftsView } from './views/WorkShiftsView'
import { StaffAnalyticsView } from './views/StaffAnalyticsView'

export const TimeClockTabs: React.FC = () => {
  const { timeEntries, workShifts, staffAnalytics } = useTimeClockContext()

  return (
    <Tabs defaultValue="entries" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="entries">
          <span className="hidden sm:inline">Time Entries ({timeEntries.length})</span>
          <span className="sm:hidden text-xs">Entries ({timeEntries.length})</span>
        </TabsTrigger>
        <TabsTrigger value="shifts">
          <span className="hidden sm:inline">Work Shifts ({workShifts.length})</span>
          <span className="sm:hidden text-xs">Shifts ({workShifts.length})</span>
        </TabsTrigger>
        <TabsTrigger value="analytics">
          <span className="hidden sm:inline">Staff Analytics ({staffAnalytics.length})</span>
          <span className="sm:hidden text-xs">Analytics ({staffAnalytics.length})</span>
        </TabsTrigger>
      </TabsList>


      <TabsContent value="entries" className="space-y-4">
        <TimeEntriesView />
      </TabsContent>

      <TabsContent value="shifts" className="space-y-4">
        <WorkShiftsView />
      </TabsContent>

      <TabsContent value="analytics" className="space-y-4">
        <StaffAnalyticsView />
      </TabsContent>
    </Tabs>
  )
}