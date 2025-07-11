'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Plus, 
  Edit, 
  UserCheck, 
  UserX, 
  Unlock, 
  Search,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { StaffMember } from '@/types/staff'
import { AddStaffModal } from './add-staff-modal'
import { EditStaffModal } from './edit-staff-modal'
import { ConfirmationModal } from './confirmation-modal'
import { StaffCompensationSettings } from '../payroll/staff-compensation-settings'

export function StaffManagementDashboard() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('staff')
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    action: 'activate' | 'deactivate' | 'unlock'
    staffId: number
    staffName: string
  } | null>(null)

  // Helper functions
  const getConfirmationTitle = (action: string): string => {
    switch (action) {
      case 'activate': return 'Activate Staff Member'
      case 'deactivate': return 'Deactivate Staff Member'
      case 'unlock': return 'Unlock Staff Member'
      default: return 'Confirm Action'
    }
  }

  const getConfirmationDescription = (action: string, staffName: string): string => {
    switch (action) {
      case 'activate':
        return `Are you sure you want to activate ${staffName}? They will be able to use the time clock system.`
      case 'deactivate':
        return `Are you sure you want to deactivate ${staffName}? They will not be able to use the time clock system.`
      case 'unlock':
        return `Are you sure you want to unlock ${staffName}? This will reset their failed attempt counter and allow them to use the time clock system again.`
      default:
        return 'Are you sure you want to perform this action?'
    }
  }

  const getConfirmationText = (action: string): string => {
    switch (action) {
      case 'activate': return 'Activate'
      case 'deactivate': return 'Deactivate'
      case 'unlock': return 'Unlock'
      default: return 'Confirm'
    }
  }

  const fetchStaff = async () => {
    try {
      setLoading(true)
      // Include inactive staff in admin dashboard so they can be managed
      const timestamp = Date.now();
      const url = `/api/staff?includeInactive=true&t=${timestamp}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Request-Source': 'staff-management-dashboard'
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch staff')
      }
      const data = await response.json()
      
      // Map API response to StaffMember interface
      const mappedStaff = (data.data || []).map((member: any) => ({
        id: member.id,
        name: member.staff_name,
        pin: '******', // Hide PIN for security
        is_active: member.is_active,
        failed_attempts: member.failed_attempts,
        is_locked_out: member.is_locked || (member.locked_until ? new Date(member.locked_until) > new Date() : false),
        last_clock_activity: member.last_activity, // Now provided by API
        created_at: member.created_at,
        updated_at: member.updated_at
      }))
      
      setStaff(mappedStaff)
    } catch (err) {
      console.error('Error fetching staff:', err)
      setError('Failed to load staff members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  const filteredStaff = staff.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAction = async (action: string, staffId: number) => {
    try {
      let response
      
      switch (action) {
        case 'activate':
        case 'deactivate':
          const isActive = action === 'activate';
          response = await fetch(`/api/staff/${staffId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: isActive })
          })
          break
        case 'unlock':
          response = await fetch(`/api/staff/unlock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staff_id: staffId })
          })
          break
        default:
          throw new Error('Invalid action')
      }

      if (!response.ok) {
        let errorMessage = `Failed to ${action} staff member`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // Server returned HTML instead of JSON (likely 500 error)
          const textResponse = await response.text()
          console.error(`Server error (${response.status}):`, textResponse.substring(0, 200))
          errorMessage = `Server error (${response.status}). Check console for details.`
        }
        throw new Error(errorMessage)
      }

      await fetchStaff() // Refresh the list
      setConfirmAction(null)
      setShowConfirmModal(false)
    } catch (err) {
      console.error(`Error ${action} staff:`, err)
      setError(err instanceof Error ? err.message : `Failed to ${action} staff member`)
    }
  }

  const handleConfirmAction = (action: 'activate' | 'deactivate' | 'unlock', staff: StaffMember) => {
    setConfirmAction({
      action,
      staffId: staff.id,
      staffName: staff.name
    })
    setShowConfirmModal(true)
  }

  const getStatusBadge = (member: StaffMember) => {
    if (!member.is_active) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    if (member.is_locked_out) {
      return <Badge variant="destructive">Locked Out</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  const formatLastActivity = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading staff members...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="staff">Staff Management</TabsTrigger>
          <TabsTrigger value="compensation">Compensation Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{staff.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {staff.filter(s => s.is_active).length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Locked Out</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {staff.filter(s => s.is_locked_out).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Bar */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Staff Members</CardTitle>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search staff..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-full md:w-64"
                    />
                  </div>
                  <Button onClick={() => setShowAddModal(true)} className="shrink-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Staff
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead className="w-[100px]">PIN</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[150px]">Last Activity</TableHead>
                      <TableHead className="w-[150px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          {searchTerm ? 'No staff found matching your search.' : 'No staff members yet.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStaff.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell className="font-mono">{member.pin}</TableCell>
                          <TableCell>{getStatusBadge(member)}</TableCell>
                          <TableCell className="text-sm">
                            {formatLastActivity(member.last_clock_activity)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedStaff(member)
                                  setShowEditModal(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              {member.is_locked_out && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleConfirmAction('unlock', member)}
                                  title="Unlock staff member"
                                >
                                  <Unlock className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleConfirmAction(
                                  member.is_active ? 'deactivate' : 'activate', 
                                  member
                                )}
                                title={member.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {member.is_active ? (
                                  <UserX className="h-4 w-4" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compensation" className="space-y-6">
          <StaffCompensationSettings />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddStaffModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => {
          fetchStaff()
        }}
      />
      
      <EditStaffModal
        staff={selectedStaff}
        open={showEditModal}
        onOpenChange={(open: boolean) => {
          setShowEditModal(open)
          if (!open) setSelectedStaff(null)
        }}
        onSuccess={() => {
          setSelectedStaff(null)
          fetchStaff()
        }}
      />
      
      {confirmAction && (
        <ConfirmationModal
          open={showConfirmModal}
          onOpenChange={(open: boolean) => {
            setShowConfirmModal(open)
            if (!open) setConfirmAction(null)
          }}
          title={getConfirmationTitle(confirmAction.action)}
          description={getConfirmationDescription(confirmAction.action, confirmAction.staffName)}
          confirmText={getConfirmationText(confirmAction.action)}
          variant={confirmAction.action === 'deactivate' ? 'destructive' : 'default'}
          onConfirm={() => handleAction(confirmAction.action, confirmAction.staffId)}
        />
      )}
    </div>
  )
} 