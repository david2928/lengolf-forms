import { useMemo } from 'react';
import useSWR from 'swr';
import { 
  ProductAnalytics, 
  CategoryAnalytics, 
  PriceAnalytics,
  APIResponse
} from '@/types/product-management';

const BASE_URL = '/api/admin/products/analytics';

// Custom fetcher for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch analytics data');
  }
  return response.json();
};

// Analytics data interface
interface AnalyticsData {
  overview: ProductAnalytics;
  category_breakdown: CategoryAnalytics[];
  profit_analysis: {
    top_performers: PriceAnalytics[];
    bottom_performers: PriceAnalytics[];
  };
  recent_price_changes: any[];
  price_distribution: Array<{
    price_range: string;
    product_count: number;
    avg_price_in_range: number;
  }>;
  margin_distribution: Array<{
    margin_range: string;
    product_count: number;
    avg_margin_in_range: number;
  }>;
}

// Main analytics hook
export function useProductAnalytics() {
  const { 
    data, 
    error, 
    isLoading, 
    mutate: revalidate 
  } = useSWR<APIResponse<AnalyticsData>>(BASE_URL, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 300000, // Refresh every 5 minutes
    dedupingInterval: 60000 // 1 minute
  });

  const analytics = useMemo(() => data?.data, [data]);

  // Overview metrics
  const overview = useMemo(() => analytics?.overview || {
    total_products: 0,
    active_products: 0,
    inactive_products: 0,
    custom_products: 0,
    hidden_products: 0,
    total_catalog_value: 0,
    avg_price: 0,
    avg_profit_margin: 0,
    categories_count: 0,
    products_without_cost: 0,
    recent_changes: 0
  }, [analytics]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => analytics?.category_breakdown || [], [analytics]);

  // Top and bottom performers
  const topPerformers = useMemo(() => analytics?.profit_analysis?.top_performers || [], [analytics]);
  const bottomPerformers = useMemo(() => analytics?.profit_analysis?.bottom_performers || [], [analytics]);

  // Recent changes
  const recentChanges = useMemo(() => analytics?.recent_price_changes || [], [analytics]);

  // Distribution data
  const priceDistribution = useMemo(() => analytics?.price_distribution || [], [analytics]);
  const marginDistribution = useMemo(() => analytics?.margin_distribution || [], [analytics]);

  // Computed metrics
  const computedMetrics = useMemo(() => {
    if (!analytics) return null;

    const activePercentage = overview.total_products > 0 
      ? (overview.active_products / overview.total_products) * 100 
      : 0;

    const customProductsPercentage = overview.total_products > 0 
      ? (overview.custom_products / overview.total_products) * 100 
      : 0;

    const costCoveragePercentage = overview.total_products > 0 
      ? ((overview.total_products - overview.products_without_cost) / overview.total_products) * 100 
      : 0;

    const avgProfitMargin = overview.avg_profit_margin || 0;

    // Profit margin health assessment
    let profitHealthStatus: 'excellent' | 'good' | 'fair' | 'poor';
    if (avgProfitMargin >= 70) profitHealthStatus = 'excellent';
    else if (avgProfitMargin >= 50) profitHealthStatus = 'good';
    else if (avgProfitMargin >= 30) profitHealthStatus = 'fair';
    else profitHealthStatus = 'poor';

    return {
      activePercentage,
      customProductsPercentage,
      costCoveragePercentage,
      profitHealthStatus,
      avgProfitMargin
    };
  }, [analytics, overview]);

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!analytics) return null;

    // Price distribution chart data
    const priceChartData = priceDistribution.map(item => ({
      range: item.price_range,
      count: item.product_count,
      avgPrice: item.avg_price_in_range
    }));

    // Margin distribution chart data
    const marginChartData = marginDistribution.map(item => ({
      range: item.margin_range.replace(/[()%]/g, ''), // Clean up range labels
      count: item.product_count,
      avgMargin: item.avg_margin_in_range
    }));

    // Category performance chart data
    const categoryChartData = categoryBreakdown
      .slice(0, 10) // Top 10 categories
      .map(cat => ({
        category: cat.category_name,
        productCount: cat.product_count,
        totalValue: cat.total_value,
        avgPrice: cat.avg_price,
        avgMargin: cat.avg_profit_margin
      }));

    return {
      priceChartData,
      marginChartData,
      categoryChartData
    };
  }, [analytics, priceDistribution, marginDistribution, categoryBreakdown]);

  // Key insights
  const insights = useMemo(() => {
    if (!analytics || !computedMetrics) return [];

    const insights = [];

    // High profit margin products
    if (topPerformers.length > 0) {
      const topMargin = topPerformers[0]?.profit_margin;
      if (topMargin && topMargin > 80) {
        insights.push({
          type: 'success',
          title: 'Excellent Profit Margins',
          message: `${topPerformers.filter(p => p.profit_margin > 80).length} products have profit margins above 80%`,
          action: 'Review pricing strategy for similar products'
        });
      }
    }

    // Low cost coverage
    if (computedMetrics.costCoveragePercentage < 80) {
      insights.push({
        type: 'warning',
        title: 'Incomplete Cost Data',
        message: `${overview.products_without_cost} products are missing cost information`,
        action: 'Update missing cost data for accurate profit tracking'
      });
    }

    // Recent activity
    if (overview.recent_changes > 0) {
      insights.push({
        type: 'info',
        title: 'Recent Updates',
        message: `${overview.recent_changes} products updated in the last 30 days`,
        action: 'Review recent changes for consistency'
      });
    }

    // Category concentration
    const topCategory = categoryBreakdown[0];
    if (topCategory && categoryBreakdown.length > 0) {
      const topCategoryPercentage = (topCategory.product_count / overview.active_products) * 100;
      if (topCategoryPercentage > 40) {
        insights.push({
          type: 'info',
          title: 'Category Concentration',
          message: `${topCategory.category_name} accounts for ${topCategoryPercentage.toFixed(1)}% of active products`,
          action: 'Consider diversifying product portfolio'
        });
      }
    }

    return insights;
  }, [analytics, computedMetrics, topPerformers, overview, categoryBreakdown]);

  return {
    // Raw data
    analytics,
    
    // Processed data
    overview,
    categoryBreakdown,
    topPerformers,
    bottomPerformers,
    recentChanges,
    priceDistribution,
    marginDistribution,
    
    // Computed metrics
    computedMetrics,
    
    // Chart data
    chartData,
    
    // Insights
    insights,
    
    // State
    isLoading,
    error,
    
    // Actions
    revalidate
  };
}

