'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight } from 'lucide-react';
import { FunnelDataItem } from '@/hooks/useTrafficAnalytics';

interface TrafficFunnelProps {
  funnelData: FunnelDataItem[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const formatNumber = (num: number) => num.toLocaleString();

const TrafficFunnel: React.FC<TrafficFunnelProps> = ({ funnelData }) => {
  const [selectedChannel, setSelectedChannel] = useState<string>('all');

  const filteredFunnelData = useMemo(() => {
    if (!funnelData || funnelData.length === 0) return [];
    if (selectedChannel === 'all') {
      const totals = funnelData.reduce((acc, item) => ({
        stage1Users: acc.stage1Users + item.stage1Users,
        stage2Users: acc.stage2Users + item.stage2Users,
        stage3Users: acc.stage3Users + item.stage3Users,
        stage4Users: acc.stage4Users + item.stage4Users,
        stage5Users: acc.stage5Users + item.stage5Users,
        stage6Users: acc.stage6Users + item.stage6Users,
      }), { stage1Users: 0, stage2Users: 0, stage3Users: 0, stage4Users: 0, stage5Users: 0, stage6Users: 0 });

      return [{
        channel: 'All Channels',
        ...totals,
        overallConversionRate: totals.stage1Users > 0 ? (totals.stage6Users / totals.stage1Users * 100) : 0,
      }];
    }
    return funnelData.filter(item => item.channel === selectedChannel);
  }, [funnelData, selectedChannel]);

  const funnelStages = useMemo(() => {
    if (!filteredFunnelData[0]) return [];
    const funnel = filteredFunnelData[0];
    return [
      { name: 'Landing Page', value: funnel.stage1Users, fill: COLORS[0] },
      { name: 'Book Now Click', value: funnel.stage2Users, fill: COLORS[1] },
      { name: 'Booking Page', value: funnel.stage3Users, fill: COLORS[2] },
      { name: 'Form Start', value: funnel.stage4Users, fill: COLORS[3] },
      { name: 'Login/Register', value: funnel.stage5Users, fill: COLORS[4] },
      { name: 'Confirmation', value: funnel.stage6Users, fill: COLORS[5] },
    ];
  }, [filteredFunnelData]);

  // Find biggest drop-off
  const biggestDropOff = useMemo(() => {
    let maxDropOff = 0;
    let maxDropOffStage = '';
    funnelStages.forEach((stage, index) => {
      if (index < funnelStages.length - 1) {
        const nextStage = funnelStages[index + 1];
        const dropOff = stage.value > 0 ? ((stage.value - nextStage.value) / stage.value * 100) : 0;
        if (dropOff > maxDropOff) {
          maxDropOff = dropOff;
          maxDropOffStage = `${stage.name} \u2192 ${nextStage.name}`;
        }
      }
    });
    return { rate: maxDropOff, stage: maxDropOffStage };
  }, [funnelStages]);

  if (!funnelData || funnelData.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-gray-500">
          No funnel data available for the selected period.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Booking Funnel Analysis</CardTitle>
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              {funnelData.map((item) => (
                <SelectItem key={item.channel} value={item.channel}>
                  {item.channel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filteredFunnelData[0] && (
            <div className="space-y-6">
              {/* Funnel Visualization */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {funnelStages.map((stage, index) => {
                  const nextStage = funnelStages[index + 1];
                  const dropOffRate = nextStage && stage.value > 0 ?
                    ((stage.value - nextStage.value) / stage.value * 100) : 0;

                  return (
                    <div key={stage.name} className="relative">
                      <div className="bg-white border rounded-lg p-3 text-center">
                        <div className="text-xs font-medium text-gray-600 mb-2">
                          {stage.name}
                        </div>
                        <div className="text-xl font-bold mb-1" style={{ color: stage.fill }}>
                          {formatNumber(stage.value)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {funnelStages[0].value > 0 ? ((stage.value / funnelStages[0].value) * 100).toFixed(1) : 0}%
                        </div>
                      </div>

                      {index < funnelStages.length - 1 && (
                        <div className="hidden lg:block absolute top-1/2 -right-1 transform -translate-y-1/2 z-10">
                          <div className="bg-white border rounded-full p-1">
                            <ArrowRight className="h-3 w-3 text-gray-400" />
                          </div>
                          {dropOffRate > 0 && (
                            <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2">
                              <div className="text-xs text-red-600 font-medium whitespace-nowrap">
                                -{dropOffRate.toFixed(1)}%
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Funnel Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Overall Conversion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {filteredFunnelData[0].overallConversionRate.toFixed(2)}%
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Landing to Confirmation</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Biggest Drop-off</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">
                      {biggestDropOff.rate.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{biggestDropOff.stage}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Form Completion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {filteredFunnelData[0].stage4Users > 0
                        ? ((filteredFunnelData[0].stage6Users / filteredFunnelData[0].stage4Users) * 100).toFixed(1)
                        : 0}%
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Form Start to Confirmation</p>
                  </CardContent>
                </Card>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Funnel data is aggregated across all web properties (no property filter applied).
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrafficFunnel;
