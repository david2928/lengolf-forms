'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Star, MessageCircle, CheckCircle, XCircle, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import type { GoogleReviewDB } from '@/types/google-reviews';

type FilterType = 'all' | 'has_reply' | 'needs_reply';

interface ConnectionStatus {
  connected: boolean;
  email: string | null;
}

export default function GoogleReviewsPage() {
  const [reviews, setReviews] = useState<GoogleReviewDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);

  // Check connection status
  const checkConnectionStatus = async () => {
    setIsCheckingConnection(true);
    try {
      const response = await fetch('/api/google-reviews/oauth/status');
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // Handle connect Google Business account
  const handleConnect = () => {
    // Redirect to OAuth flow
    window.location.href = '/api/google-reviews/oauth/connect';
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Google Business account?')) {
      return;
    }

    try {
      const response = await fetch('/api/google-reviews/oauth/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      toast.success('Google Business account disconnected');
      setConnectionStatus({ connected: false, email: null });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect account');
    }
  };

  // Fetch reviews from API
  const fetchReviews = async (filterType: FilterType = 'all') => {
    setIsLoading(true);
    try {
      let url = '/api/google-reviews?limit=100';

      if (filterType === 'has_reply') {
        url += '&hasReply=true';
      } else if (filterType === 'needs_reply') {
        url += '&hasReply=false';
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync reviews from Google
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/google-reviews/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const result = await response.json();
      toast.success(
        `Sync completed! ${result.new} new, ${result.updated} updated, ${result.synced} total`
      );
      setLastSync(new Date().toISOString());

      // Refresh reviews
      await fetchReviews(filter);
    } catch (error: any) {
      console.error('Error syncing reviews:', error);
      toast.error(error.message || 'Failed to sync reviews');
    } finally {
      setIsSyncing(false);
    }
  };

  // Load connection status and reviews on mount
  useEffect(() => {
    checkConnectionStatus();
    fetchReviews(filter);
  }, [filter]);

  // Check for OAuth callback success/error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'connected') {
      toast.success('Google Business account connected successfully!');
      checkConnectionStatus();
      // Clean URL
      window.history.replaceState({}, '', '/admin/google-reviews');
    } else if (params.get('error')) {
      const errorMsg = params.get('message') || 'Failed to connect account';
      toast.error(errorMsg);
      // Clean URL
      window.history.replaceState({}, '', '/admin/google-reviews');
    }
  }, []);

  // Calculate stats
  const stats = {
    total: reviews.length,
    withReply: reviews.filter((r) => r.has_reply).length,
    needsReply: reviews.filter((r) => !r.has_reply).length,
    avgRating:
      reviews.length > 0
        ? (
            reviews.reduce((sum, r) => {
              const rating = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[r.star_rating];
              return sum + (rating || 0);
            }, 0) / reviews.length
          ).toFixed(1)
        : 'N/A',
  };

  const renderStars = (rating: string) => {
    const numStars = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[rating] || 0;
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < numStars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading && reviews.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading reviews...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Google Reviews</h1>
          <p className="text-muted-foreground">
            Manage and monitor Google Business Profile reviews
          </p>
        </div>
        <Button onClick={handleSync} disabled={isSyncing || !connectionStatus?.connected}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Reviews'}
        </Button>
      </div>

      {/* Connection Status */}
      {!isCheckingConnection && (
        <Alert className={connectionStatus?.connected ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connectionStatus?.connected ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-orange-600" />
              )}
              <div>
                <AlertDescription className="text-sm font-medium">
                  {connectionStatus?.connected ? (
                    <>
                      <span className="text-green-900">Connected to Google Business Profile</span>
                      <span className="text-muted-foreground ml-2">({connectionStatus.email})</span>
                    </>
                  ) : (
                    <span className="text-orange-900">
                      Google Business account not connected. Please connect to sync reviews.
                    </span>
                  )}
                </AlertDescription>
              </div>
            </div>
            <div>
              {connectionStatus?.connected ? (
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              ) : (
                <Button onClick={handleConnect} className="gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Connect Google Business
                </Button>
              )}
            </div>
          </div>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With Reply
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withReply}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Needs Reply
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.needsReply}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({stats.total})
        </Button>
        <Button
          variant={filter === 'has_reply' ? 'default' : 'outline'}
          onClick={() => setFilter('has_reply')}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Has Reply ({stats.withReply})
        </Button>
        <Button
          variant={filter === 'needs_reply' ? 'default' : 'outline'}
          onClick={() => setFilter('needs_reply')}
        >
          Needs Reply ({stats.needsReply})
        </Button>
      </div>

      {/* Reviews Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reviewer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No reviews found. Click &ldquo;Sync Reviews&rdquo; to fetch from Google.
                  </TableCell>
                </TableRow>
              ) : (
                reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">{review.reviewer_name}</TableCell>
                    <TableCell>{renderStars(review.star_rating)}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="line-clamp-2 text-sm">{review.comment || 'No comment'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{review.language}</Badge>
                    </TableCell>
                    <TableCell>
                      {review.has_reply ? (
                        <Badge className="bg-green-100 text-green-800">Replied</Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(review.review_created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Last Sync Time */}
      {lastSync && (
        <p className="text-sm text-muted-foreground text-center">
          Last synced: {formatDate(lastSync)} at {new Date(lastSync).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
