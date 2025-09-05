import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  TrendingUp, 
  TrendingDown,
  Download,
  BarChart3
} from 'lucide-react';

interface CampaignPerformanceData {
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  objective: string;
  
  spend_current: number;
  spend_previous: number;
  spend_3w_ago: number;
  spend_4w_ago: number;
  spend_5w_ago: number;
  spend_mtd: number;
  spend_last_month: number;
  spend_2_months_ago: number;
  
  impressions_current: number;
  impressions_previous: number;
  impressions_3w_ago: number;
  impressions_4w_ago: number;
  impressions_5w_ago: number;
  impressions_mtd: number;
  impressions_last_month: number;
  impressions_2_months_ago: number;
  
  clicks_current: number;
  clicks_previous: number;
  clicks_3w_ago: number;
  clicks_4w_ago: number;
  clicks_5w_ago: number;
  clicks_mtd: number;
  clicks_last_month: number;
  clicks_2_months_ago: number;
  
  ctr_current: number;
  ctr_previous: number;
  ctr_3w_ago: number;
  ctr_4w_ago: number;
  ctr_5w_ago: number;
  ctr_mtd: number;
  ctr_last_month: number;
  ctr_2_months_ago: number;
  
  cpc_current: number;
  cpc_previous: number;
  cpc_3w_ago: number;
  cpc_4w_ago: number;
  cpc_5w_ago: number;
  cpc_mtd: number;
  cpc_last_month: number;
  cpc_2_months_ago: number;
  
  cpm_current: number;
  cpm_previous: number;
  cpm_3w_ago: number;
  cpm_4w_ago: number;
  cpm_5w_ago: number;
  cpm_mtd: number;
  cpm_last_month: number;
  cpm_2_months_ago: number;
  
  frequency_current: number;
  frequency_previous: number;
  frequency_3w_ago: number;
  frequency_4w_ago: number;
  frequency_5w_ago: number;
  frequency_mtd: number;
  frequency_last_month: number;
  frequency_2_months_ago: number;
  
  leads_current: number;
  leads_previous: number;
  leads_3w_ago: number;
  leads_4w_ago: number;
  leads_5w_ago: number;
  leads_mtd: number;
  leads_last_month: number;
  leads_2_months_ago: number;
  
  cost_per_lead_current: number;
  cost_per_lead_previous: number;
  cost_per_lead_3w_ago: number;
  cost_per_lead_4w_ago: number;
  cost_per_lead_5w_ago: number;
  cost_per_lead_mtd: number;
  cost_per_lead_last_month: number;
  cost_per_lead_2_months_ago: number;
}

interface MetaAdsPerformanceBreakdownTableProps {
  timeRange: string;
  referenceDate: string;
  isLoading: boolean;
}

