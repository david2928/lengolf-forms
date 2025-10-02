'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  RefreshCw,
  Send,
  Search,
  Plus,
  Trash2,
  Filter,
  CheckCircle
} from 'lucide-react';

interface Member {
  line_user_id: string;
  customer_id: string;
  customer_name: string;
  display_name: string;
  contact_number: string;
}

interface Audience {
  id: string;
  name: string;
  description?: string;
  type: 'manual' | 'criteria' | 'upload';
  is_active: boolean;
  created_at: string;
  stats: {
    total_members: number;
    opted_out_count: number;
    active_members: number;
    opt_out_rate: number;
  };
  members: Member[];
}

interface AvailableContact {
  line_user_id: string;
  customer_id: string;
  customer_name: string;
  display_name: string;
  contact_number: string;
}

export default function AudienceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const audienceId = params.id as string;
  const { toast } = useToast();

  const [audience, setAudience] = useState<Audience | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchAudience = useCallback(async () => {
    try {
      const response = await fetch(`/api/line/audiences/${audienceId}`);
      const data = await response.json();
      if (data.success) {
        setAudience(data.audience);
      }
    } catch (error) {
      console.error('Error fetching audience:', error);
    } finally {
      setLoading(false);
    }
  }, [audienceId]);

  useEffect(() => {
    fetchAudience();
  }, [fetchAudience]);

  const syncAudience = async () => {
    if (audience?.type !== 'criteria') return;

    setSyncing(true);
    try {
      const response = await fetch(`/api/line/audiences/${audienceId}/sync`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Audience synced successfully",
          description: `Added ${data.members_added} new member${data.members_added !== 1 ? 's' : ''}`,
        });
        await fetchAudience();
      }
    } catch (error) {
      console.error('Error syncing audience:', error);
      toast({
        title: "Sync failed",
        description: "Failed to sync audience members",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleMemberSelection = (lineUserId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(lineUserId)) {
      newSelection.delete(lineUserId);
    } else {
      newSelection.add(lineUserId);
    }
    setSelectedMembers(newSelection);
  };

  const toggleSelectAll = () => {
    if (!audience) return;

    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredMembers.map(m => m.line_user_id)));
    }
  };

  const removeSelectedMembers = async () => {
    if (selectedMembers.size === 0) return;

    if (!confirm(`Remove ${selectedMembers.size} selected member${selectedMembers.size !== 1 ? 's' : ''} from this audience?`)) {
      return;
    }

    try {
      // Remove each selected member
      for (const lineUserId of Array.from(selectedMembers)) {
        await fetch(`/api/line/audiences/${audienceId}/members/${lineUserId}`, {
          method: 'DELETE'
        });
      }

      toast({
        title: "Members removed",
        description: `Successfully removed ${selectedMembers.size} member${selectedMembers.size !== 1 ? 's' : ''}`,
      });
      setSelectedMembers(new Set());
      await fetchAudience();
    } catch (error) {
      console.error('Error removing members:', error);
      toast({
        title: "Remove failed",
        description: "Failed to remove members from audience",
        variant: "destructive",
      });
    }
  };

  if (loading || !audience) {
    return (
      <div className="container max-w-6xl py-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const filteredMembers = audience.members.filter(member =>
    member.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.contact_number?.includes(searchQuery)
  );

  const allSelected = selectedMembers.size === filteredMembers.length && filteredMembers.length > 0;

  return (
    <div className="container max-w-6xl py-6">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.push('/staff/line-audiences')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Audiences
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">{audience.name}</h1>
          {audience.description && (
            <p className="text-muted-foreground">{audience.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={audience.type === 'criteria' ? 'default' : 'secondary'}>
              {audience.type}
            </Badge>
            {!audience.is_active && (
              <Badge variant="outline">Inactive</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {audience.type === 'criteria' && (
            <Button
              variant="outline"
              onClick={syncAudience}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sync Members
            </Button>
          )}
          <Button
            onClick={() => router.push(`/staff/line-campaigns/new?audience_id=${audienceId}`)}
          >
            <Send className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audience.stats.total_members}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {audience.stats.active_members}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserX className="h-4 w-4 text-red-600" />
              Opted Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {audience.stats.opted_out_count}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Opt-out Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {audience.stats.opt_out_rate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audience Members</CardTitle>
              <CardDescription>
                Manage individual members in this audience
              </CardDescription>
            </div>
            {audience.type === 'manual' && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Members
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {selectedMembers.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedMembers.size} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={removeSelectedMembers}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Selected
                </Button>
              </div>
            )}
          </div>

          {/* Members Table */}
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No members found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No members match your search' : 'This audience has no members yet'}
              </p>
              {audience.type === 'manual' && !searchQuery && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Members
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="bg-muted px-4 py-3 flex items-center gap-4 border-b">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                />
                <div className="flex-1 grid grid-cols-3 gap-4 text-sm font-medium">
                  <div>Customer Name</div>
                  <div>LINE Name</div>
                  <div>Contact</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y">
                {filteredMembers.map((member) => (
                  <div
                    key={member.line_user_id}
                    className="px-4 py-3 flex items-center gap-4 hover:bg-accent/50 cursor-pointer"
                    onClick={() => toggleMemberSelection(member.line_user_id)}
                  >
                    <Checkbox
                      checked={selectedMembers.has(member.line_user_id)}
                      onCheckedChange={() => toggleMemberSelection(member.line_user_id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
                      <div className="font-medium">
                        {member.customer_name || 'Unknown'}
                      </div>
                      <div className="text-muted-foreground">
                        {member.display_name || 'N/A'}
                      </div>
                      <div className="text-muted-foreground">
                        {member.contact_number || 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground text-center">
            Showing {filteredMembers.length} of {audience.members.length} members
          </div>
        </CardContent>
      </Card>

      {/* Add Members Modal */}
      {showAddModal && (
        <AddMembersModal
          audienceId={audienceId}
          existingMemberIds={new Set(audience.members.map(m => m.line_user_id))}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchAudience();
          }}
        />
      )}
    </div>
  );
}

// Add Members Modal Component
function AddMembersModal({
  audienceId,
  existingMemberIds,
  onClose,
  onSuccess
}: {
  audienceId: string;
  existingMemberIds: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<AvailableContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const fetchAvailableContacts = useCallback(async () => {
    try {
      // Get all LINE users with customer info
      const response = await fetch('/api/line/audiences/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria_json: { type: 'all_customers' } })
      });

      // For now, we'll need a helper endpoint. Let me create a simple version using execute_sql
      const sqlResponse = await fetch('/api/line/contacts/available');
      const data = await sqlResponse.json();

      if (data.success) {
        // Filter out existing members
        const available = data.contacts.filter(
          (c: AvailableContact) => !existingMemberIds.has(c.line_user_id)
        );
        setContacts(available);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [existingMemberIds]);

  useEffect(() => {
    fetchAvailableContacts();
  }, [fetchAvailableContacts]);

  const toggleContact = (lineUserId: string) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(lineUserId)) {
      newSelection.delete(lineUserId);
    } else {
      newSelection.add(lineUserId);
    }
    setSelectedContacts(newSelection);
  };

  const addMembers = async () => {
    if (selectedContacts.size === 0) return;

    setAdding(true);
    try {
      let successCount = 0;
      // Add each selected contact to the audience
      for (const lineUserId of Array.from(selectedContacts)) {
        const contact = contacts.find(c => c.line_user_id === lineUserId);
        if (!contact) continue;

        const response = await fetch(`/api/line/audiences/${audienceId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            line_user_id: lineUserId,
            customer_id: contact.customer_id
          })
        });

        if (response.ok) {
          successCount++;
        }
      }

      toast({
        title: "Members added",
        description: `Successfully added ${successCount} member${successCount !== 1 ? 's' : ''} to audience`,
      });
      onSuccess();
    } catch (error) {
      console.error('Error adding members:', error);
      toast({
        title: "Add failed",
        description: "Failed to add members to audience",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.contact_number?.includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle>Add Members to Audience</CardTitle>
          <CardDescription>
            Select LINE contacts to add to this audience
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {selectedContacts.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedContacts.size} contacts selected
                    </span>
                    <Button
                      size="sm"
                      variant="link"
                      onClick={() => setSelectedContacts(new Set())}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}

              <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No contacts match your search' : 'No available contacts'}
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact.line_user_id}
                      className="flex items-center gap-3 p-3 hover:bg-accent/50 cursor-pointer"
                      onClick={() => toggleContact(contact.line_user_id)}
                    >
                      <Checkbox
                        checked={selectedContacts.has(contact.line_user_id)}
                        onCheckedChange={() => toggleContact(contact.line_user_id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{contact.customer_name}</div>
                        <div className="text-sm text-muted-foreground">
                          LINE: {contact.display_name} • {contact.contact_number}
                        </div>
                      </div>
                      {selectedContacts.has(contact.line_user_id) && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={adding}
            >
              Cancel
            </Button>
            <Button
              onClick={addMembers}
              className="flex-1"
              disabled={adding || selectedContacts.size === 0}
            >
              {adding ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {selectedContacts.size} Members
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
