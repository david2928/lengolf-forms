'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Smartphone, Tablet, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { DailyTrendItem, DeviceBreakdownItem, ChannelBreakdownItem, TopPage, PageDailyTrendItem } from '@/hooks/useTrafficAnalytics';

interface TrafficOverviewProps {
  dailyTrends: DailyTrendItem[];
  deviceBreakdown: DeviceBreakdownItem[];
  channelBreakdown: ChannelBreakdownItem[];
  topPages: TopPage[];
  pageDailyTrends: Record<string, PageDailyTrendItem[]>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const DEVICE_ICONS: Record<string, React.ElementType> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

const formatNumber = (num: number) => num.toLocaleString();

const formatAxisNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

type Granularity = 'daily' | 'weekly' | 'monthly';

function getISOWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

interface TrendPoint {
  date: string;
  sessions: number;
  users: number;
  conversions: number;
  conversionRate: number;
}

function aggregateOverallTrends(dailyTrends: DailyTrendItem[], granularity: Granularity): TrendPoint[] {
  if (granularity === 'daily') {
    return dailyTrends.map(item => ({ ...item, date: item.date.slice(5) }));
  }

  const buckets = new Map<string, { sessions: number; users: number; conversions: number; dayCount: number; label: string }>();
  dailyTrends.forEach(item => {
    const key = granularity === 'weekly' ? getWeekKey(item.date) : getMonthKey(item.date);
    const label = granularity === 'weekly' ? getISOWeekLabel(item.date) : getMonthLabel(item.date);
    if (!buckets.has(key)) buckets.set(key, { sessions: 0, users: 0, conversions: 0, dayCount: 0, label });
    const b = buckets.get(key)!;
    b.sessions += item.sessions;
    b.users += item.users;
    b.conversions += item.conversions;
    b.dayCount += 1;
  });

  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, data]) => ({
      date: data.label,
      sessions: data.sessions,
      users: data.dayCount > 0 ? Math.round(data.users / data.dayCount) : 0,
      conversions: data.conversions,
      conversionRate: data.sessions > 0 ? Number((data.conversions / data.sessions * 100).toFixed(2)) : 0,
    }));
}

interface PageTrendPoint {
  date: string;
  pageViews: number;
  uniquePageViews: number;
  entrances: number;
  conversions: number;
}

function aggregatePageTrends(pageTrends: PageDailyTrendItem[], granularity: Granularity): PageTrendPoint[] {
  if (granularity === 'daily') {
    return pageTrends.map(item => ({ ...item, date: item.date.slice(5) }));
  }

  const buckets = new Map<string, { pageViews: number; uniquePageViews: number; entrances: number; conversions: number; label: string }>();
  pageTrends.forEach(item => {
    const key = granularity === 'weekly' ? getWeekKey(item.date) : getMonthKey(item.date);
    const label = granularity === 'weekly' ? getISOWeekLabel(item.date) : getMonthLabel(item.date);
    if (!buckets.has(key)) buckets.set(key, { pageViews: 0, uniquePageViews: 0, entrances: 0, conversions: 0, label });
    const b = buckets.get(key)!;
    b.pageViews += item.pageViews;
    b.uniquePageViews += item.uniquePageViews;
    b.entrances += item.entrances;
    b.conversions += item.conversions;
  });

  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, data]) => ({
      date: data.label,
      pageViews: data.pageViews,
      uniquePageViews: data.uniquePageViews,
      entrances: data.entrances,
      conversions: data.conversions,
    }));
}

function shortPageLabel(path: string, maxLen = 40): string {
  try {
    const url = new URL(path);
    const p = url.pathname;
    return p.length > maxLen ? p.slice(0, maxLen) + '...' : p || '/';
  } catch {
    return path.length > maxLen ? path.slice(0, maxLen) + '...' : path;
  }
}

