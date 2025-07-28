'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, Clock, AlertTriangle } from 'lucide-react'

interface DashboardStats {
  totalSchedules: number
  activeStaff: number
  upcomingShifts: number
  conflicts: number
}

interface UpcomingShift {
  id: string
  staffName: string
  date: string
  startTime: string
  endTime: string
  position: string
}

export function ScheduleDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSchedules: 0,
    activeStaff: 0,
    upcomingShifts: 0,
    conflicts: 0
  })
  const [upcomingShifts, setUpcomingShifts] = useState<UpcomingShift[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, shiftsResponse] = await Promise.all([
        fetch('/api/admin/staff-scheduling/overview'),
        fetch('/api/staff-schedule/schedules?limit=5')
      ])

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json()
        setUpcomingShifts(shiftsData.schedules || [])
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Schedules</p>
                <p className="text-2xl font-bold">{stats.totalSchedules}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Staff</p>
                <p className="text-2xl font-bold">{stats.activeStaff}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming Shifts</p>
                <p className="text-2xl font-bold">{stats.upcomingShifts}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conflicts</p>
                <p className="text-2xl font-bold">{stats.conflicts}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${stats.conflicts > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Shifts */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingShifts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upcoming shifts scheduled</p>
          ) : (
            <div className="space-y-4">
              {upcomingShifts.map((shift) => (
                <div key={shift.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium">{shift.staffName}</p>
                      <p className="text-sm text-gray-600">{shift.position}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{shift.date}</p>
                    <p className="text-sm text-gray-600">
                      {shift.startTime} - {shift.endTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-auto p-4 flex flex-col items-center space-y-2">
              <Calendar className="h-6 w-6" />
              <span>Create Schedule</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Users className="h-6 w-6" />
              <span>Manage Staff</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Clock className="h-6 w-6" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}