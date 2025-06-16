'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  RefreshCw,
  Building,
  DollarSign,
  UserCheck,
  BarChart3,
  Calendar,
  CheckCircle,
  Filter
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Legend } from 'recharts';

interface LeadResponse {
  b2c: {
    group_sizes: Record<string, number>;
    total_legitimate: number;
  };
  b2b: {
    expected_attendees: Record<string, number>;
    budget_ranges: Record<string, number>;
    total_legitimate: number;
  };
}

interface MetaLeadsData {
  overview: {
    total_leads: number;
    spam_leads: number;
    legitimate_leads: number;
    spam_percentage: number;
    avg_spam_score: number;
    earliest_lead: string;
    latest_lead: string;
    focus: string;
    period: string;
    period_label: string;
  };
  breakdown: Array<{
    lead_type: string;
    form_type: string;
    total: number;
    spam: number;
    legitimate: number;
    spam_percentage: number;
    avg_spam_score: number;
  }>;
  weeklyTrends: Array<{
    week: string;
    total: number;
    spam: number;
    legitimate: number;
    b2b_total: number;
    b2b_legitimate: number;
    b2c_total: number;
    b2c_legitimate: number;
    spam_percentage: number;
  }>;
  legitimateLeads: Array<{
    id: string;
    lead_type: string;
    form_type: string;
    full_name: string;
    email: string;
    phone_number: string;
    company_name?: string;
    group_size?: string;
    expected_attendees?: string;
    budget_per_person?: string;
    meta_submitted_at: string;
  }>;
  leadResponses: LeadResponse;
}

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all', label: 'All Time' }
];

