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
  Loader2,
  MoreVertical,
  Phone,
  Mail
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

  // Mobile Card Component
  const StaffMemberCard = ({ member }: { member: StaffMember }) => (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">
                  {member.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-base">{member.name}</h3>
              <p className="text-sm text-gray-500">ID: {member.id}</p>
              
              <div className="mt-2 flex items-center gap-2">
                {getStatusBadge(member)}
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono">
                  PIN: {member.pin}
                </span>
              </div>
              
              <div className="mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>Last activity: {formatLastActivity(member.last_clock_activity)}</span>
                </div>
                {member.failed_attempts > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{member.failed_attempts} failed attempts</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0 ml-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedStaff(member)
                    setShowEditModal(true)
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
                
                {member.is_locked_out && (
                  <DropdownMenuItem
                    onClick={() => handleConfirmAction('unlock', member)}
                    className="text-green-600"
                  >
                    <Unlock className="mr-2 h-4 w-4" />
                    Unlock Account
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem
                  onClick={() => handleConfirmAction(
                    member.is_active ? 'deactivate' : 'activate', 
                    member
                  )}
                  className={member.is_active ? 'text-red-600' : 'text-green-600'}
                >
                  {member.is_active ? (
                    <>
                      <UserX className="mr-2 h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
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
            
            <CardContent className="p-0">
              {/* Mobile Card View (md and below) */}
              <div className="block md:hidden">
                {filteredStaff.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="h-12 w-12 text-gray-300" />
                      <div>
                        <p className="font-medium text-lg">
                          {searchTerm ? 'No staff found matching your search.' : 'No staff members yet.'}
                        </p>
                        {!searchTerm && (
                          <p className="text-sm text-gray-400 mt-1">Add your first staff member to get started.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {filteredStaff.map((member) => (
                      <StaffMemberCard key={member.id} member={member} />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Desktop Table View (md and above) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-gray-50/50">
                      <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[40%]">Staff Member</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%]">PIN</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%]">Status</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[20%] hidden lg:table-cell">Last Activity</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[30%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 text-gray-300" />
                            <p className="font-medium">
                              {searchTerm ? 'No staff found matching your search.' : 'No staff members yet.'}
                            </p>
                            {!searchTerm && (
                              <p className="text-sm text-gray-400">Add your first staff member to get started.</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStaff.map((member) => (
                        <TableRow key={member.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-sm font-semibold text-blue-700">
                                    {member.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900 text-base">{member.name}</p>
                                <div className="mt-1">
                                  <p className="text-sm text-gray-500">Staff Member ID: {member.id}</p>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            <div className="flex items-center justify-center">
                              <code className="bg-gray-100 px-3 py-2 rounded-md text-sm font-mono text-gray-700 font-semibold">
                                {member.pin}
                              </code>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            <div className="flex items-center">
                              {getStatusBadge(member)}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 hidden lg:table-cell">
                            <div className="text-sm text-gray-600">
                              <div className="font-medium">
                                {formatLastActivity(member.last_clock_activity)}
                              </div>
                              {member.failed_attempts > 0 && (
                                <div className="text-xs text-red-500 mt-1">
                                  {member.failed_attempts} failed attempts
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedStaff(member)
                                  setShowEditModal(true)
                                }}
                                className="h-8 px-3 hover:bg-gray-100 border-gray-200"
                                title="Edit staff member"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              
                              {member.is_locked_out && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleConfirmAction('unlock', member)}
                                  className="h-8 px-3 hover:bg-green-50 text-green-600 border-green-200"
                                  title="Unlock staff member"
                                >
                                  <Unlock className="h-3 w-3 mr-1" />
                                  Unlock
                                </Button>
                              )}
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConfirmAction(
                                  member.is_active ? 'deactivate' : 'activate', 
                                  member
                                )}
                                className={`h-8 px-3 ${
                                  member.is_active 
                                    ? 'hover:bg-red-50 text-red-600 border-red-200' 
                                    : 'hover:bg-green-50 text-green-600 border-green-200'
                                }`}
                                title={member.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {member.is_active ? (
                                  <>
                                    <UserX className="h-3 w-3 mr-1" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Activate
                                  </>
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