'use client';

import { useState } from 'react';
import { Play, FileText, Image, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Platform } from '@/types/competitor-tracking';

const platforms: { value: Platform; label: string; color: string }[] = [
  { value: 'instagram', label: 'Instagram', color: 'bg-pink-100 text-pink-800' },
  { value: 'facebook', label: 'Facebook', color: 'bg-blue-100 text-blue-800' },
  { value: 'line', label: 'LINE', color: 'bg-green-100 text-green-800' },
  { value: 'google_reviews', label: 'Google Reviews', color: 'bg-yellow-100 text-yellow-800' },
];

const testUrls = {
  instagram: "https://www.instagram.com/nikegolf/",
  facebook: "https://www.facebook.com/GolfDigest/",
  google_reviews: "https://maps.google.com/maps?q=golf+course",
  line: "https://line.me/en/"
};

export function ScraperTestPanel() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('instagram');
  const [testUrl, setTestUrl] = useState(testUrls.instagram);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handlePlatformChange = (platform: Platform) => {
    setSelectedPlatform(platform);
    setTestUrl(testUrls[platform]);
    setTestResult(null);
  };

  const runTest = async () => {
    if (!testUrl) {
      toast.error('Please enter a URL to test');
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/competitors/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          url: testUrl
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Test failed');
      }

      setTestResult(data);
      
      if (data.result.success) {
        toast.success('Test completed successfully!');
      } else {
        toast.error(`Test failed: ${data.result.error}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Test failed');
      setTestResult({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatMetrics = (metrics: any) => {
    if (!metrics) return null;

    const entries = Object.entries(metrics).filter(([key, value]) => 
      value !== null && value !== undefined && key !== 'raw_data'
    );

    return entries.map(([key, value]) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const displayValue = typeof value === 'number' ? 
        value.toLocaleString() : 
        String(value);
      
      return { label, value: displayValue };
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Scraper Testing Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="platform">Platform</Label>
              <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="url">Test URL</Label>
              <Input
                id="url"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <Button 
            onClick={runTest} 
            disabled={isLoading || !testUrl}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Running Test...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.result?.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Platform</Label>
                <Badge className={platforms.find(p => p.value === selectedPlatform)?.color}>
                  {platforms.find(p => p.value === selectedPlatform)?.label}
                </Badge>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Status</Label>
                <div className={`text-sm font-medium ${
                  testResult.result?.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {testResult.result?.success ? 'Success' : 'Failed'}
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Duration</Label>
                <div className="text-sm font-medium">
                  {testResult.result?.duration_ms ? 
                    `${(testResult.result.duration_ms / 1000).toFixed(1)}s` : 
                    'N/A'
                  }
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Screenshot</Label>
                <div className="text-sm font-medium">
                  {testResult.result?.screenshot_length ? 
                    `${(testResult.result.screenshot_length / 1024).toFixed(1)}KB` : 
                    'None'
                  }
                </div>
              </div>
            </div>

            {/* Error Message */}
            {testResult.result?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                  <AlertCircle className="h-4 w-4" />
                  Error Details
                </div>
                <p className="text-red-700 text-sm">{testResult.result.error}</p>
              </div>
            )}

            {/* Extracted Metrics */}
            {testResult.result?.metrics && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 font-medium mb-3">
                  <FileText className="h-4 w-4" />
                  Extracted Metrics
                </div>
                
                {formatMetrics(testResult.result.metrics)?.length ?? 0 > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {formatMetrics(testResult.result.metrics)?.map((metric, index) => (
                      <div key={index} className="bg-white rounded border p-2">
                        <div className="text-xs text-gray-600">{metric.label}</div>
                        <div className="font-medium">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-green-700 text-sm">No metrics extracted</p>
                )}
              </div>
            )}

            {/* Raw Data */}
            {testResult.result?.metrics?.raw_data && (
              <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <summary className="cursor-pointer font-medium text-gray-800 mb-2">
                  Raw Data (Click to expand)
                </summary>
                <Textarea
                  value={JSON.stringify(testResult.result.metrics.raw_data, null, 2)}
                  readOnly
                  rows={10}
                  className="text-sm font-mono"
                />
              </details>
            )}

            {/* Full Response */}
            <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <summary className="cursor-pointer font-medium text-gray-800 mb-2">
                Full Response (Click to expand)
              </summary>
              <Textarea
                value={JSON.stringify(testResult, null, 2)}
                readOnly
                rows={15}
                className="text-sm font-mono"
              />
            </details>
          </CardContent>
        </Card>
      )}

      {/* Test Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Instagram:</strong> Test with public business accounts. Look for follower/following counts and post numbers.
            </div>
            <div>
              <strong>Facebook:</strong> Test with public business pages. Check for page likes and follower counts.
            </div>
            <div>
              <strong>Google Reviews:</strong> Test with business listings on Google Maps. Look for rating and review count.
            </div>
            <div>
              <strong>LINE:</strong> Test with public LINE Official Accounts (limited public data available).
            </div>
            <div className="pt-2 border-t">
              <strong>Expected Results:</strong> Each test should extract relevant metrics, take a screenshot, and complete within 30 seconds.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}