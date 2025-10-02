'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Users,
  Plus,
  RefreshCw,
  Trash2,
  Send,
  UserCheck,
  UserX,
  Filter,
  ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AudienceStats {
  total_members: number;
  opted_out_count: number;
  active_members: number;
  opt_out_rate: number;
}

interface Audience {
  id: string;
  name: string;
  description?: string;
  type: 'manual' | 'criteria' | 'upload';
  is_active: boolean;
  allow_opt_out: boolean;
  created_at: string;
  stats: AudienceStats;
}

export default function LineAudiencesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Fetch audiences
  useEffect(() => {
    fetchAudiences();
  }, []);

  const fetchAudiences = async () => {
    try {
      const response = await fetch('/api/line/audiences');
      const data = await response.json();
      if (data.success) {
        setAudiences(data.audiences);
      }
    } catch (error) {
      console.error('Error fetching audiences:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncAudience = async (audienceId: string) => {
    setSyncing(audienceId);
    try {
      const response = await fetch(`/api/line/audiences/${audienceId}/sync`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Audience synced",
          description: `Added ${data.members_added} new member${data.members_added !== 1 ? 's' : ''}`,
        });
        await fetchAudiences();
      }
    } catch (error) {
      console.error('Error syncing audience:', error);
      toast({
        title: "Sync failed",
        description: "Failed to sync audience members",
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  const deleteAudience = async (audienceId: string, name: string) => {
    if (!confirm(`Delete audience "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/line/audiences/${audienceId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast({
          title: "Audience deleted",
          description: `Successfully deleted "${name}"`,
        });
        await fetchAudiences();
      }
    } catch (error) {
      console.error('Error deleting audience:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete audience",
        variant: "destructive",
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'criteria': return 'bg-blue-500';
      case 'manual': return 'bg-green-500';
      case 'upload': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="container max-w-6xl py-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">LINE Audience Manager</h1>
          <p className="text-muted-foreground">
            Create and manage audiences for broadcast messaging
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Audience
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Audiences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audiences.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {audiences.reduce((sum, a) => sum + a.stats.total_members, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {audiences.reduce((sum, a) => sum + a.stats.active_members, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audiences List */}
      <div className="space-y-4">
        {audiences.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No audiences yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first audience to start sending broadcast messages
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Audience
              </Button>
            </CardContent>
          </Card>
        ) : (
          audiences.map((audience) => (
            <Card key={audience.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{audience.name}</CardTitle>
                      <Badge className={getTypeColor(audience.type)}>
                        {audience.type}
                      </Badge>
                      {!audience.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {audience.description && (
                      <CardDescription>{audience.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/staff/line-audiences/${audience.id}`)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Members
                    </Button>
                    {audience.type === 'criteria' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncAudience(audience.id)}
                        disabled={syncing === audience.id}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncing === audience.id ? 'animate-spin' : ''}`} />
                        Sync
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => router.push(`/staff/line-campaigns/new?audience_id=${audience.id}`)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Create Campaign
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteAudience(audience.id, audience.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-2xl font-bold">{audience.stats.total_members}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <UserCheck className="h-5 w-5 mx-auto mb-1 text-green-600" />
                    <div className="text-2xl font-bold text-green-600">
                      {audience.stats.active_members}
                    </div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <UserX className="h-5 w-5 mx-auto mb-1 text-red-600" />
                    <div className="text-2xl font-bold text-red-600">
                      {audience.stats.opted_out_count}
                    </div>
                    <div className="text-xs text-muted-foreground">Opted Out</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Filter className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-2xl font-bold">
                      {audience.stats.opt_out_rate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Opt-out Rate</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Created {new Date(audience.created_at).toLocaleDateString()}
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => router.push(`/staff/line-audiences/${audience.id}`)}
                  >
                    View Details
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Audience Modal */}
      {showCreateModal && (
        <CreateAudienceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchAudiences();
          }}
        />
      )}
    </div>
  );
}

// Create Audience Modal Component
function CreateAudienceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'criteria' | 'manual'>('criteria');
  const [criteriaType, setCriteriaType] = useState<'coaching_hours' | 'all_customers'>('coaching_hours');
  const [previewSize, setPreviewSize] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const previewAudience = useCallback(async () => {
    const criteria = criteriaType === 'coaching_hours'
      ? { type: 'coaching_hours' }
      : { type: 'all_customers' };

    try {
      const response = await fetch('/api/line/audiences/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria_json: criteria })
      });
      const data = await response.json();
      if (data.success) {
        setPreviewSize(data.estimated_size);
      }
    } catch (error) {
      console.error('Error previewing audience:', error);
    }
  }, [criteriaType]);

  const createAudience = async () => {
    if (!name.trim()) {
      toast({
        title: "Validation error",
        description: "Please enter an audience name",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const criteria = type === 'criteria'
        ? (criteriaType === 'coaching_hours'
            ? { type: 'coaching_hours' }
            : { type: 'all_customers' })
        : null;

      const response = await fetch('/api/line/audiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          type,
          criteria_json: criteria,
          allow_opt_out: true
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Audience created",
          description: type === 'manual' ? 'You can now add members individually' : `Created "${name}" successfully`,
        });
        onSuccess();
      } else {
        toast({
          title: "Creation failed",
          description: data.error || "Failed to create audience",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating audience:', error);
      toast({
        title: "Creation failed",
        description: "An error occurred while creating the audience",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (type === 'criteria') {
      previewAudience();
    }
  }, [criteriaType, type, previewAudience]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Create New Audience</CardTitle>
          <CardDescription>
            Create an audience to send broadcast messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Audience Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Customers with Coaching Hours"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this audience"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="audience-type">Audience Type</Label>
            <select
              id="audience-type"
              className="w-full p-2 border rounded-md"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value="criteria">Criteria-based (Auto-sync)</option>
              <option value="manual">Manual Selection</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {type === 'criteria'
                ? 'Members automatically added based on criteria'
                : 'Manually select individual members'}
            </p>
          </div>

          {type === 'criteria' && (
            <div>
              <Label htmlFor="criteria">Criteria</Label>
              <select
                id="criteria"
                className="w-full p-2 border rounded-md"
                value={criteriaType}
                onChange={(e) => setCriteriaType(e.target.value as any)}
              >
                <option value="coaching_hours">Customers with Coaching Hours</option>
                <option value="all_customers">All LINE Customers</option>
              </select>
            </div>
          )}

          {type === 'criteria' && previewSize !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-900">
                    Estimated Size: {previewSize} members
                  </div>
                  <div className="text-sm text-blue-700">
                    This audience will be auto-synced with current data
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === 'manual' && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-600" />
                <div>
                  <div className="font-semibold text-amber-900">
                    Manual Audience
                  </div>
                  <div className="text-sm text-amber-700">
                    After creation, you can add members individually from your LINE contacts
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={createAudience}
              className="flex-1"
              disabled={creating}
            >
              {creating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Audience
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
