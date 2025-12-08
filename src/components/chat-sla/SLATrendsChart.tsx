/**
 * SLA Trends Chart Component for Chat SLA Dashboard
 * Line chart showing daily SLA compliance trends over time
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { DailySLATrend } from '@/types/chat-sla';

interface SLATrendsChartProps {
  data: DailySLATrend[] | undefined;
  isLoading: boolean;
}

export default function SLATrendsChart({ data, isLoading }: SLATrendsChartProps) {
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SLA Compliance Trends</CardTitle>
          <CardDescription>No trend data available for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-gray-500">
            No data to display
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart
  const chartData = data.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: day.date,
    complianceRate: day.sla_compliance_rate,
    avgResponseTime: day.avg_response_minutes,
    totalMessages: day.total_messages,
    slaMet: day.sla_met,
    slaBreached: day.sla_breached,
    unanswered: day.unanswered,
    ownerForcedCount: day.owner_forced_count
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>SLA Compliance Trends</CardTitle>
        <CardDescription>
          Daily SLA compliance rate and average response time over the selected period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              yAxisId="left"
              label={{ value: 'SLA Compliance (%)', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: 'Avg Response Time (min)', angle: 90, position: 'insideRight' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-semibold mb-2">{data.fullDate}</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-green-600">
                          SLA Compliance: {data.complianceRate.toFixed(1)}%
                        </p>
                        <p className="text-blue-600">
                          Avg Response: {data.avgResponseTime.toFixed(1)} min
                        </p>
                        <p className="text-gray-600">
                          Total Messages: {data.totalMessages}
                        </p>
                        <p className="text-green-600">
                          Met: {data.slaMet}
                        </p>
                        <p className="text-red-600">
                          Breached: {data.slaBreached}
                        </p>
                        <p className="text-gray-600">
                          Unanswered: {data.unanswered}
                        </p>
                        {data.ownerForcedCount > 0 && (
                          <p className="text-red-600 font-semibold">
                            ⚠️ Owner Forced: {data.ownerForcedCount}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="complianceRate"
              stroke="#10b981"
              strokeWidth={2}
              name="SLA Compliance (%)"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgResponseTime"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Avg Response Time (min)"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Summary statistics below chart */}
        <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Best Day</p>
            <p className="text-lg font-semibold text-green-600">
              {Math.max(...chartData.map(d => d.complianceRate)).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Worst Day</p>
            <p className="text-lg font-semibold text-red-600">
              {Math.min(...chartData.map(d => d.complianceRate)).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Fastest Response</p>
            <p className="text-lg font-semibold text-blue-600">
              {Math.min(...chartData.map(d => d.avgResponseTime)).toFixed(1)} min
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Slowest Response</p>
            <p className="text-lg font-semibold text-orange-600">
              {Math.max(...chartData.map(d => d.avgResponseTime)).toFixed(1)} min
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
