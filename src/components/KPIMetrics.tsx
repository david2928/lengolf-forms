'use client';

import { Clock, Target, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface KPIMetricsProps {
  stats: {
    speedToLead: string;
    weekAverage: string;
    monthAverage: string;
    obCalls: number;
    obSales: number;
    leadSales: number;
    leadContacts: number;
  };
  activeTab: 'new-leads' | 'ob-sales';
}

export function KPIMetrics({ stats, activeTab }: KPIMetricsProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium text-muted-foreground">
          {activeTab === 'new-leads' ? "Customer Response Performance" : "OB Sales Performance"}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-secondary rounded-lg">
          <Clock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <div className="text-2xl font-bold">{stats.speedToLead}</div>
          <div className="text-xs text-muted-foreground">
            {activeTab === 'new-leads' ? 'Today Speed' : 'Speed'}
          </div>
        </div>
        
        <div className="text-center p-3 bg-secondary rounded-lg">
          <Clock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <div className="text-2xl font-bold">{stats.weekAverage}</div>
          <div className="text-xs text-muted-foreground">Week Avg</div>
        </div>
        
        <div className="text-center p-3 bg-secondary rounded-lg">
          <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <div className="text-2xl font-bold">
            {activeTab === 'new-leads' ? stats.leadContacts : stats.obCalls}
          </div>
          <div className="text-xs text-muted-foreground">
            {activeTab === 'new-leads' ? 'Lead Contacts (All Time)' : 'OB Calls (Week)'}
          </div>
        </div>
        
        <div className="text-center p-3 bg-secondary rounded-lg">
          <Target className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <div className="text-2xl font-bold">
            {activeTab === 'new-leads' ? stats.leadSales : stats.obSales}
          </div>
          <div className="text-xs text-muted-foreground">
            {activeTab === 'new-leads' ? 'Lead Sales (All Time)' : 'OB Sales (Week)'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}