'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Save, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Platform, CompetitorWithAccounts } from '@/types/competitor-tracking';

interface ManualMetricsModalProps {
  competitor: CompetitorWithAccounts;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface MetricsFormData {
  instagram?: {
    followers_count?: number;
    following_count?: number;
    posts_count?: number;
    stories_count?: number;
    reels_count?: number;
  };
  facebook?: {
    followers_count?: number;
    page_likes?: number;
    posts_count?: number;
    check_ins?: number;
  };
  google_reviews?: {
    google_rating?: number;
    google_review_count?: number;
  };
  line?: {
    line_friends_count?: number;
  };
}

export function ManualMetricsModal({ competitor, open, onOpenChange, onSuccess }: ManualMetricsModalProps) {
  const [formData, setFormData] = useState<MetricsFormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const socialAccounts = competitor.social_accounts || [];
  const activePlatforms = socialAccounts.map(acc => acc.platform);

  const getPlatformUrl = (platform: Platform) => {
    return competitor.social_accounts?.find(acc => acc.platform === platform)?.account_url;
  };

  const handleInputChange = (platform: Platform, field: string, value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    
    setFormData(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform as keyof MetricsFormData],
        [field]: numValue
      }
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const metricsToSubmit = [];
      
      for (const platform of activePlatforms) {
        const platformData = formData[platform as keyof MetricsFormData];
        if (platformData && Object.values(platformData).some(v => v !== undefined)) {
          metricsToSubmit.push({
            platform,
            metrics: platformData
          });
        }
      }

      if (metricsToSubmit.length === 0) {
        toast.error('Please enter at least one metric value');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`/api/admin/competitors/${competitor.id}/manual-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics: metricsToSubmit }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit metrics');
      }

      toast.success('Metrics submitted successfully');
      onSuccess();
      // Don't close modal - allow user to continue with other platforms
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit metrics');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manual Metrics Submission</DialogTitle>
          <DialogDescription>
            Enter metrics manually for {competitor.name}. Leave fields empty to skip.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This feature allows you to manually input metrics when automatic scraping fails. 
            The values will be recorded with the current timestamp.
          </AlertDescription>
        </Alert>


{activePlatforms.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No social media accounts configured for this competitor.</p>
          </div>
        ) : (
          <Tabs defaultValue={activePlatforms[0]} className="mt-4">
            <TabsList className="grid grid-cols-4 w-full">
              {activePlatforms.includes('instagram' as Platform) && (
                <TabsTrigger value="instagram" className="relative">
                  Instagram
                  <a
                    href={getPlatformUrl('instagram')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-white/20 rounded p-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TabsTrigger>
              )}
              {activePlatforms.includes('facebook' as Platform) && (
                <TabsTrigger value="facebook" className="relative">
                  Facebook
                  <a
                    href={getPlatformUrl('facebook')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-white/20 rounded p-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TabsTrigger>
              )}
              {activePlatforms.includes('google_reviews' as Platform) && (
                <TabsTrigger value="google_reviews" className="relative">
                  Google Reviews
                  <a
                    href={getPlatformUrl('google_reviews')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-white/20 rounded p-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TabsTrigger>
              )}
              {activePlatforms.includes('line' as Platform) && (
                <TabsTrigger value="line" className="relative">
                  LINE
                  <a
                    href={getPlatformUrl('line')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-white/20 rounded p-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TabsTrigger>
              )}
            </TabsList>

            {activePlatforms.includes('instagram' as Platform) && (
              <TabsContent value="instagram">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ig-followers">Followers</Label>
                        <Input
                          id="ig-followers"
                          type="number"
                          placeholder="0"
                          value={formData.instagram?.followers_count || ''}
                          onChange={(e) => handleInputChange('instagram', 'followers_count', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ig-following">Following</Label>
                        <Input
                          id="ig-following"
                          type="number"
                          placeholder="0"
                          value={formData.instagram?.following_count || ''}
                          onChange={(e) => handleInputChange('instagram', 'following_count', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ig-posts">Posts</Label>
                        <Input
                          id="ig-posts"
                          type="number"
                          placeholder="0"
                          value={formData.instagram?.posts_count || ''}
                          onChange={(e) => handleInputChange('instagram', 'posts_count', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ig-reels">Reels</Label>
                        <Input
                          id="ig-reels"
                          type="number"
                          placeholder="0"
                          value={formData.instagram?.reels_count || ''}
                          onChange={(e) => handleInputChange('instagram', 'reels_count', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {activePlatforms.includes('facebook' as Platform) && (
              <TabsContent value="facebook">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fb-followers">Followers</Label>
                        <Input
                          id="fb-followers"
                          type="number"
                          placeholder="0"
                          value={formData.facebook?.followers_count || ''}
                          onChange={(e) => handleInputChange('facebook', 'followers_count', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fb-likes">Page Likes</Label>
                        <Input
                          id="fb-likes"
                          type="number"
                          placeholder="0"
                          value={formData.facebook?.page_likes || ''}
                          onChange={(e) => handleInputChange('facebook', 'page_likes', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fb-posts">Posts</Label>
                        <Input
                          id="fb-posts"
                          type="number"
                          placeholder="0"
                          value={formData.facebook?.posts_count || ''}
                          onChange={(e) => handleInputChange('facebook', 'posts_count', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fb-checkins">Check-ins</Label>
                        <Input
                          id="fb-checkins"
                          type="number"
                          placeholder="0"
                          value={formData.facebook?.check_ins || ''}
                          onChange={(e) => handleInputChange('facebook', 'check_ins', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {activePlatforms.includes('google_reviews' as Platform) && (
              <TabsContent value="google_reviews">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="google-rating">Rating (1-5)</Label>
                        <Input
                          id="google-rating"
                          type="number"
                          step="0.1"
                          min="1"
                          max="5"
                          placeholder="4.5"
                          value={formData.google_reviews?.google_rating || ''}
                          onChange={(e) => handleInputChange('google_reviews', 'google_rating', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="google-reviews">Review Count</Label>
                        <Input
                          id="google-reviews"
                          type="number"
                          placeholder="0"
                          value={formData.google_reviews?.google_review_count || ''}
                          onChange={(e) => handleInputChange('google_reviews', 'google_review_count', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {activePlatforms.includes('line' as Platform) && (
              <TabsContent value="line">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="line-friends">Friends Count</Label>
                      <Input
                        id="line-friends"
                        type="number"
                        placeholder="0"
                        value={formData.line?.line_friends_count || ''}
                        onChange={(e) => handleInputChange('line', 'line_friends_count', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || activePlatforms.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Submitting...' : 'Submit Metrics'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}