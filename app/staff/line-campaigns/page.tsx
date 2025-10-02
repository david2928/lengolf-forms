'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  Eye,
  Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CampaignStats {
  total_sent: number;
  success_count: number;
  error_count: number;
  opted_out_count: number;
  blocked_count: number;
  success_rate: number;
  error_rate: number;
}

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  message_type: 'text' | 'flex';
  total_recipients: number;
  success_count: number;
  error_count: number;
  sent_at?: string;
  created_at: string;
  line_audiences?: {
    id: string;
    name: string;
    type: string;
  };
  stats: CampaignStats;
}

export default function LineCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchCampaigns = useCallback(async () => {
    try {
      const url = filter === 'all'
        ? '/api/line/campaigns'
        : `/api/line/campaigns?status=${filter}`;

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchCampaigns();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchCampaigns, 5000);
    return () => clearInterval(interval);
  }, [fetchCampaigns]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'sending': return 'bg-blue-500 animate-pulse';
      case 'failed': return 'bg-red-500';
      case 'scheduled': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'sending': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'scheduled': return <Clock className="h-4 w-4" />;
      default: return <Send className="h-4 w-4" />;
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

  const completedCampaigns = campaigns.filter(c => c.status === 'completed');
  const totalSent = completedCampaigns.reduce((sum, c) => sum + c.total_recipients, 0);
  const totalSuccess = completedCampaigns.reduce((sum, c) => sum + c.success_count, 0);
  const avgSuccessRate = completedCampaigns.length > 0
    ? completedCampaigns.reduce((sum, c) => sum + c.stats.success_rate, 0) / completedCampaigns.length
    : 0;

  return (
    <div className="container max-w-6xl py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Broadcast Campaigns</h1>
          <p className="text-muted-foreground">
            View and manage LINE broadcast message campaigns
          </p>
        </div>
        <Button onClick={() => router.push('/staff/line-campaigns/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Messages Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalSuccess.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {avgSuccessRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {['all', 'completed', 'sending', 'scheduled', 'failed'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                {campaigns.filter(c => c.status === status).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first broadcast campaign to send messages to your audiences
              </p>
              <Button onClick={() => router.push('/staff/line-campaigns/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <Badge className={getStatusColor(campaign.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(campaign.status)}
                          {campaign.status}
                        </span>
                      </Badge>
                      <Badge variant="outline">
                        {campaign.message_type === 'flex' ? 'Rich Message' : 'Text'}
                      </Badge>
                    </div>
                    {campaign.line_audiences && (
                      <CardDescription>
                        Audience: {campaign.line_audiences.name}
                      </CardDescription>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/staff/line-campaigns/${campaign.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {campaign.status === 'completed' || campaign.status === 'sending' ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <div className="text-2xl font-bold">{campaign.total_recipients}</div>
                      <div className="text-xs text-muted-foreground">Recipients</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
                      <div className="text-2xl font-bold text-green-600">
                        {campaign.success_count}
                      </div>
                      <div className="text-xs text-muted-foreground">Delivered</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <XCircle className="h-5 w-5 mx-auto mb-1 text-red-600" />
                      <div className="text-2xl font-bold text-red-600">
                        {campaign.error_count}
                      </div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <TrendingUp className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                      <div className="text-2xl font-bold text-blue-600">
                        {campaign.stats.success_rate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Success Rate</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    {campaign.status === 'draft' && 'Campaign not yet sent'}
                    {campaign.status === 'scheduled' && 'Scheduled for later'}
                    {campaign.status === 'failed' && 'Campaign failed - check logs for details'}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {campaign.sent_at
                      ? `Sent ${new Date(campaign.sent_at).toLocaleString()}`
                      : `Created ${new Date(campaign.created_at).toLocaleString()}`
                    }
                  </span>
                  {campaign.status === 'sending' && (
                    <Badge variant="secondary" className="animate-pulse">
                      Sending in progress...
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