const MetaAdsPerformanceBreakdownTable: React.FC<MetaAdsPerformanceBreakdownTableProps> = ({
  timeRange,
  referenceDate,
  isLoading
}) => {
  const [campaignData, setCampaignData] = useState<CampaignPerformanceData[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);

  const fetchCampaignData = useCallback(async () => {
    try {
      setIsLoadingTable(true);
      const response = await fetch(`/api/meta-ads/campaigns/detailed-weekly?referenceDate=${referenceDate}&sortBy=spend_current&sortOrder=desc`);
      
      if (!response.ok) {
        throw new Error(`Campaign data fetch failed: ${response.status}`);
      }
      
      const data = await response.json();
      setCampaignData(data.campaigns || []);
    } catch (error) {
      console.error('Failed to fetch detailed campaign data:', error);
    } finally {
      setIsLoadingTable(false);
    }
  }, [referenceDate]);

  useEffect(() => {
    if (!isLoading) {
      fetchCampaignData();
    }
  }, [referenceDate, isLoading, fetchCampaignData]);

  const formatCurrency = (amount: number): string => {
    if (amount === 0) return '฿0';
    return `฿${Math.round(amount).toLocaleString('th-TH')}`;
  };

  const formatNumber = (num: number): string => {
    if (num === 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCTR = (ctr: number): string => {
    if (ctr === 0) return '0%';
    return `${ctr.toFixed(2)}%`;
  };

  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatPercentageChange = (current: number, previous: number): string => {
    const change = calculatePercentageChange(current, previous);
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const getTrendColor = (change: number): string => {
    if (change > 10) return 'text-green-600';
    if (change < -10) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendIcon = (change: number) => {
    if (change > 10) return <TrendingUp className="h-3 w-3" />;
    if (change < -10) return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  // Inverted trend functions for cost metrics (CPC, CPM, Cost per Lead) where lower is better
  const getCostTrendColor = (change: number): string => {
    if (change > 10) return 'text-red-600';   // Higher cost = bad = red
    if (change < -10) return 'text-green-600'; // Lower cost = good = green
    return 'text-gray-600';
  };

  const getCostTrendIcon = (change: number) => {
    if (change > 10) return <TrendingDown className="h-3 w-3" />; // Higher cost = down arrow
    if (change < -10) return <TrendingUp className="h-3 w-3" />;   // Lower cost = up arrow
    return null;
  };

  const getCampaignType = (campaignName: string, objective: string): 'B2C' | 'B2B' | 'Other' => {
    const name = campaignName.toLowerCase();
    if (objective === 'OUTCOME_LEADS' || name.includes('lead')) {
      if (name.includes('b2b')) return 'B2B';
      if (name.includes('b2c') || name.includes('gl:lead')) return 'B2C';
    }
    return 'Other';
  };

  const getSimplifiedCampaignName = (fullName: string): string => {
    // Extract the first part before underscore and make it more readable
    const parts = fullName.split('_');
    const firstPart = parts[0] || fullName;
    
    // Look for objective indicators
    if (fullName.includes('gl:lead')) return `${firstPart} (B2C Lead)`;
    if (fullName.includes('b2b-lead')) return `${firstPart} (B2B Lead)`;
    if (fullName.includes('engagement')) return `${firstPart} (Engagement)`;
    if (fullName.includes('traffic')) return `${firstPart} (Traffic)`;
    if (fullName.includes('booking')) return `${firstPart} (Booking)`;
    
    return firstPart;
  };

  // Aggregate totals across all campaigns
  const totals = campaignData.reduce((acc, campaign) => ({
    spend_current: acc.spend_current + campaign.spend_current,
    spend_previous: acc.spend_previous + campaign.spend_previous,
    spend_3w_ago: acc.spend_3w_ago + campaign.spend_3w_ago,
    spend_4w_ago: acc.spend_4w_ago + campaign.spend_4w_ago,
    spend_5w_ago: acc.spend_5w_ago + campaign.spend_5w_ago,
    spend_mtd: acc.spend_mtd + campaign.spend_mtd,
    spend_last_month: acc.spend_last_month + campaign.spend_last_month,
    spend_2_months_ago: acc.spend_2_months_ago + campaign.spend_2_months_ago,
    impressions_current: acc.impressions_current + campaign.impressions_current,
    impressions_previous: acc.impressions_previous + campaign.impressions_previous,
    impressions_3w_ago: acc.impressions_3w_ago + campaign.impressions_3w_ago,
    impressions_4w_ago: acc.impressions_4w_ago + campaign.impressions_4w_ago,
    impressions_5w_ago: acc.impressions_5w_ago + campaign.impressions_5w_ago,
    impressions_mtd: acc.impressions_mtd + campaign.impressions_mtd,
    impressions_last_month: acc.impressions_last_month + campaign.impressions_last_month,
    impressions_2_months_ago: acc.impressions_2_months_ago + campaign.impressions_2_months_ago,
    clicks_current: acc.clicks_current + campaign.clicks_current,
    clicks_previous: acc.clicks_previous + campaign.clicks_previous,
    clicks_3w_ago: acc.clicks_3w_ago + campaign.clicks_3w_ago,
    clicks_4w_ago: acc.clicks_4w_ago + campaign.clicks_4w_ago,
    clicks_5w_ago: acc.clicks_5w_ago + campaign.clicks_5w_ago,
    clicks_mtd: acc.clicks_mtd + campaign.clicks_mtd,
    clicks_last_month: acc.clicks_last_month + campaign.clicks_last_month,
    clicks_2_months_ago: acc.clicks_2_months_ago + campaign.clicks_2_months_ago,
    leads_current: acc.leads_current + campaign.leads_current,
    leads_previous: acc.leads_previous + campaign.leads_previous,
    leads_3w_ago: acc.leads_3w_ago + campaign.leads_3w_ago,
    leads_4w_ago: acc.leads_4w_ago + campaign.leads_4w_ago,
    leads_5w_ago: acc.leads_5w_ago + campaign.leads_5w_ago,
    leads_mtd: acc.leads_mtd + campaign.leads_mtd,
    leads_last_month: acc.leads_last_month + campaign.leads_last_month,
    leads_2_months_ago: acc.leads_2_months_ago + campaign.leads_2_months_ago,
  }), {
    spend_current: 0, spend_previous: 0, spend_3w_ago: 0, spend_4w_ago: 0, spend_5w_ago: 0,
    spend_mtd: 0, spend_last_month: 0, spend_2_months_ago: 0,
    impressions_current: 0, impressions_previous: 0, impressions_3w_ago: 0, impressions_4w_ago: 0, impressions_5w_ago: 0,
    impressions_mtd: 0, impressions_last_month: 0, impressions_2_months_ago: 0,
    clicks_current: 0, clicks_previous: 0, clicks_3w_ago: 0, clicks_4w_ago: 0, clicks_5w_ago: 0,
    clicks_mtd: 0, clicks_last_month: 0, clicks_2_months_ago: 0,
    leads_current: 0, leads_previous: 0, leads_3w_ago: 0, leads_4w_ago: 0, leads_5w_ago: 0,
    leads_mtd: 0, leads_last_month: 0, leads_2_months_ago: 0,
  });

  // Calculate aggregated CTR
  const avgCTR_current = totals.impressions_current > 0 ? (totals.clicks_current / totals.impressions_current) * 100 : 0;
  const avgCTR_previous = totals.impressions_previous > 0 ? (totals.clicks_previous / totals.impressions_previous) * 100 : 0;
  const avgCTR_3w_ago = totals.impressions_3w_ago > 0 ? (totals.clicks_3w_ago / totals.impressions_3w_ago) * 100 : 0;
  const avgCTR_4w_ago = totals.impressions_4w_ago > 0 ? (totals.clicks_4w_ago / totals.impressions_4w_ago) * 100 : 0;
  const avgCTR_5w_ago = totals.impressions_5w_ago > 0 ? (totals.clicks_5w_ago / totals.impressions_5w_ago) * 100 : 0;
  const avgCTR_mtd = totals.impressions_mtd > 0 ? (totals.clicks_mtd / totals.impressions_mtd) * 100 : 0;
  const avgCTR_last_month = totals.impressions_last_month > 0 ? (totals.clicks_last_month / totals.impressions_last_month) * 100 : 0;
  const avgCTR_2_months_ago = totals.impressions_2_months_ago > 0 ? (totals.clicks_2_months_ago / totals.impressions_2_months_ago) * 100 : 0;

  // Calculate aggregated CPC
  const avgCPC_current = totals.clicks_current > 0 ? totals.spend_current / totals.clicks_current : 0;
  const avgCPC_previous = totals.clicks_previous > 0 ? totals.spend_previous / totals.clicks_previous : 0;
  const avgCPC_3w_ago = totals.clicks_3w_ago > 0 ? totals.spend_3w_ago / totals.clicks_3w_ago : 0;
  const avgCPC_4w_ago = totals.clicks_4w_ago > 0 ? totals.spend_4w_ago / totals.clicks_4w_ago : 0;
  const avgCPC_5w_ago = totals.clicks_5w_ago > 0 ? totals.spend_5w_ago / totals.clicks_5w_ago : 0;
  const avgCPC_mtd = totals.clicks_mtd > 0 ? totals.spend_mtd / totals.clicks_mtd : 0;
  const avgCPC_last_month = totals.clicks_last_month > 0 ? totals.spend_last_month / totals.clicks_last_month : 0;
  const avgCPC_2_months_ago = totals.clicks_2_months_ago > 0 ? totals.spend_2_months_ago / totals.clicks_2_months_ago : 0;

  // Calculate aggregated CPM
  const avgCPM_current = totals.impressions_current > 0 ? (totals.spend_current / totals.impressions_current) * 1000 : 0;
  const avgCPM_previous = totals.impressions_previous > 0 ? (totals.spend_previous / totals.impressions_previous) * 1000 : 0;
  const avgCPM_3w_ago = totals.impressions_3w_ago > 0 ? (totals.spend_3w_ago / totals.impressions_3w_ago) * 1000 : 0;
  const avgCPM_4w_ago = totals.impressions_4w_ago > 0 ? (totals.spend_4w_ago / totals.impressions_4w_ago) * 1000 : 0;
  const avgCPM_5w_ago = totals.impressions_5w_ago > 0 ? (totals.spend_5w_ago / totals.impressions_5w_ago) * 1000 : 0;
  const avgCPM_mtd = totals.impressions_mtd > 0 ? (totals.spend_mtd / totals.impressions_mtd) * 1000 : 0;
  const avgCPM_last_month = totals.impressions_last_month > 0 ? (totals.spend_last_month / totals.impressions_last_month) * 1000 : 0;
  const avgCPM_2_months_ago = totals.impressions_2_months_ago > 0 ? (totals.spend_2_months_ago / totals.impressions_2_months_ago) * 1000 : 0;

  // Calculate cost per lead
  const costPerLead_current = totals.leads_current > 0 ? totals.spend_current / totals.leads_current : 0;
  const costPerLead_previous = totals.leads_previous > 0 ? totals.spend_previous / totals.leads_previous : 0;
  const costPerLead_3w_ago = totals.leads_3w_ago > 0 ? totals.spend_3w_ago / totals.leads_3w_ago : 0;
  const costPerLead_4w_ago = totals.leads_4w_ago > 0 ? totals.spend_4w_ago / totals.leads_4w_ago : 0;
  const costPerLead_5w_ago = totals.leads_5w_ago > 0 ? totals.spend_5w_ago / totals.leads_5w_ago : 0;
  const costPerLead_mtd = totals.leads_mtd > 0 ? totals.spend_mtd / totals.leads_mtd : 0;
  const costPerLead_last_month = totals.leads_last_month > 0 ? totals.spend_last_month / totals.leads_last_month : 0;
  const costPerLead_2_months_ago = totals.leads_2_months_ago > 0 ? totals.spend_2_months_ago / totals.leads_2_months_ago : 0;

  // Helper function to calculate 4-week average comparison (vs 4W Avg)
  const calculate4WeekAvgComparison = (previous: number, weeks3: number, weeks4: number, weeks5: number) => {
    const fourWeekAvg = (weeks3 + weeks4 + weeks5 + previous) / 4;
    if (fourWeekAvg === 0) return 0;
    return ((previous - fourWeekAvg) / fourWeekAvg) * 100;
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export functionality coming soon');
  };

  if (isLoading || isLoadingTable) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-12 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Performance Breakdown</h3>
            <p className="text-sm text-gray-500 mt-1">
              Weekly performance comparison across campaigns
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                <TableHead className="font-semibold text-gray-700 py-3 px-4 text-left w-[180px]">Metric</TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[130px]">
                  <div className="text-xs">Current</div>
                  <div className="text-[10px] text-gray-500 font-normal">This Week</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[130px]">
                  <div className="text-xs">Previous</div>
                  <div className="text-[10px] text-gray-500 font-normal">Last Week</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[120px]">
                  <div className="text-xs">vs 4W Avg</div>
                  <div className="text-[10px] text-gray-500 font-normal">% Change</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[120px]">
                  <div className="text-xs">3W Ago</div>
                  <div className="text-[10px] text-gray-500 font-normal">3 Weeks</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[120px]">
                  <div className="text-xs">4W Ago</div>
                  <div className="text-[10px] text-gray-500 font-normal">4 Weeks</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[120px]">
                  <div className="text-xs">5W Ago</div>
                  <div className="text-[10px] text-gray-500 font-normal">5 Weeks</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[140px]">
                  <div className="text-xs">MTD</div>
                  <div className="text-[10px] text-gray-500 font-normal">Month to Date</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[140px]">
                  <div className="text-xs">Last Month</div>
                  <div className="text-[10px] text-gray-500 font-normal">Full Month</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[140px]">
                  <div className="text-xs">2M Ago</div>
                  <div className="text-[10px] text-gray-500 font-normal">Full Month</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 py-3 px-2 text-center w-[120px]">
                  <div className="text-xs">M-1 vs M-2</div>
                  <div className="text-[10px] text-gray-500 font-normal">% Change</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Spend Section */}
              <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">Spend</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(totals.spend_current)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(totals.spend_previous)}</TableCell>
                <TableCell className="py-3 px-2 text-center">
                  <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getTrendColor(calculate4WeekAvgComparison(totals.spend_previous, totals.spend_3w_ago, totals.spend_4w_ago, totals.spend_5w_ago))}`}>
                    {getTrendIcon(calculate4WeekAvgComparison(totals.spend_previous, totals.spend_3w_ago, totals.spend_4w_ago, totals.spend_5w_ago))}
                    {formatPercentageChange(totals.spend_previous, (totals.spend_3w_ago + totals.spend_4w_ago + totals.spend_5w_ago + totals.spend_previous) / 4)}
                  </div>
                </TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(totals.spend_3w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(totals.spend_4w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(totals.spend_5w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(totals.spend_mtd)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(totals.spend_last_month)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(totals.spend_2_months_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center">
                  <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getTrendColor(calculatePercentageChange(totals.spend_last_month, totals.spend_2_months_ago))}`}>
                    {getTrendIcon(calculatePercentageChange(totals.spend_last_month, totals.spend_2_months_ago))}
                    {formatPercentageChange(totals.spend_last_month, totals.spend_2_months_ago)}
                  </div>
                </TableCell>
              </TableRow>
              {/* Individual campaigns for Spend */}
              {campaignData.map((campaign) => (
                <TableRow key={`spend-${campaign.campaign_id}`} className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                  <TableCell className="py-2 px-4 pl-8 text-blue-600 font-medium text-xs">
                    {getSimplifiedCampaignName(campaign.campaign_name)}
                  </TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.spend_current)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.spend_previous)}</TableCell>
                  <TableCell className="py-2 px-2 text-center">
                    <div className={`font-medium text-xs ${getTrendColor(calculate4WeekAvgComparison(campaign.spend_previous, campaign.spend_3w_ago, campaign.spend_4w_ago, campaign.spend_5w_ago))}`}>
                      {formatPercentageChange(campaign.spend_previous, (campaign.spend_3w_ago + campaign.spend_4w_ago + campaign.spend_5w_ago + campaign.spend_previous) / 4)}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.spend_3w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.spend_4w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.spend_5w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.spend_mtd)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.spend_last_month)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.spend_2_months_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center">
                    <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(campaign.spend_last_month, campaign.spend_2_months_ago))}`}>
                      {formatPercentageChange(campaign.spend_last_month, campaign.spend_2_months_ago)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* Impressions Section */}
              <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">Impressions</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.impressions_current)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.impressions_previous)}</TableCell>
                <TableCell className="py-3 px-2 text-center">
                  <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getTrendColor(calculate4WeekAvgComparison(totals.impressions_previous, totals.impressions_3w_ago, totals.impressions_4w_ago, totals.impressions_5w_ago))}`}>
                    {getTrendIcon(calculate4WeekAvgComparison(totals.impressions_previous, totals.impressions_3w_ago, totals.impressions_4w_ago, totals.impressions_5w_ago))}
                    {formatPercentageChange(totals.impressions_previous, (totals.impressions_3w_ago + totals.impressions_4w_ago + totals.impressions_5w_ago + totals.impressions_previous) / 4)}
                  </div>
                </TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.impressions_3w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.impressions_4w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.impressions_5w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.impressions_mtd)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.impressions_last_month)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.impressions_2_months_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center">
                  <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getTrendColor(calculatePercentageChange(totals.impressions_last_month, totals.impressions_2_months_ago))}`}>
                    {getTrendIcon(calculatePercentageChange(totals.impressions_last_month, totals.impressions_2_months_ago))}
                    {formatPercentageChange(totals.impressions_last_month, totals.impressions_2_months_ago)}
                  </div>
                </TableCell>
              </TableRow>
              {/* Individual campaigns for Impressions */}
              {campaignData.map((campaign) => (
                <TableRow key={`impressions-${campaign.campaign_id}`} className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                  <TableCell className="py-2 px-4 pl-8 text-blue-600 font-medium text-xs">
                    {getSimplifiedCampaignName(campaign.campaign_name)}
                  </TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.impressions_current)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.impressions_previous)}</TableCell>
                  <TableCell className="py-2 px-2 text-center">
                    <div className={`font-medium text-xs ${getTrendColor(calculate4WeekAvgComparison(campaign.impressions_previous, campaign.impressions_3w_ago, campaign.impressions_4w_ago, campaign.impressions_5w_ago))}`}>
                      {formatPercentageChange(campaign.impressions_previous, (campaign.impressions_3w_ago + campaign.impressions_4w_ago + campaign.impressions_5w_ago + campaign.impressions_previous) / 4)}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.impressions_3w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.impressions_4w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.impressions_5w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.impressions_mtd)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.impressions_last_month)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.impressions_2_months_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center">
                    <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(campaign.impressions_last_month, campaign.impressions_2_months_ago))}`}>
                      {formatPercentageChange(campaign.impressions_last_month, campaign.impressions_2_months_ago)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* Clicks Section */}
              <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">Clicks</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.clicks_current)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.clicks_previous)}</TableCell>
                <TableCell className="py-3 px-2 text-center">
                  <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getTrendColor(calculate4WeekAvgComparison(totals.clicks_previous, totals.clicks_3w_ago, totals.clicks_4w_ago, totals.clicks_5w_ago))}`}>
                    {getTrendIcon(calculate4WeekAvgComparison(totals.clicks_previous, totals.clicks_3w_ago, totals.clicks_4w_ago, totals.clicks_5w_ago))}
                    {formatPercentageChange(totals.clicks_previous, (totals.clicks_3w_ago + totals.clicks_4w_ago + totals.clicks_5w_ago + totals.clicks_previous) / 4)}
                  </div>
                </TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.clicks_3w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.clicks_4w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.clicks_5w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.clicks_mtd)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.clicks_last_month)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatNumber(totals.clicks_2_months_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center">
                  <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getTrendColor(calculatePercentageChange(totals.clicks_last_month, totals.clicks_2_months_ago))}`}>
                    {getTrendIcon(calculatePercentageChange(totals.clicks_last_month, totals.clicks_2_months_ago))}
                    {formatPercentageChange(totals.clicks_last_month, totals.clicks_2_months_ago)}
                  </div>
                </TableCell>
              </TableRow>
              {/* Individual campaigns for Clicks */}
              {campaignData.map((campaign) => (
                <TableRow key={`clicks-${campaign.campaign_id}`} className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                  <TableCell className="py-2 px-4 pl-8 text-blue-600 font-medium text-xs">
                    {getSimplifiedCampaignName(campaign.campaign_name)}
                  </TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.clicks_current)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.clicks_previous)}</TableCell>
                  <TableCell className="py-2 px-2 text-center">
                    <div className={`font-medium text-xs ${getTrendColor(calculate4WeekAvgComparison(campaign.clicks_previous, campaign.clicks_3w_ago, campaign.clicks_4w_ago, campaign.clicks_5w_ago))}`}>
                      {formatPercentageChange(campaign.clicks_previous, (campaign.clicks_3w_ago + campaign.clicks_4w_ago + campaign.clicks_5w_ago + campaign.clicks_previous) / 4)}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.clicks_3w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.clicks_4w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.clicks_5w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.clicks_mtd)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.clicks_last_month)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatNumber(campaign.clicks_2_months_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center">
                    <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(campaign.clicks_last_month, campaign.clicks_2_months_ago))}`}>
                      {formatPercentageChange(campaign.clicks_last_month, campaign.clicks_2_months_ago)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* CTR Section */}
              <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">CTR</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCTR(avgCTR_current)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCTR(avgCTR_previous)}</TableCell>
                <TableCell className="py-3 px-2 text-center">
                  <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getTrendColor(calculate4WeekAvgComparison(avgCTR_previous, avgCTR_3w_ago, avgCTR_4w_ago, avgCTR_5w_ago))}`}>
                    {getTrendIcon(calculate4WeekAvgComparison(avgCTR_previous, avgCTR_3w_ago, avgCTR_4w_ago, avgCTR_5w_ago))}
                    {formatPercentageChange(avgCTR_previous, (avgCTR_3w_ago + avgCTR_4w_ago + avgCTR_5w_ago + avgCTR_previous) / 4)}
                  </div>
                </TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCTR(avgCTR_3w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCTR(avgCTR_4w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCTR(avgCTR_5w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCTR(avgCTR_mtd)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCTR(avgCTR_last_month)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCTR(avgCTR_2_months_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center">
                  <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getTrendColor(calculatePercentageChange(avgCTR_last_month, avgCTR_2_months_ago))}`}>
                    {getTrendIcon(calculatePercentageChange(avgCTR_last_month, avgCTR_2_months_ago))}
                    {formatPercentageChange(avgCTR_last_month, avgCTR_2_months_ago)}
                  </div>
                </TableCell>
              </TableRow>
              {/* Individual campaigns for CTR */}
              {campaignData.map((campaign) => (
                <TableRow key={`ctr-${campaign.campaign_id}`} className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                  <TableCell className="py-2 px-4 pl-8 text-blue-600 font-medium text-xs">
                    {getSimplifiedCampaignName(campaign.campaign_name)}
                  </TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCTR(campaign.ctr_current)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCTR(campaign.ctr_previous)}</TableCell>
                  <TableCell className="py-2 px-2 text-center">
                    <div className={`font-medium text-xs ${getTrendColor(calculate4WeekAvgComparison(campaign.ctr_previous, campaign.ctr_3w_ago, campaign.ctr_4w_ago, campaign.ctr_5w_ago))}`}>
                      {formatPercentageChange(campaign.ctr_previous, (campaign.ctr_3w_ago + campaign.ctr_4w_ago + campaign.ctr_5w_ago + campaign.ctr_previous) / 4)}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCTR(campaign.ctr_3w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCTR(campaign.ctr_4w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCTR(campaign.ctr_5w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCTR(campaign.ctr_mtd)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCTR(campaign.ctr_last_month)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCTR(campaign.ctr_2_months_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center">
                    <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(campaign.ctr_last_month, campaign.ctr_2_months_ago))}`}>
                      {formatPercentageChange(campaign.ctr_last_month, campaign.ctr_2_months_ago)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* CPC Section */}
              <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">CPC</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPC_current)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPC_previous)}</TableCell>
                <TableCell className="py-3 px-2 text-center">
                  <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getCostTrendColor(calculate4WeekAvgComparison(avgCPC_previous, avgCPC_3w_ago, avgCPC_4w_ago, avgCPC_5w_ago))}`}>
                    {getCostTrendIcon(calculate4WeekAvgComparison(avgCPC_previous, avgCPC_3w_ago, avgCPC_4w_ago, avgCPC_5w_ago))}
                    {formatPercentageChange(avgCPC_previous, (avgCPC_3w_ago + avgCPC_4w_ago + avgCPC_5w_ago + avgCPC_previous) / 4)}
                  </div>
                </TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPC_3w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPC_4w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPC_5w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPC_mtd)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPC_last_month)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPC_2_months_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center">
                  <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getCostTrendColor(calculatePercentageChange(avgCPC_last_month, avgCPC_2_months_ago))}`}>
                    {getCostTrendIcon(calculatePercentageChange(avgCPC_last_month, avgCPC_2_months_ago))}
                    {formatPercentageChange(avgCPC_last_month, avgCPC_2_months_ago)}
                  </div>
                </TableCell>
              </TableRow>
              {/* Individual campaigns for CPC */}
              {campaignData.map((campaign) => (
                <TableRow key={`cpc-${campaign.campaign_id}`} className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                  <TableCell className="py-2 px-4 pl-8 text-blue-600 font-medium text-xs">
                    {getSimplifiedCampaignName(campaign.campaign_name)}
                  </TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpc_current)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpc_previous)}</TableCell>
                  <TableCell className="py-2 px-2 text-center">
                    <div className={`font-medium text-xs ${getCostTrendColor(calculate4WeekAvgComparison(campaign.cpc_previous, campaign.cpc_3w_ago, campaign.cpc_4w_ago, campaign.cpc_5w_ago))}`}>
                      {formatPercentageChange(campaign.cpc_previous, (campaign.cpc_3w_ago + campaign.cpc_4w_ago + campaign.cpc_5w_ago + campaign.cpc_previous) / 4)}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpc_3w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpc_4w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpc_5w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpc_mtd)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpc_last_month)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpc_2_months_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center">
                    <div className={`font-medium text-xs ${getCostTrendColor(calculatePercentageChange(campaign.cpc_last_month, campaign.cpc_2_months_ago))}`}>
                      {formatPercentageChange(campaign.cpc_last_month, campaign.cpc_2_months_ago)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* CPM Section */}
              <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">CPM</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPM_current)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPM_previous)}</TableCell>
                <TableCell className="py-3 px-2 text-center">
                  <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getCostTrendColor(calculate4WeekAvgComparison(avgCPM_previous, avgCPM_3w_ago, avgCPM_4w_ago, avgCPM_5w_ago))}`}>
                    {getCostTrendIcon(calculate4WeekAvgComparison(avgCPM_previous, avgCPM_3w_ago, avgCPM_4w_ago, avgCPM_5w_ago))}
                    {formatPercentageChange(avgCPM_previous, (avgCPM_3w_ago + avgCPM_4w_ago + avgCPM_5w_ago + avgCPM_previous) / 4)}
                  </div>
                </TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPM_3w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPM_4w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPM_5w_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPM_mtd)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPM_last_month)}</TableCell>
                <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(avgCPM_2_months_ago)}</TableCell>
                <TableCell className="py-3 px-2 text-center">
                  <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getCostTrendColor(calculatePercentageChange(avgCPM_last_month, avgCPM_2_months_ago))}`}>
                    {getCostTrendIcon(calculatePercentageChange(avgCPM_last_month, avgCPM_2_months_ago))}
                    {formatPercentageChange(avgCPM_last_month, avgCPM_2_months_ago)}
                  </div>
                </TableCell>
              </TableRow>
              {/* Individual campaigns for CPM */}
              {campaignData.map((campaign) => (
                <TableRow key={`cpm-${campaign.campaign_id}`} className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                  <TableCell className="py-2 px-4 pl-8 text-blue-600 font-medium text-xs">
                    {getSimplifiedCampaignName(campaign.campaign_name)}
                  </TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpm_current)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpm_previous)}</TableCell>
                  <TableCell className="py-2 px-2 text-center">
                    <div className={`font-medium text-xs ${getCostTrendColor(calculate4WeekAvgComparison(campaign.cpm_previous, campaign.cpm_3w_ago, campaign.cpm_4w_ago, campaign.cpm_5w_ago))}`}>
                      {formatPercentageChange(campaign.cpm_previous, (campaign.cpm_3w_ago + campaign.cpm_4w_ago + campaign.cpm_5w_ago + campaign.cpm_previous) / 4)}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpm_3w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpm_4w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpm_5w_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpm_mtd)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpm_last_month)}</TableCell>
                  <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{formatCurrency(campaign.cpm_2_months_ago)}</TableCell>
                  <TableCell className="py-2 px-2 text-center">
                    <div className={`font-medium text-xs ${getCostTrendColor(calculatePercentageChange(campaign.cpm_last_month, campaign.cpm_2_months_ago))}`}>
                      {formatPercentageChange(campaign.cpm_last_month, campaign.cpm_2_months_ago)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* Meta Leads Section - only show if we have lead campaigns */}
              {totals.leads_current > 0 && (
                <>
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">Meta Leads</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{totals.leads_current}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{totals.leads_previous}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getTrendColor(calculate4WeekAvgComparison(totals.leads_previous, totals.leads_3w_ago, totals.leads_4w_ago, totals.leads_5w_ago))}`}>
                        {getTrendIcon(calculate4WeekAvgComparison(totals.leads_previous, totals.leads_3w_ago, totals.leads_4w_ago, totals.leads_5w_ago))}
                        {formatPercentageChange(totals.leads_previous, (totals.leads_3w_ago + totals.leads_4w_ago + totals.leads_5w_ago + totals.leads_previous) / 4)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{totals.leads_3w_ago}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{totals.leads_4w_ago}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{totals.leads_5w_ago}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{totals.leads_mtd}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{totals.leads_last_month}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{totals.leads_2_months_ago}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getTrendColor(calculatePercentageChange(totals.leads_last_month, totals.leads_2_months_ago))}`}>
                        {getTrendIcon(calculatePercentageChange(totals.leads_last_month, totals.leads_2_months_ago))}
                        {formatPercentageChange(totals.leads_last_month, totals.leads_2_months_ago)}
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Individual lead campaigns */}
                  {campaignData.filter(campaign => 
                    getCampaignType(campaign.campaign_name, campaign.objective) !== 'Other'
                  ).map((campaign) => (
                    <TableRow key={`leads-${campaign.campaign_id}`} className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                      <TableCell className="py-2 px-4 pl-8 text-blue-600 font-medium text-xs">
                        {getSimplifiedCampaignName(campaign.campaign_name)}
                      </TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.leads_current}</TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.leads_previous}</TableCell>
                      <TableCell className="py-2 px-2 text-center">
                        <div className={`font-medium text-xs ${getTrendColor(calculate4WeekAvgComparison(campaign.leads_previous, campaign.leads_3w_ago, campaign.leads_4w_ago, campaign.leads_5w_ago))}`}>
                          {formatPercentageChange(campaign.leads_previous, (campaign.leads_3w_ago + campaign.leads_4w_ago + campaign.leads_5w_ago + campaign.leads_previous) / 4)}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.leads_3w_ago}</TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.leads_4w_ago}</TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.leads_5w_ago}</TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.leads_mtd}</TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.leads_last_month}</TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.leads_2_months_ago}</TableCell>
                      <TableCell className="py-2 px-2 text-center">
                        <div className={`font-medium text-xs ${getTrendColor(calculatePercentageChange(campaign.leads_last_month, campaign.leads_2_months_ago))}`}>
                          {formatPercentageChange(campaign.leads_last_month, campaign.leads_2_months_ago)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Cost per Lead Section */}
                  <TableRow className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                    <TableCell className="py-3 px-4 font-semibold text-gray-900 bg-gray-50/30 text-sm">Cost per Lead</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(costPerLead_current)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(costPerLead_previous)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getCostTrendColor(calculate4WeekAvgComparison(costPerLead_previous, costPerLead_3w_ago, costPerLead_4w_ago, costPerLead_5w_ago))}`}>
                        {getCostTrendIcon(calculate4WeekAvgComparison(costPerLead_previous, costPerLead_3w_ago, costPerLead_4w_ago, costPerLead_5w_ago))}
                        {formatPercentageChange(costPerLead_previous, (costPerLead_3w_ago + costPerLead_4w_ago + costPerLead_5w_ago + costPerLead_previous) / 4)}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(costPerLead_3w_ago)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(costPerLead_4w_ago)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(costPerLead_5w_ago)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(costPerLead_mtd)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(costPerLead_last_month)}</TableCell>
                    <TableCell className="py-3 px-2 text-center font-medium text-gray-900 text-xs">{formatCurrency(costPerLead_2_months_ago)}</TableCell>
                    <TableCell className="py-3 px-2 text-center">
                      <div className={`font-medium text-xs flex items-center justify-center gap-1 ${getCostTrendColor(calculatePercentageChange(costPerLead_last_month, costPerLead_2_months_ago))}`}>
                        {getCostTrendIcon(calculatePercentageChange(costPerLead_last_month, costPerLead_2_months_ago))}
                        {formatPercentageChange(costPerLead_last_month, costPerLead_2_months_ago)}
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Individual campaigns for Cost per Lead */}
                  {campaignData.filter(campaign => 
                    getCampaignType(campaign.campaign_name, campaign.objective) !== 'Other'
                  ).map((campaign) => (
                    <TableRow key={`cost-per-lead-${campaign.campaign_id}`} className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
                      <TableCell className="py-2 px-4 pl-8 text-blue-600 font-medium text-xs">
                        {getSimplifiedCampaignName(campaign.campaign_name)}
                      </TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.cost_per_lead_current > 0 ? formatCurrency(campaign.cost_per_lead_current) : '—'}</TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.cost_per_lead_previous > 0 ? formatCurrency(campaign.cost_per_lead_previous) : '—'}</TableCell>
                      <TableCell className="py-2 px-2 text-center">
                        <div className={`font-medium text-xs ${getCostTrendColor(calculate4WeekAvgComparison(campaign.cost_per_lead_previous, campaign.cost_per_lead_3w_ago, campaign.cost_per_lead_4w_ago, campaign.cost_per_lead_5w_ago))}`}>
                          {formatPercentageChange(campaign.cost_per_lead_previous, (campaign.cost_per_lead_3w_ago + campaign.cost_per_lead_4w_ago + campaign.cost_per_lead_5w_ago + campaign.cost_per_lead_previous) / 4)}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.cost_per_lead_3w_ago > 0 ? formatCurrency(campaign.cost_per_lead_3w_ago) : '—'}</TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.cost_per_lead_4w_ago > 0 ? formatCurrency(campaign.cost_per_lead_4w_ago) : '—'}</TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.cost_per_lead_5w_ago > 0 ? formatCurrency(campaign.cost_per_lead_5w_ago) : '—'}</TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.cost_per_lead_mtd > 0 ? formatCurrency(campaign.cost_per_lead_mtd) : '—'}</TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.cost_per_lead_last_month > 0 ? formatCurrency(campaign.cost_per_lead_last_month) : '—'}</TableCell>
                      <TableCell className="py-2 px-2 text-center text-blue-600 font-medium text-xs">{campaign.cost_per_lead_2_months_ago > 0 ? formatCurrency(campaign.cost_per_lead_2_months_ago) : '—'}</TableCell>
                      <TableCell className="py-2 px-2 text-center">
                        <div className={`font-medium text-xs ${getCostTrendColor(calculatePercentageChange(campaign.cost_per_lead_last_month, campaign.cost_per_lead_2_months_ago))}`}>
                          {formatPercentageChange(campaign.cost_per_lead_last_month, campaign.cost_per_lead_2_months_ago)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default MetaAdsPerformanceBreakdownTable;