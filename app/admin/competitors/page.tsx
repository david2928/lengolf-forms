'use client';

import { useState } from 'react';
import { Plus, Eye, Edit, Trash2, RotateCcw, AlertCircle, PencilLine, ExternalLink, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useCompetitors, triggerManualSync, deleteCompetitor } from '@/hooks/use-competitors';
import Link from 'next/link';
import { CreateCompetitorModal } from '@/components/admin/competitors/create-competitor-modal';
import { EditCompetitorModal } from '@/components/admin/competitors/edit-competitor-modal';
import { CompetitorMetricsModal } from '@/components/admin/competitors/competitor-metrics-modal';
import { ManualMetricsModal } from '@/components/admin/competitors/manual-metrics-modal';
import { TrendAnalysis } from '@/components/admin/competitors/trend-analysis';
import { Platform, CompetitorWithAccounts } from '@/types/competitor-tracking';

export default function CompetitorsPage() {
  const { competitors, isLoading, mutate } = useCompetitors();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<number | null>(null);
  const [editingCompetitorId, setEditingCompetitorId] = useState<number | null>(null);
  const [manualMetricsCompetitor, setManualMetricsCompetitor] = useState<CompetitorWithAccounts | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await triggerManualSync();
      toast.success(`Sync completed: ${result.results?.success || 0} successful, ${result.results?.failed || 0} failed`);
      mutate(); // Refresh data
    } catch (error: any) {
      toast.error(error.message || 'Failed to trigger sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteCompetitor = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteCompetitor(id);
      toast.success(`${name} deleted successfully`);
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete competitor');
    }
  };

  const getPlatformBadgeColor = (platform: Platform) => {
    switch (platform) {
      case 'instagram': return 'bg-pink-100 text-pink-800';
      case 'facebook': return 'bg-blue-100 text-blue-800';
      case 'line': return 'bg-green-100 text-green-800';
      case 'google_reviews': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNumber = (num: number | null | undefined) => {
    if (!num) return 'N/A';
    return num.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading competitors...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Competitor Tracking</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitor competitor social media metrics and growth trends
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={handleManualSync}
            disabled={isSyncing}
            variant="outline"
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <RotateCcw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Manual Sync'}
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add Competitor
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Competitors</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{competitors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Platforms Tracked</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">
                  {new Set(competitors.flatMap(c => c.social_accounts?.map(a => a.platform) || [])).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Followers</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">
                  {formatNumber(
                    competitors.reduce((sum, c) =>
                      sum + (c.latest_metrics?.reduce((metricSum, m) =>
                        metricSum + (m.followers_count || 0), 0) || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Sync</p>
                <p className="text-sm text-gray-900">
                  {competitors.some(c => c.social_accounts?.some(a => a.last_scraped_at))
                    ? 'Recently updated'
                    : 'Never synced'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Analysis */}
      <TrendAnalysis competitors={competitors} />

      {/* Competitors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Competitors</CardTitle>
        </CardHeader>
        {competitors.length === 0 ? (
          <CardContent>
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No competitors found</h3>
              <p className="text-gray-600 mb-4">Get started by adding your first competitor</p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Competitor
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-gray-50/50">
                    <TableHead className="font-semibold text-gray-900 px-3 py-3 text-xs md:text-sm md:px-6 md:py-4 w-[50%] md:w-[35%]">Competitor</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[20%] hidden md:table-cell">Location</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-2 py-3 text-xs md:text-sm md:px-4 md:py-4 w-[35%] md:w-[25%] hidden sm:table-cell">Platforms</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] hidden lg:table-cell">Activity</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-2 py-3 text-xs md:text-sm md:px-4 md:py-4 w-[15%] md:w-[20%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitors.map((competitor) => (
                    <TableRow key={competitor.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="px-3 py-3 md:px-6 md:py-4">
                        <div className="flex items-center gap-2 md:gap-4">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-xs md:text-sm font-semibold text-blue-700">
                                {competitor.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-sm md:text-base leading-tight">{competitor.name}</p>
                            <div className="mt-1">
                              <p className="text-xs md:text-sm text-gray-500">{competitor.business_type}</p>
                            </div>
                            <div className="sm:hidden mt-2">
                              <div className="flex flex-wrap gap-1">
                                {competitor.social_accounts?.slice(0, 2).map((account) => (
                                  <Badge
                                    key={account.id}
                                    variant="secondary"
                                    className={`${getPlatformBadgeColor(account.platform as Platform)} text-xs px-1.5 py-0.5`}
                                  >
                                    {account.platform}
                                  </Badge>
                                ))}
                                {(competitor.social_accounts?.length || 0) > 2 && (
                                  <span className="text-xs text-gray-500">+{(competitor.social_accounts?.length || 0) - 2}</span>
                                )}
                              </div>
                            </div>
                            <div className="md:hidden mt-1">
                              <div className="flex items-center gap-2">
                                {competitor.location && (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {competitor.location}
                                  </span>
                                )}
                                <span className="text-xs font-medium text-green-600">
                                  {formatNumber(
                                    competitor.latest_metrics?.reduce((sum, m) => sum + (m.followers_count || 0), 0) || 0
                                  )} followers
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4 hidden md:table-cell">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600">{competitor.location || 'Not specified'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-3 md:px-4 md:py-4 hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {competitor.social_accounts?.map((account) => (
                            <Badge
                              key={account.id}
                              variant="secondary"
                              className={`${getPlatformBadgeColor(account.platform as Platform)} text-xs md:text-sm px-1.5 md:px-2 py-0.5`}
                            >
                              {account.platform}
                            </Badge>
                          )) || <span className="text-gray-400 text-xs md:text-sm">No platforms</span>}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4 hidden lg:table-cell">
                        <div className="text-sm text-gray-600">
                          <div className="font-medium">
                            {formatNumber(
                              competitor.latest_metrics?.reduce((sum, m) => sum + (m.followers_count || 0), 0) || 0
                            )} followers
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Last sync: {competitor.social_accounts?.some(a => a.last_scraped_at)
                              ? new Date(
                                  Math.max(
                                    ...competitor.social_accounts
                                      .filter(a => a.last_scraped_at)
                                      .map(a => new Date(a.last_scraped_at!).getTime())
                                  )
                                ).toLocaleDateString()
                              : 'Never'
                            }
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-3 md:px-4 md:py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Mobile: Dropdown Menu */}
                          <div className="md:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedCompetitorId(competitor.id)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Metrics
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setManualMetricsCompetitor(competitor)}>
                                  <PencilLine className="mr-2 h-4 w-4" />
                                  Manual Entry
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEditingCompetitorId(competitor.id)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Desktop: Full Buttons */}
                          <div className="hidden md:flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 hover:bg-gray-100 border-gray-200"
                              onClick={() => setSelectedCompetitorId(competitor.id)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 hover:bg-green-50 text-green-600 border-green-200"
                              onClick={() => setManualMetricsCompetitor(competitor)}
                              title="Manually enter metrics"
                            >
                              <PencilLine className="h-3 w-3 mr-1" />
                              Manual
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 hover:bg-blue-50 text-blue-600 border-blue-200"
                              onClick={() => setEditingCompetitorId(competitor.id)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Modals */}
      <CreateCompetitorModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          mutate();
          setIsCreateModalOpen(false);
        }}
      />

      {editingCompetitorId && (
        <EditCompetitorModal
          competitorId={editingCompetitorId}
          onClose={() => setEditingCompetitorId(null)}
          onSuccess={() => {
            mutate();
            setEditingCompetitorId(null);
          }}
        />
      )}

      {selectedCompetitorId && (
        <CompetitorMetricsModal
          competitorId={selectedCompetitorId}
          onClose={() => setSelectedCompetitorId(null)}
        />
      )}

      {manualMetricsCompetitor && (
        <ManualMetricsModal
          competitor={manualMetricsCompetitor}
          open={true}
          onOpenChange={(open) => !open && setManualMetricsCompetitor(null)}
          onSuccess={() => {
            mutate();
            setManualMetricsCompetitor(null);
          }}
        />
      )}
    </div>
  );
}