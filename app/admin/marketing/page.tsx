'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCustomers, type Customer, type CustomerFilters } from '@/hooks/useCustomerManagement'
import { ActionBar } from '@/components/admin/products/quick-actions'
import { Check, X, CheckCircle } from 'lucide-react'

interface AudienceFilters {
  lastVisitFrom?: string
  lastVisitTo?: string
  hasLine?: boolean
  page?: number
  previewLimit?: number
  notVisitedDays?: number
  hasPackage?: boolean
  sortBy?: CustomerFilters['sortBy']
  sortOrder?: string
}

function formatCurrency(amount?: number) {
  const value = typeof amount === 'number' ? amount : 0
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value)
}

function formatNumber(num: number) {
  return new Intl.NumberFormat('th-TH').format(num)
}

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<'builder' | 'line'>('builder')
  const [audienceFilters, setAudienceFilters] = useState<AudienceFilters>({ page: 1, previewLimit: 10 })
  const [previewRequested, setPreviewRequested] = useState(false)
  const [mounted, setMounted] = useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const buildCustomerFilters = (filters: AudienceFilters, isPreview: boolean = true): CustomerFilters => ({
    lastVisitFrom: filters.lastVisitFrom,
    lastVisitTo: filters.lastVisitTo,
    preferredContactMethod: filters.hasLine ? 'LINE' : 'all',
    notVisitedDays: filters.notVisitedDays,
    hasPackage: filters.hasPackage ? 'yes' : filters.hasPackage === false ? 'no' : undefined,
    page: isPreview ? (filters.page ?? 1) : 1,
    limit: isPreview ? (filters.previewLimit ?? 10) : 9999,
    sortBy: (filters.sortBy as CustomerFilters['sortBy']) ?? 'lastVisit',
    sortOrder: 'desc',
  })

  const previewFilters: CustomerFilters = useMemo(() => 
    buildCustomerFilters(audienceFilters, true), [audienceFilters])

  const baseFilters: CustomerFilters = useMemo(() => ({
    page: 1,
    limit: 10,
  }), [])

  const buildUrlParams = (filters: CustomerFilters): URLSearchParams => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString())
      }
    })
    return params
  }

  const { customers, pagination, loading, error } = useCustomers(previewRequested ? previewFilters : baseFilters, { enabled: previewRequested })

  const audienceSize = previewRequested ? pagination.total : 0

  // Client-side safeguard: when explicit date range is used (and not quick period), exclude null last_visit_date
  const useExplicitDateRange = previewRequested && !audienceFilters.notVisitedDays && (audienceFilters.lastVisitFrom || audienceFilters.lastVisitTo)
  const filteredCustomers = useExplicitDateRange ? customers.filter(c => !!c.last_visit_date) : customers

  const [savedAudiences, setSavedAudiences] = useState<Array<{ 
    id: number;
    name: string; 
    customer_count: number; 
    created_at: string; 
    filters: AudienceFilters;
  }>>([])
  const [selectedAudienceId, setSelectedAudienceId] = useState<number | null>(null)
  const [snapshotName, setSnapshotName] = useState('')
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [loadingAudiences, setLoadingAudiences] = useState(true)

  // Load saved audiences on mount
  useEffect(() => {
    loadSavedAudiences()
  }, [])

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const loadSavedAudiences = async () => {
    try {
      const response = await fetch('/api/marketing/audiences')
      if (response.ok) {
        const data = await response.json()
        setSavedAudiences(data.audiences)
        
        // Load current selected audience
        const selectedResponse = await fetch('/api/marketing/selected-audience')
        if (selectedResponse.ok) {
          const selectedData = await selectedResponse.json()
          setSelectedAudienceId(selectedData.selectedAudienceId)
        }
      }
    } catch (error) {
      console.error('Failed to load audiences:', error)
    } finally {
      setLoadingAudiences(false)
    }
  }

  const handleSelectAudience = async (audienceId: number | null) => {
    try {
      const response = await fetch('/api/marketing/selected-audience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audienceId })
      })

      if (response.ok) {
        setSelectedAudienceId(audienceId)
        showNotification(audienceId ? 'Audience selected for OB Sales' : 'Audience selection cleared')
      }
    } catch (error) {
      console.error('Failed to select audience:', error)
      showNotification('Failed to select audience', 'error')
    }
  }

  const handleEstimate = () => {
    setPreviewRequested(true)
  }

  const handleSaveSnapshot = async () => {
    if (!audienceSize || !snapshotName.trim()) return
    
    setIsSaving(true)
    try {
      const allCustomersFilters = buildCustomerFilters(audienceFilters, false)
      const params = buildUrlParams(allCustomersFilters)

      const customersResponse = await fetch(`/api/customers?${params}`)
      if (!customersResponse.ok) {
        throw new Error('Failed to fetch all customers')
      }
      
      const customersData = await customersResponse.json()
      const allCustomers = customersData.customers

      // Now save the audience with ALL customers
      const response = await fetch('/api/marketing/audiences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: snapshotName.trim(),
          filters: audienceFilters,
          customers: allCustomers // Save ALL customers, not just preview
        })
      })

      if (response.ok) {
        const data = await response.json()
        showNotification(`Audience "${snapshotName}" saved with ${allCustomers.length} customers!`)
        setSnapshotName('')
        loadSavedAudiences() // Refresh the list
      } else {
        const error = await response.json()
        showNotification(`Failed to save audience: ${error.error}`, 'error')
      }
    } catch (error) {
      console.error('Save error:', error)
      showNotification('Failed to save audience. Please try again.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAudience = async (audienceId: number) => {
    try {
      const response = await fetch(`/api/marketing/audiences/${audienceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showNotification('Audience deleted successfully!')
        loadSavedAudiences() // Refresh the list
      } else {
        const error = await response.json()
        showNotification(`Failed to delete audience: ${error.error}`, 'error')
      }
    } catch (error) {
      showNotification('Failed to delete audience. Please try again.', 'error')
    }
  }

  const handleProceed = (destination: 'line') => {
    if (!audienceSize) return
    setActiveTab(destination)
  }

  if (!mounted) {
    return (
      <div className="container mx-auto py-3 sm:py-6 space-y-4 sm:space-y-6 px-3 sm:px-4">
        <ActionBar title="Marketing" subtitle="Build audiences, send LINE messages, and log calls."><div /></ActionBar>
        <Card>
          <CardHeader>
            <CardTitle>Loading…</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-3 sm:py-6 space-y-4 sm:space-y-6 px-3 sm:px-4">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {notification.type === 'success' && <CheckCircle className="h-4 w-4" />}
          {notification.message}
        </div>
      )}
      
      <ActionBar
        title="Marketing"
        subtitle="Build audiences, send LINE messages, and log calls."
      >
        <div />
      </ActionBar>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'builder' | 'line')} className="space-y-6">
        <TabsList>
          <TabsTrigger value="builder">Audience Builder</TabsTrigger>
          <TabsTrigger value="line">LINE Blast</TabsTrigger>
        </TabsList>

        {/* Audience Builder */}
        <TabsContent value="builder" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Filters card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Filters</CardTitle>
                <p className="text-sm text-muted-foreground">Select customers by last booking date within a window. <span className="block text-xs">Note: Customer consent to marketing materials not considered in audience selection</span></p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from">Last booking from</Label>
                    <Input
                      id="from"
                      type="date"
                      value={audienceFilters.lastVisitFrom ?? ''}
                      onChange={(e) => setAudienceFilters((f) => ({ ...f, lastVisitFrom: e.target.value || undefined }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to">Last booking to</Label>
                    <Input
                      id="to"
                      type="date"
                      value={audienceFilters.lastVisitTo ?? ''}
                      onChange={(e) => setAudienceFilters((f) => ({ ...f, lastVisitTo: e.target.value || undefined }))}
                    />
                  </div>
                  <div className="space-y-2 flex items-center gap-3">
                    <Switch
                      id="hasLine"
                      checked={!!audienceFilters.hasLine}
                      onCheckedChange={(val) => setAudienceFilters((f) => ({ ...f, hasLine: !!val }))}
                    />
                    <Label htmlFor="hasLine">Has LINE user ID</Label>
                  </div>
                  {/* Quick Period Filters */}
                  <div className="space-y-2">
                    <Label>Quick period</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Not visited 30d', value: 30 },
                        { label: 'Not visited 90d', value: 90 },
                        { label: 'Not visited 180d', value: 180 },
                      ].map(opt => (
                        <Button
                          key={opt.value}
                          type="button"
                          variant={audienceFilters.notVisitedDays === opt.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setAudienceFilters(f => ({ ...f, notVisitedDays: opt.value, lastVisitFrom: undefined, lastVisitTo: undefined }))}
                        >
                          {opt.label}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant={!audienceFilters.notVisitedDays ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAudienceFilters(f => ({ ...f, notVisitedDays: undefined }))}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  {/* Ranking & Package Filters */}
                  <div className="space-y-2">
                    <Label>Sort by</Label>
                    <Select value={audienceFilters.sortBy ?? 'lastVisit'} onValueChange={(v) => setAudienceFilters(f => ({ ...f, sortBy: v as CustomerFilters['sortBy'] }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lastVisit">Last visit</SelectItem>
                        <SelectItem value="lastContacted">Last contacted</SelectItem>
                        <SelectItem value="lifetimeValue">Lifetime value</SelectItem>
                        <SelectItem value="totalBookings">Total bookings</SelectItem>
                        <SelectItem value="fullName">Name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex items-center gap-3">
                    <Switch
                      id="hasPackage"
                      checked={!!audienceFilters.hasPackage}
                      onCheckedChange={(val) => setAudienceFilters((f) => ({ ...f, hasPackage: val || undefined }))}
                    />
                    <Label htmlFor="hasPackage">Has previous package</Label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button onClick={handleEstimate} className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Estimate Size</Button>
                  <div className="text-sm">
                    <div className="font-medium">Audience size</div>
                    <div className="text-muted-foreground">{formatNumber(audienceSize)} customers match</div>
                    {previewRequested && (
                      <div className="text-xs text-muted-foreground mt-1">Preview shows {audienceFilters.previewLimit} per page • Save will include all {formatNumber(audienceSize)}</div>
                    )}
                  </div>
                </div>

                {/* Preview window */}
                {previewRequested && (
                  <div className="mt-4 rounded-md border">
                    {loading ? (
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : error ? (
                      <div className="p-4 text-sm text-red-600">Failed to load preview</div>
                    ) : customers.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground">No audience loaded yet. Build and materialize an audience first.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b bg-gray-50/50">
                              <TableHead className="font-semibold text-gray-900 px-4 py-4">Rank</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-6 py-4">Name</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-4 py-4">Phone</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-4 py-4">LINE?</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-4 py-4">Lifetime value</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-4 py-4">Has package</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-4 py-4">Total bookings</TableHead>
                              <TableHead className="font-semibold text-gray-900 px-4 py-4">Last booking</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredCustomers.map((c, index) => {
                              const rank = (audienceFilters.page! - 1) * (audienceFilters.previewLimit ?? 10) + index + 1;
                              return (
                                <TableRow key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                  <TableCell className="px-4 py-4 text-sm font-mono text-muted-foreground">#{rank}</TableCell>
                                  <TableCell className="px-6 py-4 font-medium">{c.customer_name}</TableCell>
                                  <TableCell className="px-4 py-4">{c.contact_number || '-'}</TableCell>
                                  <TableCell className="px-4 py-4">
                                    {c.preferred_contact_method === 'LINE' ? (
                                      <span className="inline-flex items-center text-green-600"><Check className="h-4 w-4" /></span>
                                    ) : (
                                      <span className="inline-flex items-center text-gray-400"><X className="h-4 w-4" /></span>
                                    )}
                                  </TableCell>
                                  <TableCell className="px-4 py-4">{formatCurrency((c as any).lifetime_spending)}</TableCell>
                                  <TableCell className="px-4 py-4">{((c as any).active_packages ?? 0) > 0 ? 'Yes' : 'No'}</TableCell>
                                  <TableCell className="px-4 py-4">{formatNumber((c as any).total_bookings ?? 0)}</TableCell>
                                  <TableCell className="px-4 py-4">{c.last_visit_date || '-'}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        
                        {/* Pagination controls for preview */}
                        <div className="flex items-center justify-between p-4 border-t bg-gray-50/25">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div>
                              Page {audienceFilters.page ?? 1} of {Math.max(1, Math.ceil((pagination.total || 0) / (audienceFilters.previewLimit ?? 10)))}
                            </div>
                            <div>
                              Showing {Math.min((audienceFilters.previewLimit ?? 10), filteredCustomers.length)} of {formatNumber(pagination.total || 0)} customers
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span>Show:</span>
                              <Select 
                                value={String(audienceFilters.previewLimit ?? 10)} 
                                onValueChange={(v) => setAudienceFilters((f) => ({ ...f, previewLimit: Number(v), page: 1 }))}
                              >
                                <SelectTrigger className="w-16">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="25">25</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                  <SelectItem value="75">75</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={(audienceFilters.page ?? 1) <= 1}
                                onClick={() => setAudienceFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
                              >
                                Previous
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={(audienceFilters.page ?? 1) >= Math.max(1, Math.ceil((pagination.total || 0) / (audienceFilters.previewLimit ?? 10)))}
                                onClick={() => setAudienceFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Audience */}
            <Card>
              <CardHeader>
                <CardTitle>Save Audience</CardTitle>
                <p className="text-sm text-muted-foreground">Create a snapshot of the current audience filters.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="snapshotName">Name</Label>
                  <Input id="snapshotName" placeholder="Summer Re-Engagement" value={snapshotName} onChange={(e) => setSnapshotName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handleSaveSnapshot} 
                    disabled={!previewRequested || audienceSize === 0 || isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Snapshot'}
                  </Button>
                  <Button variant="secondary" onClick={() => handleProceed('line')} disabled={!previewRequested || audienceSize === 0}>Proceed to LINE</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Saved Audiences */}
          <Card>
            <CardHeader>
              <CardTitle>Saved Audiences</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select an audience for the OB Sales workflow in Lead Feedback.
              </p>
            </CardHeader>
            <CardContent>
              {loadingAudiences ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : savedAudiences.length === 0 ? (
                <div className="text-sm text-muted-foreground">No saved audiences yet. Save your first audience above.</div>
              ) : (
                <div className="space-y-3">
                  {/* Clear selection option */}
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="no-audience"
                        name="selected-audience"
                        checked={selectedAudienceId === null}
                        onChange={() => handleSelectAudience(null)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="no-audience" className="text-sm text-muted-foreground cursor-pointer">
                        No audience selected (clear OB Sales)
                      </label>
                    </div>
                  </div>

                  {savedAudiences.map((a) => (
                    <div key={a.id} className={`border rounded-lg p-3 ${selectedAudienceId === a.id ? 'bg-blue-50 border-blue-200' : ''}`}>
                      <div className="flex items-start gap-3 mb-2">
                        <input
                          type="radio"
                          id={`audience-${a.id}`}
                          name="selected-audience"
                          checked={selectedAudienceId === a.id}
                          onChange={() => handleSelectAudience(a.id)}
                          className="w-4 h-4 mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <label htmlFor={`audience-${a.id}`} className="font-medium cursor-pointer">
                                {a.name}
                              </label>
                              {selectedAudienceId === a.id && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Selected for OB Sales
                                </span>
                              )}
                              <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  // Load the saved audience filters
                                  setAudienceFilters(a.filters);
                                  setPreviewRequested(true);
                                }}
                              >
                                Load
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteAudience(a.id)}>Delete</Button>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground mt-2">
                            {formatNumber(a.customer_count)} customers · 
                            {a.filters.notVisitedDays ? ` Not visited ${a.filters.notVisitedDays}d` : ''}
                            {a.filters.sortBy ? ` · Sorted by ${a.filters.sortBy}` : ''}
                            {a.filters.hasPackage ? ' · Has package' : ''}
                            {a.filters.hasLine ? ' · Has LINE' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LINE Blast (Phase 1 placeholder) */}
        <TabsContent value="line">
          <Card>
            <CardHeader>
              <CardTitle>LINE Blast</CardTitle>
              <p className="text-sm text-muted-foreground">Phase 2 – coming soon. Audience preserved from Audience Builder.</p>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Current audience size: {audienceSize || 0}</div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
