'use client'

import { useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClubUploadForm } from './ClubUploadForm'
import { ClubInventoryBrowser } from './ClubInventoryBrowser'
import type { UsedClub } from '@/hooks/use-used-clubs'

export function StaffUsedClubsContent() {
  const [activeTab, setActiveTab] = useState('browse')
  const [editClub, setEditClub] = useState<UsedClub | null>(null)

  const handleEditFromBrowse = useCallback((club: UsedClub) => {
    setEditClub(club)
    setActiveTab('add')
  }, [])

  const handleFormReset = useCallback(() => {
    setEditClub(null)
  }, [])

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="browse">Browse Inventory</TabsTrigger>
        <TabsTrigger value="add">{editClub ? 'Edit Club' : 'Add Club'}</TabsTrigger>
      </TabsList>
      <TabsContent value="browse" className="mt-4">
        <ClubInventoryBrowser onEdit={handleEditFromBrowse} />
      </TabsContent>
      <TabsContent value="add" className="mt-4" forceMount>
        <ClubUploadForm initialEditClub={editClub} onEditReset={handleFormReset} />
      </TabsContent>
    </Tabs>
  )
}
