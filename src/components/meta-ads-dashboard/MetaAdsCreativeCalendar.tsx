import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Video,
  BarChart3,
  Eye,
  MousePointer
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';

interface CreativeCalendarData {
  [date: string]: {
    creatives: {
      creative_id: string;
      creative_name: string;
      creative_type: string;
      thumbnail_url?: string;
      spend: number;
      impressions: number;
      clicks: number;
      bookings: number;
    }[];
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_bookings: number;
  };
}

interface MetaAdsCreativeCalendarProps {
  timeRange: string;
  referenceDate: string;
  isLoading: boolean;
}

const MetaAdsCreativeCalendar: React.FC<MetaAdsCreativeCalendarProps> = ({
  timeRange,
  referenceDate,
  isLoading
}) => {
  const [calendarData, setCalendarData] = useState<CreativeCalendarData>({});
  const [currentMonth, setCurrentMonth] = useState(() => new Date(referenceDate));
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchCalendarData = async () => {
    try {
      setIsLoadingCalendar(true);
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const response = await fetch(`/api/meta-ads/calendar?startDate=${monthStart.toISOString().split('T')[0]}&endDate=${monthEnd.toISOString().split('T')[0]}`);
      
      if (!response.ok) {
        throw new Error(`Calendar data fetch failed: ${response.status}`);
      }
      
      const data = await response.json();
      setCalendarData(data);
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      fetchCalendarData();
    }
  }, [currentMonth, isLoading]);

  const formatCurrency = (amount: number): string => {
    return `฿${Math.round(amount).toLocaleString('th-TH')}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getCreativeTypeIcon = (type: string, size = 'h-3 w-3') => {
    const typeIcons = {
      'IMAGE': ImageIcon,
      'VIDEO': Video,
      'CAROUSEL': ImageIcon,
      'TEXT': BarChart3
    };
    
    const Icon = typeIcons[type as keyof typeof typeIcons] || BarChart3;
    return <Icon className={size} />;
  };

  const getPerformanceColor = (spend: number, maxSpend: number) => {
    const intensity = maxSpend > 0 ? spend / maxSpend : 0;
    
    if (intensity === 0) return 'bg-gray-50';
    if (intensity <= 0.2) return 'bg-blue-100';
    if (intensity <= 0.4) return 'bg-blue-200';
    if (intensity <= 0.6) return 'bg-blue-300';
    if (intensity <= 0.8) return 'bg-blue-400';
    return 'bg-blue-500';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
    setSelectedDate(null);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Calculate max spend for color intensity
  const maxDailySpend = Math.max(
    ...Object.values(calendarData).map(day => day.total_spend),
    1
  );

  const getDayData = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarData[dateStr];
  };

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
  };

  if (isLoading || isLoadingCalendar) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Creative Performance Calendar
          </CardTitle>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-lg font-semibold min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((date) => {
              const dayData = getDayData(date);
              const dateStr = format(date, 'yyyy-MM-dd');
              const isSelected = selectedDate === dateStr;
              const hasData = dayData && dayData.creatives.length > 0;
              
              return (
                <div
                  key={dateStr}
                  className={`
                    min-h-[80px] border rounded-lg p-2 cursor-pointer transition-all hover:shadow-md
                    ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                    ${hasData ? getPerformanceColor(dayData.total_spend, maxDailySpend) : 'bg-gray-50'}
                    ${!isSameMonth(date, currentMonth) ? 'opacity-50' : ''}
                  `}
                  onClick={() => handleDateClick(date)}
                >
                  <div className="text-xs font-medium text-gray-900 mb-1">
                    {format(date, 'd')}
                  </div>
                  
                  {hasData && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-900">
                        {formatCurrency(dayData.total_spend)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Eye className="h-3 w-3" />
                        {formatNumber(dayData.total_impressions)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <MousePointer className="h-3 w-3" />
                        {formatNumber(dayData.total_clicks)}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {dayData.creatives.slice(0, 3).map((creative) => (
                          <div key={creative.creative_id} className="text-xs">
                            {getCreativeTypeIcon(creative.creative_type)}
                          </div>
                        ))}
                        {dayData.creatives.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{dayData.creatives.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && calendarData[selectedDate] && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {format(new Date(selectedDate), 'MMMM d, yyyy')}
              </CardTitle>
              <div className="flex gap-4 text-sm text-gray-600">
                <span>{formatCurrency(calendarData[selectedDate].total_spend)} spent</span>
                <span>•</span>
                <span>{calendarData[selectedDate].total_bookings} bookings</span>
                <span>•</span>
                <span>{calendarData[selectedDate].creatives.length} creatives active</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {calendarData[selectedDate].creatives.map((creative) => (
                  <div
                    key={creative.creative_id}
                    className="bg-white border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      {getCreativeTypeIcon(creative.creative_type, 'h-4 w-4')}
                      <span className="text-sm font-medium truncate">
                        {creative.creative_name}
                      </span>
                    </div>
                    
                    {creative.thumbnail_url && (
                      <div className="aspect-video bg-gray-100 rounded overflow-hidden">
                        <img
                          src={creative.thumbnail_url}
                          alt={creative.creative_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="font-medium">{formatCurrency(creative.spend)}</div>
                        <div className="text-gray-500">Spend</div>
                      </div>
                      <div>
                        <div className="font-medium">{creative.bookings}</div>
                        <div className="text-gray-500">Bookings</div>
                      </div>
                      <div>
                        <div className="font-medium">{formatNumber(creative.impressions)}</div>
                        <div className="text-gray-500">Impressions</div>
                      </div>
                      <div>
                        <div className="font-medium">{formatNumber(creative.clicks)}</div>
                        <div className="text-gray-500">Clicks</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-600 pt-4 border-t">
          <span>Performance intensity:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-50 border rounded"></div>
            <span>No activity</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-200 border rounded"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-400 border rounded"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-500 border rounded"></div>
            <span>High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetaAdsCreativeCalendar;