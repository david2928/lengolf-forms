import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Camera, Eye, Plus, Edit, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { useTimeClockContext, TimeEntry } from '../context/TimeClockProvider'
import { BaseStaffCard } from '../shared/BaseStaffCard'
import { PhotoDialog } from '../shared/PhotoDialog'
import { ResponsiveDataView } from '../shared/ResponsiveDataView'
import { ManualEntryModal } from './modals/ManualEntryModal'
import { EditEntryModal } from './modals/EditEntryModal'
import { DeleteEntryModal } from './modals/DeleteEntryModal'

// Mobile card component for time entries
const TimeEntryCard: React.FC<{ 
  entry: TimeEntry
  onEdit: (entry: TimeEntry) => void
  onDelete: (entry: TimeEntry) => void
}> = ({ entry, onEdit, onDelete }) => {
  return (
    <BaseStaffCard staffName={entry.staff_name} borderColor="blue">
      <div className="space-y-3">
        {/* Date and Photo Action Row */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {format(new Date(entry.date_only + 'T00:00:00+07:00'), 'MMM dd, yyyy')}
          </p>
          <div className="flex-shrink-0">
            {entry.photo_captured && entry.photo_url ? (
              <PhotoDialog entry={entry} />
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                disabled
                className="text-gray-400"
                title="No photo available"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Action and Time Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge 
              variant={entry.action === 'clock_in' ? 'default' : 'secondary'}
              className="text-sm py-1 px-3"
            >
              {entry.action === 'clock_in' ? 'Clock In' : 'Clock Out'}
            </Badge>
            <span className="text-lg font-mono font-semibold text-gray-900">
              {entry.time_only}
            </span>
          </div>
          
          {entry.photo_captured ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <Camera className="h-3 w-3 mr-1" />
              Photo
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">No Photo</Badge>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(entry)}
            className="flex items-center gap-1"
          >
            <Edit className="h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(entry)}
            className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        </div>
      </div>
    </BaseStaffCard>
  )
}

// Desktop table component for time entries
const TimeEntriesTable: React.FC<{ 
  entries: TimeEntry[]
  onEdit: (entry: TimeEntry) => void
  onDelete: (entry: TimeEntry) => void
}> = ({ entries, onEdit, onDelete }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b bg-gray-50/50">
          <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[30%]">
            Staff & Date
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center">
            Time
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center">
            Action
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center hidden lg:table-cell">
            Photo Status
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[25%] text-center">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.entry_id} className="hover:bg-gray-50/50 transition-colors">
            <TableCell className="px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-700">
                      {entry.staff_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-base">{entry.staff_name}</p>
                  <div className="mt-1">
                    <p className="text-sm text-gray-500">
                      {format(new Date(entry.date_only + 'T00:00:00+07:00'), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell className="px-4 py-4 text-center">
              <div className="font-mono font-semibold text-gray-900 text-base">
                {entry.time_only}
              </div>
            </TableCell>
            <TableCell className="px-4 py-4 text-center">
              <Badge variant={entry.action === 'clock_in' ? 'default' : 'secondary'}>
                {entry.action === 'clock_in' ? 'Clock In' : 'Clock Out'}
              </Badge>
            </TableCell>
            <TableCell className="px-4 py-4 text-center hidden lg:table-cell">
              {entry.photo_captured ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <Camera className="h-3 w-3 mr-1" />
                  Captured
                </Badge>
              ) : (
                <Badge variant="outline">No Photo</Badge>
              )}
            </TableCell>
            <TableCell className="px-4 py-4 text-center">
              <div className="flex items-center justify-center gap-2">
                {entry.photo_captured && entry.photo_url ? (
                  <PhotoDialog entry={entry} />
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled
                    className="h-8 px-3 text-gray-400 border-gray-200"
                    title="No photo available"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    No Photo
                  </Button>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(entry)}
                    className="h-8 px-2"
                    title="Edit entry"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(entry)}
                    className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete entry"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export const TimeEntriesView: React.FC = () => {
  const { timeEntries, refreshData } = useTimeClockContext()
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null)

  // Modal handlers
  const handleEdit = (entry: TimeEntry) => {
    setSelectedEntry(entry)
    setIsEditModalOpen(true)
  }

  const handleDelete = (entry: TimeEntry) => {
    setSelectedEntry(entry)
    setIsDeleteModalOpen(true)
  }

  const handleModalSuccess = () => {
    refreshData() // Refresh the data after any CRUD operation
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Time Entries ({timeEntries.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Individual clock-in and clock-out entries with photo verification
              </p>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Manual Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ResponsiveDataView
            data={timeEntries}
            emptyStateMessage="No time entries found"
            emptyStateIcon={<FileText className="h-12 w-12 text-gray-300" />}
            renderMobileCard={(entry) => (
              <TimeEntryCard
                key={entry.entry_id}
                entry={entry}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
            renderDesktopTable={(entries) => (
              <TimeEntriesTable
                entries={entries}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <ManualEntryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <EditEntryModal
        entry={selectedEntry}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedEntry(null)
        }}
        onSuccess={handleModalSuccess}
      />

      <DeleteEntryModal
        entry={selectedEntry}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedEntry(null)
        }}
        onSuccess={handleModalSuccess}
      />
    </>
  )
}