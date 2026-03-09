'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, ArrowUpDown, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TopPage, PageDailyTrendItem } from '@/hooks/useTrafficAnalytics';

interface TrafficTopPagesProps {
  pages: TopPage[];
  pageDailyTrends: Record<string, PageDailyTrendItem[]>;
  propertyFilter: string;
}

type SortKey = 'pageViews' | 'uniquePageViews' | 'bounceRate' | 'bookingConversions';

const formatNumber = (num: number) => num.toLocaleString();

const PROPERTY_COLORS: Record<string, string> = {
  www: 'bg-blue-100 text-blue-800',
  booking: 'bg-green-100 text-green-800',
  liff: 'bg-purple-100 text-purple-800',
  unknown: 'bg-gray-100 text-gray-800',
};

const PROPERTY_LABELS: Record<string, string> = {
  www: 'Website',
  booking: 'Booking',
  liff: 'LIFF',
  unknown: 'Other',
};

function truncatePath(path: string, maxLen: number = 60): string {
  try {
    const url = new URL(path);
    const display = url.hostname + url.pathname;
    return display.length > maxLen ? display.slice(0, maxLen) + '...' : display;
  } catch {
    return path.length > maxLen ? path.slice(0, maxLen) + '...' : path;
  }
}

const TrafficTopPages: React.FC<TrafficTopPagesProps> = ({ pages, pageDailyTrends, propertyFilter }) => {
  const [sortKey, setSortKey] = useState<SortKey>('pageViews');
  const [sortAsc, setSortAsc] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  const sortedPages = useMemo(() => {
    return [...pages].sort((a, b) => {
      const diff = sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey];
      return diff;
    });
  }, [pages, sortKey, sortAsc]);

  // Group by section for www property
  const groupedPages = useMemo(() => {
    if (propertyFilter !== 'www') return null;

    const groups = new Map<string, TopPage[]>();
    sortedPages.forEach(page => {
      const section = page.section;
      if (!groups.has(section)) {
        groups.set(section, []);
      }
      groups.get(section)!.push(page);
    });

    return Array.from(groups.entries())
      .sort((a, b) => {
        const totalA = a[1].reduce((sum, p) => sum + p.pageViews, 0);
        const totalB = b[1].reduce((sum, p) => sum + p.pageViews, 0);
        return totalB - totalA;
      });
  }, [sortedPages, propertyFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const togglePageTrend = (path: string) => {
    setExpandedPage(prev => prev === path ? null : path);
  };

  const SortButton = ({ label, sortField }: { label: string; sortField: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium text-xs text-gray-600 hover:text-gray-900"
      onClick={() => handleSort(sortField)}
    >
      {label}
      <ArrowUpDown className="h-3 w-3 ml-1" />
    </Button>
  );

  const PageTrendChart = ({ path }: { path: string }) => {
    const trends = pageDailyTrends[path];
    if (!trends || trends.length === 0) {
      return <p className="text-xs text-gray-400 py-2">No daily data available for this page.</p>;
    }
    const formatted = trends.map(t => ({ date: t.date.slice(5), pageViews: t.pageViews }));
    return (
      <div className="mt-2 border-t pt-2">
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip formatter={(value: number) => value.toLocaleString()} />
            <Line type="monotone" dataKey="pageViews" stroke="#3B82F6" strokeWidth={1.5} dot={false} name="Views" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const PageRow = ({ page, index }: { page: TopPage; index: number }) => {
    const isExpanded = expandedPage === page.path;
    return (
      <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={`text-xs ${PROPERTY_COLORS[page.property]}`}>
                {PROPERTY_LABELS[page.property]}
              </Badge>
              <span className="text-sm font-medium truncate">{page.title || 'Untitled'}</span>
            </div>
            <p className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded truncate">
              {truncatePath(page.path)}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => togglePageTrend(page.path)}
              title="Show page trend"
            >
              <BarChart3 className="h-3.5 w-3.5 text-gray-400" />
            </Button>
            <Badge variant="outline">#{index + 1}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-2">
          <div>
            <div className="font-semibold">{formatNumber(page.pageViews)}</div>
            <div className="text-xs text-gray-600">Views</div>
          </div>
          <div>
            <div className="font-semibold">{formatNumber(page.uniquePageViews)}</div>
            <div className="text-xs text-gray-600">Unique</div>
          </div>
          <div>
            <div className="font-semibold">{page.bounceRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-600">Bounce</div>
          </div>
          <div>
            <div className="font-semibold">{formatNumber(page.bookingConversions)}</div>
            <div className="text-xs text-gray-600">Conversions</div>
          </div>
        </div>
        {isExpanded && <PageTrendChart path={page.path} />}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Top Pages</CardTitle>
          <div className="flex items-center gap-3">
            <SortButton label="Views" sortField="pageViews" />
            <SortButton label="Bounce" sortField="bounceRate" />
            <SortButton label="Conv." sortField="bookingConversions" />
          </div>
        </div>
        {propertyFilter === 'all' && (
          <p className="text-xs text-gray-500 mt-1">
            Page data is filtered by property. Traffic KPIs and funnel data show all properties combined.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {pages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No page data available for the selected filters.
          </div>
        ) : groupedPages ? (
          <div className="space-y-4">
            {groupedPages.map(([section, sectionPages]) => {
              const isCollapsed = collapsedSections.has(section);
              const totalViews = sectionPages.reduce((sum, p) => sum + p.pageViews, 0);
              return (
                <div key={section}>
                  <button
                    onClick={() => toggleSection(section)}
                    className="flex items-center gap-2 w-full text-left py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className="font-semibold text-sm">{section}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {sectionPages.length} pages &middot; {formatNumber(totalViews)} views
                    </Badge>
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-2 mt-2 ml-2">
                      {sectionPages.map((page, idx) => (
                        <PageRow key={page.path} page={page} index={idx} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedPages.map((page, idx) => (
              <PageRow key={page.path} page={page} index={idx} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrafficTopPages;
