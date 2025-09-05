import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MetaAdsKPIs {
  totalSpend: number;
  metaBookings: number;
  facebookSpend: number;
  instagramSpend: number;
  facebookBookings: number;
  instagramBookings: number;
  facebookImpressions: number;
  instagramImpressions: number;
  facebookClicks: number;
  instagramClicks: number;
}

interface MetaAdsPlatformBreakdownProps {
  data: MetaAdsKPIs;
  isLoading: boolean;
}

const MetaAdsPlatformBreakdown: React.FC<MetaAdsPlatformBreakdownProps> = ({ data, isLoading }) => {
  const formatCurrency = (amount: number): string => {
    return `฿${Math.round(amount).toLocaleString('th-TH')}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString('th-TH');
  };

  const formatPercent = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  // Calculate percentages for split visualization
  const totalSpend = data.facebookSpend + data.instagramSpend;
  const totalBookings = data.facebookBookings + data.instagramBookings;
  const totalImpressions = data.facebookImpressions + data.instagramImpressions;
  const totalClicks = data.facebookClicks + data.instagramClicks;

  const facebookSpendPct = totalSpend > 0 ? (data.facebookSpend / totalSpend) * 100 : 0;
  const instagramSpendPct = totalSpend > 0 ? (data.instagramSpend / totalSpend) * 100 : 0;
  const facebookBookingsPct = totalBookings > 0 ? (data.facebookBookings / totalBookings) * 100 : 0;
  const instagramBookingsPct = totalBookings > 0 ? (data.instagramBookings / totalBookings) * 100 : 0;

  // Calculate CTRs
  const facebookCtr = data.facebookImpressions > 0 ? (data.facebookClicks / data.facebookImpressions) * 100 : 0;
  const instagramCtr = data.instagramImpressions > 0 ? (data.instagramClicks / data.instagramImpressions) * 100 : 0;

  // Calculate cost per booking
  const facebookCostPerBooking = data.facebookBookings > 0 ? data.facebookSpend / data.facebookBookings : 0;
  const instagramCostPerBooking = data.instagramBookings > 0 ? data.instagramSpend / data.instagramBookings : 0;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Platform Breakdown</h2>
        <p className="text-sm text-gray-600">Facebook vs Instagram Performance Comparison</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend Distribution */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              Spend Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Visual bar */}
              <div className="flex rounded-lg overflow-hidden h-6">
                <div 
                  className="bg-blue-500 transition-all duration-300"
                  style={{ width: `${facebookSpendPct}%` }}
                  title={`Facebook: ${formatPercent(facebookSpendPct)}`}
                />
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${instagramSpendPct}%` }}
                  title={`Instagram: ${formatPercent(instagramSpendPct)}`}
                />
              </div>
              
              {/* Platform details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium">Facebook</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">{formatCurrency(data.facebookSpend)}</div>
                  <div className="text-xs text-gray-500">{formatPercent(facebookSpendPct)}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                    <span className="text-sm font-medium">Instagram</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">{formatCurrency(data.instagramSpend)}</div>
                  <div className="text-xs text-gray-500">{formatPercent(instagramSpendPct)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Distribution */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              Booking Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Visual bar */}
              <div className="flex rounded-lg overflow-hidden h-6">
                <div 
                  className="bg-blue-500 transition-all duration-300"
                  style={{ width: `${facebookBookingsPct}%` }}
                  title={`Facebook: ${formatPercent(facebookBookingsPct)}`}
                />
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${instagramBookingsPct}%` }}
                  title={`Instagram: ${formatPercent(instagramBookingsPct)}`}
                />
              </div>
              
              {/* Platform details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium">Facebook</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">{data.facebookBookings}</div>
                  <div className="text-xs text-gray-500">{formatPercent(facebookBookingsPct)}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                    <span className="text-sm font-medium">Instagram</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">{data.instagramBookings}</div>
                  <div className="text-xs text-gray-500">{formatPercent(instagramBookingsPct)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            Detailed Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Metric</th>
                  <th className="text-center py-2">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      Facebook
                    </div>
                  </th>
                  <th className="text-center py-2">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                      Instagram
                    </div>
                  </th>
                  <th className="text-center py-2">Winner</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100">
                  <td className="py-2 font-medium">Impressions</td>
                  <td className="text-center py-2">{formatNumber(data.facebookImpressions)}</td>
                  <td className="text-center py-2">{formatNumber(data.instagramImpressions)}</td>
                  <td className="text-center py-2">
                    {data.facebookImpressions > data.instagramImpressions ? (
                      <Badge variant="outline" className="text-blue-600 border-blue-200">FB</Badge>
                    ) : data.instagramImpressions > data.facebookImpressions ? (
                      <Badge variant="outline" className="text-purple-600 border-purple-200">IG</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-600">Tie</Badge>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 font-medium">Clicks</td>
                  <td className="text-center py-2">{formatNumber(data.facebookClicks)}</td>
                  <td className="text-center py-2">{formatNumber(data.instagramClicks)}</td>
                  <td className="text-center py-2">
                    {data.facebookClicks > data.instagramClicks ? (
                      <Badge variant="outline" className="text-blue-600 border-blue-200">FB</Badge>
                    ) : data.instagramClicks > data.facebookClicks ? (
                      <Badge variant="outline" className="text-purple-600 border-purple-200">IG</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-600">Tie</Badge>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 font-medium">CTR</td>
                  <td className="text-center py-2">{formatPercent(facebookCtr)}</td>
                  <td className="text-center py-2">{formatPercent(instagramCtr)}</td>
                  <td className="text-center py-2">
                    {facebookCtr > instagramCtr ? (
                      <Badge variant="outline" className="text-blue-600 border-blue-200">FB</Badge>
                    ) : instagramCtr > facebookCtr ? (
                      <Badge variant="outline" className="text-purple-600 border-purple-200">IG</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-600">Tie</Badge>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 font-medium">Cost per Booking</td>
                  <td className="text-center py-2">{formatCurrency(facebookCostPerBooking)}</td>
                  <td className="text-center py-2">{formatCurrency(instagramCostPerBooking)}</td>
                  <td className="text-center py-2">
                    {facebookCostPerBooking > 0 && instagramCostPerBooking > 0 ? (
                      facebookCostPerBooking < instagramCostPerBooking ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">FB</Badge>
                      ) : instagramCostPerBooking < facebookCostPerBooking ? (
                        <Badge variant="outline" className="text-purple-600 border-purple-200">IG</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600">Tie</Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="text-gray-400">N/A</Badge>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetaAdsPlatformBreakdown;