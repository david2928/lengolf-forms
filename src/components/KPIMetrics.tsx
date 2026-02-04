'use client';

import { Phone, Calendar, Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OBSalesStats {
  calls: {
    today: number;
    weekAvg: number;
  };
  bookings: {
    today: number;
    weekAvg: number;
  };
  sales: {
    today: number;
    weekAvg: number;
  };
}

interface KPIMetricsProps {
  stats: OBSalesStats;
}

// Format currency for display
const formatCurrency = (amount: number): string => {
  if (amount >= 1000) {
    return `฿${(amount / 1000).toFixed(1)}k`;
  }
  return `฿${Math.round(amount)}`;
};

export function KPIMetrics({ stats }: KPIMetricsProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium text-muted-foreground">
          OB Sales Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        {/* OB Calls */}
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
          <Phone className="h-4 w-4 text-blue-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-blue-800">{stats.calls.today}</div>
          <div className="text-xs text-blue-600 font-medium">Calls Today</div>
          <div className="text-xs text-muted-foreground mt-1">
            Avg: {stats.calls.weekAvg}/day
          </div>
        </div>

        {/* Bookings Made */}
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
          <Calendar className="h-4 w-4 text-green-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-green-800">{stats.bookings.today}</div>
          <div className="text-xs text-green-600 font-medium">Bookings Today</div>
          <div className="text-xs text-muted-foreground mt-1">
            Avg: {stats.bookings.weekAvg}/day
          </div>
        </div>

        {/* Sales Value */}
        <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-100">
          <Banknote className="h-4 w-4 text-purple-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-purple-800">{formatCurrency(stats.sales.today)}</div>
          <div className="text-xs text-purple-600 font-medium">Sales Today</div>
          <div className="text-xs text-muted-foreground mt-1">
            Avg: {formatCurrency(stats.sales.weekAvg)}/day
          </div>
        </div>
      </CardContent>
    </Card>
  );
}