export default function MetaLeadsPage() {
  const [data, setData] = useState<MetaLeadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  const fetchData = async (period: string = 'all') => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/meta-leads/analytics?period=${period}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }
      
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching meta leads data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedPeriod);
  }, [selectedPeriod]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Error: {error}</span>
            </div>
            <Button onClick={() => fetchData(selectedPeriod)} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const formatGroupSize = (size: string) => {
    switch(size) {
      case '5_or_more': return '5+ People';
      default: return `${size} ${size === '1' ? 'Person' : 'People'}`;
    }
  };

  const formatBudget = (budget: string) => {
    return budget.replace(/_/g, ' ').replace('thb', 'THB').toUpperCase();
  };

  const formatAttendees = (attendees: string) => {
    return attendees.replace('-', ' to ') + ' people';
  };

  // Add dummy data points if only one week exists for better chart visualization
  const enhancedTrendData = [...data.weeklyTrends];
  if (enhancedTrendData.length === 1) {
    const currentWeek = new Date(enhancedTrendData[0].week);
    const prevWeek = new Date(currentWeek);
    prevWeek.setDate(prevWeek.getDate() - 7);
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    enhancedTrendData.unshift({
      week: prevWeek.toISOString().split('T')[0],
      total: 0,
      spam: 0,
      legitimate: 0,
      b2b_total: 0,
      b2b_legitimate: 0,
      b2c_total: 0,
      b2c_legitimate: 0,
      spam_percentage: 0
    });
    
    enhancedTrendData.push({
      week: nextWeek.toISOString().split('T')[0],
      total: 0,
      spam: 0,
      legitimate: 0,
      b2b_total: 0,
      b2b_legitimate: 0,
      b2c_total: 0,
      b2c_legitimate: 0,
      spam_percentage: 0
    });
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meta Leads Analytics</h1>
          <p className="text-gray-600 mt-1">{data.overview.focus} - {data.overview.period_label}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => fetchData(selectedPeriod)} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 opacity-80" />
              <div>
                <p className="text-blue-100 text-sm">Total Leads</p>
                <p className="text-2xl font-bold">{data.overview.total_leads.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="h-8 w-8 opacity-80" />
              <div>
                <p className="text-green-100 text-sm">Legitimate Leads</p>
                <p className="text-2xl font-bold">{data.overview.legitimate_leads.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 opacity-80" />
              <div>
                <p className="text-red-100 text-sm">Spam Percentage</p>
                <p className="text-2xl font-bold">{data.overview.spam_percentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-8 w-8 opacity-80" />
              <div>
                <p className="text-purple-100 text-sm">Avg Spam Score</p>
                <p className="text-2xl font-bold">{data.overview.avg_spam_score}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Forms Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.breakdown.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{item.form_type}</h3>
                  <Badge variant={item.lead_type === 'b2b' ? 'default' : 'secondary'}>
                    {item.lead_type.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Leads:</span>
                    <span className="font-medium">{item.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Legitimate:</span>
                    <span className="font-medium text-green-600">{item.legitimate.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Spam:</span>
                    <span className="font-medium text-red-600">{item.spam.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Spam Rate:</span>
                    <span className={`font-bold ${item.spam_percentage > 50 ? 'text-red-600' : 'text-orange-600'}`}>
                      {item.spam_percentage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Trends: Legitimate Leads & Spam %
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={enhancedTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="week" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'spam_percentage') return [`${value}%`, 'Spam %'];
                  return [value, name];
                }}
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return `Week of ${date.toLocaleDateString()}`;
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="b2c_legitimate" fill="#10b981" name="B2C Legitimate" />
              <Bar yAxisId="left" dataKey="b2b_legitimate" fill="#3b82f6" name="B2B Legitimate" />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="spam_percentage" 
                stroke="#ef4444" 
                strokeWidth={3}
                name="Spam %"
                dot={{ fill: '#ef4444', r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lead Responses Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* B2C Responses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              B2C Lead Responses ({data.leadResponses.b2c.total_legitimate} leads)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <h4 className="font-medium mb-3">Group Sizes:</h4>
              <div className="space-y-2">
                {Object.entries(data.leadResponses.b2c.group_sizes)
                  .sort(([,a], [,b]) => b - a)
                  .map(([size, count]) => (
                    <div key={size} className="flex justify-between items-center">
                      <span className="text-sm">{formatGroupSize(size)}</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="bg-green-200 h-2 rounded"
                          style={{ width: `${Math.max(20, (count / data.leadResponses.b2c.total_legitimate) * 100)}px` }}
                        />
                        <span className="text-sm font-medium w-8">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* B2B Responses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              B2B Lead Responses ({data.leadResponses.b2b.total_legitimate} leads)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">Expected Attendees:</h4>
                <div className="space-y-2">
                  {Object.entries(data.leadResponses.b2b.expected_attendees)
                    .sort(([,a], [,b]) => b - a)
                    .map(([attendees, count]) => (
                      <div key={attendees} className="flex justify-between items-center">
                        <span className="text-sm">{formatAttendees(attendees)}</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="bg-blue-200 h-2 rounded"
                            style={{ width: `${Math.max(20, (count / data.leadResponses.b2b.total_legitimate) * 100)}px` }}
                          />
                          <span className="text-sm font-medium w-8">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Budget Ranges:</h4>
                <div className="space-y-2">
                  {Object.entries(data.leadResponses.b2b.budget_ranges)
                    .sort(([,a], [,b]) => b - a)
                    .map(([budget, count]) => (
                      <div key={budget} className="flex justify-between items-center">
                        <span className="text-sm">{formatBudget(budget)}</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="bg-purple-200 h-2 rounded"
                            style={{ width: `${Math.max(20, (count / data.leadResponses.b2b.total_legitimate) * 100)}px` }}
                          />
                          <span className="text-sm font-medium w-8">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Legitimate Leads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Recent Legitimate Leads ({data.legitimateLeads.length} shown)
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </CardTitle>
        </CardHeader>
        {showDetails && (
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Phone</th>
                    <th className="text-left p-2">Details</th>
                    <th className="text-left p-2">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.legitimateLeads.slice(0, 15).map((lead) => (
                    <tr key={lead.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{lead.full_name}</td>
                      <td className="p-2">
                        <Badge variant={lead.lead_type === 'b2b' ? 'default' : 'secondary'}>
                          {lead.lead_type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-2 text-blue-600">{lead.email}</td>
                      <td className="p-2">{lead.phone_number}</td>
                      <td className="p-2">
                        {lead.lead_type === 'b2b' ? (
                          <div className="text-xs">
                            {lead.company_name && <div>🏢 {lead.company_name}</div>}
                            {lead.expected_attendees && <div>👥 {formatAttendees(lead.expected_attendees)}</div>}
                            {lead.budget_per_person && <div>💰 {formatBudget(lead.budget_per_person)}</div>}
                          </div>
                        ) : (
                          <div className="text-xs">
                            {lead.group_size && <div>👥 {formatGroupSize(lead.group_size)}</div>}
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-gray-500">
                        {formatDistanceToNow(new Date(lead.meta_submitted_at), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
} 