// Hook for category-specific analytics
export function useCategoryAnalytics(categoryId?: string) {
  const { categoryBreakdown, isLoading, error } = useProductAnalytics();

  const categoryData = useMemo(() => {
    if (!categoryId || !categoryBreakdown) return null;
    return categoryBreakdown.find(cat => cat.category_id === categoryId);
  }, [categoryId, categoryBreakdown]);

  const categoryMetrics = useMemo(() => {
    if (!categoryData) return null;

    const performance = categoryData.avg_profit_margin >= 50 ? 'high' : 
                       categoryData.avg_profit_margin >= 30 ? 'medium' : 'low';

    return {
      ...categoryData,
      performance,
      valuePerProduct: categoryData.product_count > 0 
        ? categoryData.total_value / categoryData.product_count 
        : 0
    };
  }, [categoryData]);

  return {
    categoryData,
    categoryMetrics,
    isLoading,
    error
  };
}

// Hook for real-time metrics (useful for dashboards)
export function useRealTimeMetrics() {
  const { overview, revalidate } = useProductAnalytics();

  const keyMetrics = useMemo(() => [
    {
      label: 'Total Products',
      value: overview.total_products,
      change: '+0', // Could be calculated from historical data
      trend: 'neutral' as const
    },
    {
      label: 'Active Products',
      value: overview.active_products,
      change: '+0',
      trend: 'neutral' as const
    },
    {
      label: 'Catalog Value',
      value: `฿${overview.total_catalog_value?.toLocaleString() || '0'}`,
      change: '+0%',
      trend: 'neutral' as const
    },
    {
      label: 'Avg Profit Margin',
      value: `${overview.avg_profit_margin?.toFixed(1) || '0'}%`,
      change: '+0%',
      trend: overview.avg_profit_margin >= 50 ? 'positive' : 'negative' as const
    }
  ], [overview]);

  return {
    keyMetrics,
    revalidate
  };
}