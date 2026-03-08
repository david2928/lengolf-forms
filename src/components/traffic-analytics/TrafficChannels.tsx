'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ChannelBreakdownItem } from '@/hooks/useTrafficAnalytics';

interface TrafficChannelsProps {
  channels: ChannelBreakdownItem[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const formatNumber = (num: number) => num.toLocaleString();

const TrafficChannels: React.FC<TrafficChannelsProps> = ({ channels }) => {
  if (!channels || channels.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-gray-500">
          No channel data available for the selected period.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Performance</CardTitle>
        <p className="text-xs text-gray-500">
          Channel data is aggregated across all web properties (no property filter applied).
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {channels.map((channel, index) => (
            <div key={channel.channel} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <h3 className="font-semibold text-lg">{channel.channel}</h3>
                </div>
                <Badge variant="outline">
                  {channel.conversionRate.toFixed(2)}% conv.
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-lg">{formatNumber(channel.sessions)}</div>
                  <div className="text-gray-600">Sessions</div>
                  <div className="flex items-center gap-1 mt-1">
                    {channel.sessionsChange > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : channel.sessionsChange < 0 ? (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    ) : null}
                    <span className={`text-xs ${channel.sessionsChange > 0 ? 'text-green-600' : channel.sessionsChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {channel.sessionsChange > 0 ? '+' : ''}{channel.sessionsChange.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-lg">{formatNumber(channel.users)}</div>
                  <div className="text-gray-600">Users</div>
                </div>

                <div>
                  <div className="font-semibold text-lg">{channel.conversions}</div>
                  <div className="text-gray-600">Conversions</div>
                </div>

                <div>
                  <div className="font-semibold text-lg">{channel.conversionRate.toFixed(2)}%</div>
                  <div className="text-gray-600">Conv. Rate</div>
                  <div className="flex items-center gap-1 mt-1">
                    {channel.conversionRateChange > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : channel.conversionRateChange < 0 ? (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    ) : null}
                    <span className={`text-xs ${channel.conversionRateChange > 0 ? 'text-green-600' : channel.conversionRateChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {channel.conversionRateChange > 0 ? '+' : ''}{channel.conversionRateChange.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrafficChannels;