const TrafficOverview: React.FC<TrafficOverviewProps> = ({ dailyTrends, deviceBreakdown, channelBreakdown, topPages, pageDailyTrends }) => {
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [pageSearch, setPageSearch] = useState('');
  const [showPageSearch, setShowPageSearch] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPageSearch(false);
      }
    };
    if (showPageSearch) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPageSearch]);

  const overallTrends = useMemo(() => aggregateOverallTrends(dailyTrends, granularity), [dailyTrends, granularity]);

  const pageTrends = useMemo(() => {
    if (!selectedPage || !pageDailyTrends[selectedPage]) return null;
    return aggregatePageTrends(pageDailyTrends[selectedPage], granularity);
  }, [selectedPage, pageDailyTrends, granularity]);

  const filteredPages = useMemo(() => {
    if (!pageSearch) return topPages.slice(0, 10);
    const q = pageSearch.toLowerCase();
    return topPages.filter(p => p.path.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)).slice(0, 10);
  }, [topPages, pageSearch]);

  const selectPage = (path: string) => {
    setSelectedPage(path);
    setShowPageSearch(false);
    setPageSearch('');
  };

  const clearPage = () => {
    setSelectedPage(null);
    setPageSearch('');
  };

  const topChannels = channelBreakdown.slice(0, 6).map(ch => ({
    name: ch.channel.length > 12 ? ch.channel.slice(0, 12) + '...' : ch.channel,
    sessions: ch.sessions,
    conversions: ch.conversions,
  }));

  const granularityLabel = granularity === 'daily' ? 'Daily' : granularity === 'weekly' ? 'Weekly' : 'Monthly';
  const isPageMode = selectedPage && pageTrends;

  return (
    <div className="space-y-6">
      {/* Trends Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle>
              {isPageMode
                ? `${granularityLabel} Page Trends`
                : `${granularityLabel} Traffic Trends`
              }
            </CardTitle>
            {isPageMode && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs font-mono max-w-[300px] truncate">
                  {shortPageLabel(selectedPage, 50)}
                </Badge>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={clearPage}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Page filter */}
            <div className="relative" ref={dropdownRef}>
              <Button
                variant={showPageSearch ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => setShowPageSearch(!showPageSearch)}
              >
                <Search className="h-3 w-3 mr-1" />
                {selectedPage ? 'Change' : 'Filter page'}
              </Button>
              {showPageSearch && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white border rounded-lg shadow-lg z-50 p-2 space-y-1">
                  <Input
                    placeholder="Search pages..."
                    value={pageSearch}
                    onChange={(e) => setPageSearch(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  {selectedPage && (
                    <button
                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded"
                      onClick={clearPage}
                    >
                      Clear filter — show all traffic
                    </button>
                  )}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredPages.map(page => (
                      <button
                        key={page.path}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 rounded flex items-center justify-between ${selectedPage === page.path ? 'bg-blue-50' : ''}`}
                        onClick={() => selectPage(page.path)}
                      >
                        <span className="truncate flex-1">{page.title || shortPageLabel(page.path)}</span>
                        <span className="text-gray-400 ml-2 shrink-0">{formatNumber(page.pageViews)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Granularity */}
            <div className="flex gap-1">
              {(['daily', 'weekly', 'monthly'] as Granularity[]).map(g => (
                <Button
                  key={g}
                  variant={granularity === g ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => setGranularity(g)}
                >
                  {g === 'daily' ? 'D' : g === 'weekly' ? 'W' : 'M'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isPageMode ? (
            /* Page-level chart: Views + Unique Views (left axis) + Conversions (right axis) */
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pageTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis yAxisId="left" fontSize={12} tickFormatter={(v: number) => formatAxisNumber(v)} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={(v: number) => formatAxisNumber(v)} />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="pageViews" stroke={COLORS[0]} strokeWidth={2} name="Page Views" dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="uniquePageViews" stroke={COLORS[1]} strokeWidth={2} name="Unique Views" dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="entrances" stroke={COLORS[2]} strokeWidth={1.5} name="Entrances" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="conversions" stroke={COLORS[3]} strokeWidth={2} name="Conversions" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <>
              {/* Overall chart: Sessions (left) + Conversions (right) */}
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={overallTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis yAxisId="left" fontSize={12} tickFormatter={(v: number) => formatAxisNumber(v)} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={(v: number) => formatAxisNumber(v)} />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="sessions" stroke={COLORS[0]} strokeWidth={2} name="Sessions" dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="conversions" stroke={COLORS[3]} strokeWidth={2} name="Conversions" dot={false} />
                </LineChart>
              </ResponsiveContainer>

              {/* Users chart */}
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">
                  {granularity === 'daily' ? 'Users' : 'Avg. Daily Users'}
                </p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={overallTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={10} tickFormatter={(v: number) => formatAxisNumber(v)} />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Line type="monotone" dataKey="users" stroke={COLORS[1]} strokeWidth={2} name={granularity === 'daily' ? 'Users' : 'Avg. Daily Users'} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                {deviceBreakdown.map((device) => {
                  const Icon = DEVICE_ICONS[device.device] || Monitor;
                  return (
                    <div key={device.device} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-gray-600" />
                        <span className="font-medium capitalize">{device.device}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatNumber(device.sessions)}</div>
                        <div className="text-sm text-gray-600">
                          {device.percentage}% &middot; {device.conversionRate}% conv.
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={deviceBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="sessions"
                    nameKey="device"
                    label={({ device, percentage }) => `${device}: ${percentage}%`}
                  >
                    {deviceBreakdown.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} sessions`} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Channel Summary */}
        {topChannels.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sessions by Channel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topChannels}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Bar dataKey="sessions" fill={COLORS[0]} name="Sessions" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TrafficOverview;
