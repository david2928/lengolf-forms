'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  Globe,
  CalendarDays,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

import TrafficKPICards from '@/components/traffic-analytics/TrafficKPICards';
import TrafficOverview from '@/components/traffic-analytics/TrafficOverview';
import TrafficTopPages from '@/components/traffic-analytics/TrafficTopPages';
import TrafficFunnel from '@/components/traffic-analytics/TrafficFunnel';
import TrafficChannels from '@/components/traffic-analytics/TrafficChannels';
import { useTrafficAnalytics } from '@/hooks/useTrafficAnalytics';

type PropertyFilter = 'all' | 'www' | 'booking' | 'liff';

const PROPERTY_OPTIONS: { value: PropertyFilter; label: string }[] = [
  { value: 'all', label: 'All Properties' },
  { value: 'www', label: 'Website' },
  { value: 'booking', label: 'Booking App' },
  { value: 'liff', label: 'LIFF Pages' },
];

export default function TrafficAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<string>('30');
  const [property, setProperty] = useState<PropertyFilter>('all');
  const [referenceDate, setReferenceDate] = useState<Date>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  });
  const [activeTab, setActiveTab] = useState<string>('overview');

  const {
    data,
    isLoading,
    isValidating,
    isError,
    refresh,
  } = useTrafficAnalytics({
    timeRange,
    property,
    referenceDate: referenceDate.toISOString().split('T')[0],
    enabled: true,
  });

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-600" />
            Traffic Analytics
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Google Analytics 4 traffic insights across all LENGOLF web properties
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Property Filter */}
          <Select value={property} onValueChange={(v) => setProperty(v as PropertyFilter)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Time Range */}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('gap-1')}>
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">{format(referenceDate, 'MMM d, yyyy')}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={referenceDate}
                onSelect={(date) => date && setReferenceDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            disabled={isValidating}
          >
            <RefreshCw className={cn('h-4 w-4', isValidating && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Property filter note */}
      {property !== 'all' && (
        <div className="mb-4">
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            Property filter affects page data only. KPIs, funnel, and channel data show all properties.
          </Badge>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">Failed to load traffic data. Please try refreshing.</p>
        </div>
      )}

      {/* KPI Cards */}
      {data.kpis ? (
        <TrafficKPICards data={data.kpis} days={parseInt(timeRange)} isLoading={isLoading} />
      ) : isLoading ? (
        <TrafficKPICards data={{
          sessions: 0, sessionsChange: 0, users: 0, usersChange: 0,
          newUsers: 0, newUsersChange: 0, pageViews: 0, pageViewsChange: 0,
          bounceRate: 0, bounceRateChange: 0, avgDuration: 0, avgDurationChange: 0,
          conversions: 0, conversionsChange: 0, conversionRate: 0, conversionRateChange: 0,
        }} days={parseInt(timeRange)} isLoading={true} />
      ) : null}

      {/* Tabs */}
      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="funnel">Funnel</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            {!isLoading && (
              <TrafficOverview
                dailyTrends={data.dailyTrends}
                deviceBreakdown={data.deviceBreakdown}
                channelBreakdown={data.channelBreakdown}
                topPages={data.topPages}
                pageDailyTrends={data.pageDailyTrends}
              />
            )}
          </TabsContent>

          <TabsContent value="pages" className="mt-4">
            {!isLoading && (
              <TrafficTopPages
                pages={data.topPages}
                pageDailyTrends={data.pageDailyTrends}
                propertyFilter={property}
              />
            )}
          </TabsContent>

          <TabsContent value="funnel" className="mt-4">
            {!isLoading && (
              <TrafficFunnel funnelData={data.funnelData} />
            )}
          </TabsContent>

          <TabsContent value="channels" className="mt-4">
            {!isLoading && (
              <TrafficChannels channels={data.channelBreakdown} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
