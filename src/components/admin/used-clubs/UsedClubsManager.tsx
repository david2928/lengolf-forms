'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, ImageIcon, AlertCircle, Tag, Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useAllClubs,
  useAdminClubSets,
  updateClub,
  deleteClub,
  deleteSet,
  type UsedClub,
  type ClubSet,
} from '@/hooks/use-used-clubs'
import { ClubEditDialog } from './ClubEditDialog'
import { SetFormDialog } from './SetFormDialog'

const CONDITION_BADGE: Record<string, string> = {
  Excellent: 'bg-green-100 text-green-700 border-green-200',
  Good: 'bg-amber-100 text-amber-700 border-amber-200',
  Fair: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function UsedClubsManager() {
  const { clubs, isLoading: clubsLoading, mutate: refreshClubs } = useAllClubs()
  const { sets, isLoading: setsLoading, mutate: refreshSets } = useAdminClubSets()

  const [clubDialog, setClubDialog] = useState<{ open: boolean; club: UsedClub | null }>({ open: false, club: null })
  const [setDialog, setSetDialog] = useState<{ open: boolean; set: ClubSet | null }>({ open: false, set: null })
  const [deleteClubId, setDeleteClubId] = useState<string | null>(null)
  const [deleteSetId, setDeleteSetId] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalClubs = clubs.length
  const forSale = clubs.filter(c => c.available_for_sale).length
  const forRental = clubs.filter(c => c.available_for_rental).length
  const totalCost = clubs.reduce((s, c) => s + (c.cost ?? 0), 0)
  const totalAsking = clubs.reduce((s, c) => s + c.price, 0)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggle = async (club: UsedClub, field: 'available_for_sale' | 'available_for_rental') => {
    setToggling(`${club.id}-${field}`)
    try {
      await updateClub(club.id, { [field]: !club[field] })
      refreshClubs()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setToggling(null)
    }
  }

  const handleDeleteClub = async () => {
    if (!deleteClubId) return
    try {
      await deleteClub(deleteClubId)
      toast.success('Club deleted')
      refreshClubs()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleteClubId(null)
    }
  }

  const handleDeleteSet = async () => {
    if (!deleteSetId) return
    try {
      await deleteSet(deleteSetId)
      toast.success('Set deleted')
      refreshSets()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleteSetId(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Total Clubs', value: totalClubs },
          { label: 'For Sale', value: forSale },
          { label: 'For Rental', value: forRental },
          { label: 'Inventory Cost', value: `฿${totalCost.toLocaleString()}` },
          { label: 'Total Asking', value: `฿${totalAsking.toLocaleString()}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border/60 bg-white p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="clubs">
        <TabsList>
          <TabsTrigger value="clubs" className="flex items-center gap-1.5">
            <Tag size={14} /> Clubs ({totalClubs})
          </TabsTrigger>
          <TabsTrigger value="sets" className="flex items-center gap-1.5">
            <Layers size={14} /> Sets ({sets.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Clubs Tab ── */}
        <TabsContent value="clubs" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setClubDialog({ open: true, club: null })}>
              <Plus size={14} className="mr-1.5" /> Add Club
            </Button>
          </div>

          {clubsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading…</div>
          ) : clubs.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-border">
              <Tag size={32} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">No clubs yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Staff can add clubs via the Staff → Add Used Club page</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Set</TableHead>
                    <TableHead className="text-center">For Sale</TableHead>
                    <TableHead className="text-center">For Rental</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clubs.map(club => (
                    <TableRow key={club.id}>
                      <TableCell>
                        {club.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={club.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <ImageIcon size={14} className="text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">
                          {club.brand}{club.model ? ` ${club.model}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">{club.gender}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{club.club_type}{club.specification ? ` (${club.specification})` : ''}</p>
                        {club.shaft && <p className="text-xs text-muted-foreground">{club.shaft}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${CONDITION_BADGE[club.condition] || ''}`}>
                          {club.condition}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ฿{club.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {club.cost != null ? `฿${club.cost.toLocaleString()}` : <span className="italic opacity-40">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {club.club_sets?.name ?? <span className="italic opacity-40">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={club.available_for_sale}
                          onCheckedChange={() => handleToggle(club, 'available_for_sale')}
                          disabled={toggling === `${club.id}-available_for_sale`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={club.available_for_rental}
                          onCheckedChange={() => handleToggle(club, 'available_for_rental')}
                          disabled={toggling === `${club.id}-available_for_rental`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setClubDialog({ open: true, club })}
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteClubId(club.id)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Sets Tab ── */}
        <TabsContent value="sets" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setSetDialog({ open: true, set: null })}>
              <Plus size={14} className="mr-1.5" /> Add Set
            </Button>
          </div>

          {setsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading…</div>
          ) : sets.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-border">
              <Layers size={32} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">No sets yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Create a set to group related clubs together</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Clubs</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sets.map(set => {
                    const clubCount = set.used_clubs_inventory?.[0]?.count ?? 0
                    return (
                      <TableRow key={set.id}>
                        <TableCell className="font-medium text-sm">{set.name}</TableCell>
                        <TableCell className="text-sm">{set.brand}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {set.description || <span className="italic opacity-40">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{clubCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setSetDialog({ open: true, set })}
                            >
                              <Pencil size={13} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteSetId(set.id)}
                              disabled={clubCount > 0}
                              title={clubCount > 0 ? 'Reassign clubs before deleting this set' : 'Delete set'}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <ClubEditDialog
        open={clubDialog.open}
        onOpenChange={open => setClubDialog(d => ({ ...d, open }))}
        onSuccess={() => { refreshClubs(); setClubDialog({ open: false, club: null }) }}
        club={clubDialog.club}
        sets={sets}
      />

      <SetFormDialog
        open={setDialog.open}
        onOpenChange={open => setSetDialog(d => ({ ...d, open }))}
        onSuccess={() => { refreshSets(); setSetDialog({ open: false, set: null }) }}
        editSet={setDialog.set}
      />

      {/* ── Delete Club confirm ── */}
      <AlertDialog open={!!deleteClubId} onOpenChange={open => !open && setDeleteClubId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle size={18} className="text-destructive" /> Delete Club
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the club from inventory and delete its photo. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClub} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Set confirm ── */}
      <AlertDialog open={!!deleteSetId} onOpenChange={open => !open && setDeleteSetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle size={18} className="text-destructive" /> Delete Set
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the set. All clubs in this set will become standalone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSet} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
