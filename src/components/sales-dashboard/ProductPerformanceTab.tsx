'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, TrendingDown, Package, Target, BarChart3, X, Calendar, DollarSign, CalendarIcon, RefreshCw } from 'lucide-react';
import ProductPerformanceChart from './ProductPerformanceChart';
import ProductTrendChart from './ProductTrendChart';
import { DashboardLoading } from './DashboardLoading';
import { useProductPerformance } from '@/hooks/useProductPerformance';

interface Product {
  id: string;
  name: string;
  category: string;
  quantity_sold: number;
  total_revenue: number | null;
  total_profit: number | null;
  avg_profit_margin: number | null;
  total_cost: number | null;
  units_in_stock: number;
  performance_trend: 'up' | 'down' | 'stable';
  trend_percentage: number | null;
}

interface ProductPerformanceData {
  products: Product[];
  categories: string[];
  summary: {
    total_products: number;
    total_revenue: number;
    total_profit: number;
    avg_profit_margin: number;
    top_performer: string;
    worst_performer: string;
  };
}

interface ProductPerformanceTabProps {
  dateRange: {
    start: string;
    end: string;
  };
}

export default function ProductPerformanceTab({ dateRange }: ProductPerformanceTabProps) {
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'profit' | 'quantity' | 'margin'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Use cached data hook
  const { data, isLoading, error, refresh, isCached } = useProductPerformance({
    dateRange,
    category: selectedCategory === 'all' ? '' : selectedCategory,
    search: activeSearchTerm,
    sortBy,
    sortOrder
  });

  // Handle search
  const handleSearch = () => {
    setActiveSearchTerm(searchTerm);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const filteredProducts = data?.products?.filter(product => {
    let matchesCategory = selectedCategory === 'all';
    
    if (!matchesCategory) {
      // Handle hierarchical category filtering
      if (selectedCategory.includes(' > ')) {
        // Extract the actual category name from "Parent > Category"
        const actualCategory = selectedCategory.split(' > ')[1];
        matchesCategory = product.category === actualCategory;
      } else {
        matchesCategory = product.category === selectedCategory;
      }
    }
    
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  // Check if any products have stock data
  const hasStockData = filteredProducts.some(product => product.units_in_stock > 0);

  const handleSortChange = (newSortBy: 'revenue' | 'profit' | 'quantity' | 'margin') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">No product performance data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Products Sold</p>
                <p className="text-2xl font-bold">{data.summary.total_products}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(data.summary.total_revenue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(data.summary.total_profit)}</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Profit Margin</p>
                <p className="text-2xl font-bold">{formatPercentage(data.summary.avg_profit_margin)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <ProductPerformanceChart data={filteredProducts} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Product Performance Details</CardTitle>
            <div className="flex items-center gap-2">
              {isCached && (
                <Badge variant="outline" className="text-xs">
                  Cached
                </Badge>
              )}
              <Button
                onClick={refresh}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {data.categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products... (press Enter or click search)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={handleSearch}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </div>

          {/* Products Display */}
          {selectedProduct ? (
            // Selected Product Summary
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-900">{selectedProduct.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {selectedProduct.category}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-blue-600">Revenue</p>
                    <p className="font-semibold text-blue-900">{formatCurrency(selectedProduct.total_revenue || 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-600">Profit</p>
                    <p className="font-semibold text-blue-900">{formatCurrency(selectedProduct.total_profit || 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-600">Margin</p>
                    <p className="font-semibold text-blue-900">{formatPercentage(selectedProduct.avg_profit_margin)}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedProduct(null)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-4 w-4" />
                    Deselect
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Products Table
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Product</th>
                    <th className="text-left py-3 px-2">Category</th>
                    <th 
                      className="text-right py-3 px-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSortChange('quantity')}
                    >
                      Qty Sold
                      {sortBy === 'quantity' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      className="text-right py-3 px-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSortChange('revenue')}
                    >
                      Revenue
                      {sortBy === 'revenue' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      className="text-right py-3 px-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSortChange('profit')}
                    >
                      Profit
                      {sortBy === 'profit' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      className="text-right py-3 px-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSortChange('margin')}
                    >
                      Margin
                      {sortBy === 'margin' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th className="text-center py-3 px-2">Trend</th>
                    {hasStockData && <th className="text-right py-3 px-2">Stock</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr 
                      key={product.id} 
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <td className="py-3 px-2 font-medium">{product.name}</td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right">{product.quantity_sold}</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(product.total_revenue || 0)}</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(product.total_profit || 0)}</td>
                      <td className="py-3 px-2 text-right">{formatPercentage(product.avg_profit_margin)}</td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {product.performance_trend === 'up' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : product.performance_trend === 'down' ? (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          ) : (
                            <div className="w-4 h-4 bg-gray-400 rounded-full" />
                          )}
                          <span className={`text-xs ${
                            product.performance_trend === 'up' ? 'text-green-600' : 
                            product.performance_trend === 'down' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {(product.trend_percentage || 0) > 0 ? '+' : ''}{formatPercentage(product.trend_percentage)}
                          </span>
                        </div>
                      </td>
                      {hasStockData && (
                        <td className="py-3 px-2 text-right">
                          <Badge 
                            variant={product.units_in_stock > 10 ? 'default' : product.units_in_stock > 0 ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {product.units_in_stock}
                          </Badge>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No products found matching your criteria
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Product Detail Modal */}
      {selectedProduct && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Details: {selectedProduct.name}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedProduct(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Revenue</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(selectedProduct.total_revenue || 0)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {selectedProduct.quantity_sold} units sold
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Profit</span>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(selectedProduct.total_profit || 0)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {formatPercentage(selectedProduct.avg_profit_margin)} margin
                </p>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-600">Trend</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedProduct.performance_trend === 'up' ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : selectedProduct.performance_trend === 'down' ? (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  ) : (
                    <div className="w-5 h-5 bg-gray-400 rounded-full" />
                  )}
                  <span className={`text-lg font-bold ${
                    selectedProduct.performance_trend === 'up' ? 'text-green-600' : 
                    selectedProduct.performance_trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {(selectedProduct.trend_percentage || 0) > 0 ? '+' : ''}{formatPercentage(selectedProduct.trend_percentage)}
                  </span>
                </div>
                <p className="text-xs text-orange-600 mt-1">vs previous period</p>
              </div>

              {hasStockData && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-600">Stock</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    {selectedProduct.units_in_stock}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">units in stock</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Product Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <Badge variant="outline">{selectedProduct.category}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Cost:</span>
                    <span>{formatCurrency(selectedProduct.total_cost || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Revenue per Unit:</span>
                    <span>
                      {selectedProduct.quantity_sold > 0 
                        ? formatCurrency((selectedProduct.total_revenue || 0) / selectedProduct.quantity_sold)
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Profit per Unit:</span>
                    <span>
                      {selectedProduct.quantity_sold > 0 
                        ? formatCurrency((selectedProduct.total_profit || 0) / selectedProduct.quantity_sold)
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Performance Analysis</h4>
                <div className="text-sm space-y-2">
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      {selectedProduct.performance_trend === 'up' && (
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          <span className="font-medium">Growing</span>
                        </div>
                      )}
                      {selectedProduct.performance_trend === 'down' && (
                        <div className="flex items-center gap-1 text-red-600">
                          <TrendingDown className="h-4 w-4" />
                          <span className="font-medium">Declining</span>
                        </div>
                      )}
                      {selectedProduct.performance_trend === 'stable' && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <div className="w-4 h-4 bg-gray-400 rounded-full" />
                          <span className="font-medium">Stable</span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600">
                      {selectedProduct.performance_trend === 'up' && 
                        `Revenue increased by ${formatPercentage(selectedProduct.trend_percentage)} compared to the previous period.`
                      }
                      {selectedProduct.performance_trend === 'down' && 
                        `Revenue decreased by ${formatPercentage(Math.abs(selectedProduct.trend_percentage || 0))} compared to the previous period.`
                      }
                      {selectedProduct.performance_trend === 'stable' && 
                        'Revenue remained relatively stable compared to the previous period.'
                      }
                    </p>
                  </div>
                  
                  {hasStockData && (
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-gray-600">
                        <strong>Stock Status:</strong> {' '}
                        {selectedProduct.units_in_stock > 10 ? (
                          <span className="text-green-600">Well stocked</span>
                        ) : selectedProduct.units_in_stock > 0 ? (
                          <span className="text-orange-600">Low stock</span>
                        ) : (
                          <span className="text-red-600">Out of stock</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Product Trend Chart */}
            <div className="mt-6">
              <ProductTrendChart 
                productName={selectedProduct.name}
                dateRange={dateRange}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}