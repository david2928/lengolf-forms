'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  UserX,
  Ban,
  RefreshCw,
  Download,
  Send
} from 'lucide-react';

interface DeliveryLog {
  id: string;
  line_user_id: string;
  status: 'success' | 'failed' | 'opted_out' | 'blocked';
  error_message?: string;
  sent_at: string;
  customers?: {
    customer_name: string;
    contact_number: string;
  };
  line_users?: {
    display_name: string;
  };
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<any>(null);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resending, setResending] = useState(false);

  const fetchCampaign = useCallback(async () => {
    try {
      const response = await fetch(`/api/line/campaigns/${campaignId}`);
      const data = await response.json();
      if (data.success) {
        setCampaign(data.campaign);
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
    }
  }, [campaignId]);

  const fetchLogs = useCallback(async () => {
    try {
      const url = statusFilter === 'all'
        ? `/api/line/campaigns/${campaignId}/logs`
        : `/api/line/campaigns/${campaignId}/logs?status=${statusFilter}`;

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [campaignId, statusFilter]);

  useEffect(() => {
    fetchCampaign();
    fetchLogs();

    // Poll for updates while campaign is sending
    const interval = setInterval(() => {
      if (campaign?.status === 'sending') {
        fetchCampaign();
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [campaign?.status, fetchCampaign, fetchLogs]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'opted_out': return <UserX className="h-4 w-4 text-orange-600" />;
      case 'blocked': return <Ban className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'opted_out': return 'bg-orange-500';
      case 'blocked': return 'bg-red-700';
      default: return 'bg-gray-500';
    }
  };

  const resendCampaign = async () => {
    if (!confirm('Are you sure you want to resend this campaign? This will send to all active audience members again.')) {
      return;
    }

    setResending(true);
    try {
      // Send the campaign
      const response = await fetch(`/api/line/campaigns/${campaignId}/send`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Campaign resending",
          description: `Sending to ${data.total_recipients} recipient${data.total_recipients !== 1 ? 's' : ''}`,
        });

        // Refresh campaign data
        await fetchCampaign();
        await fetchLogs();
      } else {
        toast({
          title: "Failed to resend",
          description: data.error || "Unknown error",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error resending campaign:', error);
      toast({
        title: "Failed to resend",
        description: "An error occurred while resending the campaign",
        variant: "destructive"
      });
    } finally {
      setResending(false);
    }
  };

  if (loading || !campaign) {
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
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.push('/staff/line-campaigns')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Campaigns
      </Button>

      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          {campaign.status !== 'sending' && campaign.status !== 'draft' && (
            <Button
              onClick={resendCampaign}
              disabled={resending}
            >
              {resending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Resend Campaign
                </>
              )}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(campaign.status)}>
            {campaign.status}
          </Badge>
          <Badge variant="outline">
            {campaign.message_type === 'flex' ? 'Rich Message' : 'Text'}
          </Badge>
          {campaign.line_audiences && (
            <span className="text-sm text-muted-foreground">
              Audience: {campaign.line_audiences.name}
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Recipients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.total_recipients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Delivered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {campaign.stats.success_count}
            </div>
            <div className="text-xs text-muted-foreground">
              {campaign.stats.success_rate.toFixed(1)}% success rate
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {campaign.stats.error_count}
            </div>
            <div className="text-xs text-muted-foreground">
              {campaign.stats.error_rate.toFixed(1)}% error rate
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserX className="h-4 w-4 text-orange-600" />
              Opted Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {campaign.stats.opted_out_count}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {['all', 'success', 'failed', 'opted_out', 'blocked'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Delivery Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Delivery Logs</CardTitle>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No logs found for this filter
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="font-medium">
                        {log.customers?.customer_name || log.line_users?.display_name || 'Unknown User'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {log.customers?.contact_number || log.line_user_id}
                      </div>
                      {log.error_message && (
                        <div className="text-xs text-red-600 mt-1">
                          Error: {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(log.status)}>
                      {log.status}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(log.sent_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
