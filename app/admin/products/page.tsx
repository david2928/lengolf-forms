'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Archive, Filter, RefreshCw, CheckCircle, DollarSign, TrendingUp, Percent } from 'lucide-react';

// Product Management Components
import {
  ProductListTable,
  ProductFiltersComponent,
  ProductPagination,
  ProductForm,
  CategoryForm,
  QuickActions,
  QuickSearch,
  ActionBar
} from '@/components/admin/products';

// Hooks and Types
import { useProducts, useCreateProduct } from '@/hooks/use-products';
import { useCategories } from '@/hooks/use-categories';
import { useProductAnalytics } from '@/hooks/use-product-analytics';
import { 
  ProductFormData, 
  CategoryFormData,
  Product,
  Category
} from '@/types/product-management';

export default function ProductManagementPage() {
  // State for dialogs
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showInactiveCategories, setShowInactiveCategories] = useState(false);

  // Hooks
  const {
    products,
    categories: categoriesFromProducts,
    pagination,
    isLoading: productsLoading,
    error: productsError,
    filters,
    sort,
    selectedProducts,
    updateFilters,
    updateSort,
    goToPage,
    changePageSize,
    toggleProductSelection,
    selectAllProducts,
    clearSelection,
    revalidate: refreshProducts
  } = useProducts();

  const { createProduct, isCreating } = useCreateProduct();

  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    revalidate: refreshCategories
  } = useCategories({ 
    is_active: showInactiveCategories ? undefined : true 
  });

  const {
    analytics,
    isLoading: analyticsLoading,
    revalidate: refreshAnalytics
  } = useProductAnalytics();

  // Handlers
  const handleCreateProduct = async (data: ProductFormData) => {
    await createProduct(data);
    setShowProductForm(false);
    refreshProducts();
  };

  const handleUpdateProduct = async (data: ProductFormData) => {
    if (editingProduct) {
      try {
        const response = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update product');
        }

        // Success - ProductForm will handle closing and refresh
        // Don't refresh here to avoid state conflicts
      } catch (error) {
        // Re-throw error so ProductForm can handle it and show error toast
        throw error;
      }
    }
  };

  const handleCreateCategory = async (data: CategoryFormData) => {
    try {
      const response = await fetch('/api/admin/products/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create category');
      }

      // Success - CategoryForm will handle closing and refresh
      // Don't refresh here to avoid state conflicts
    } catch (error) {
      // Re-throw error so CategoryForm can handle it and show error toast
      throw error;
    }
  };

  const handleUpdateCategory = async (data: CategoryFormData) => {
    if (editingCategory) {
      try {
        const response = await fetch(`/api/admin/products/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update category');
        }

        // Success - CategoryForm will handle closing and refresh
        // Don't refresh here to avoid state conflicts
      } catch (error) {
        // Re-throw error so CategoryForm can handle it and show error toast
        throw error;
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedProducts.length > 0) {
      const confirmed = window.confirm(
        `Are you sure you want to delete ${selectedProducts.length} selected product(s)?`
      );
      if (confirmed) {
        // For now, just clear selection - we'll implement delete later
        console.log('Delete products:', selectedProducts);
        clearSelection();
        refreshProducts();
      }
    }
  };

  const handleRefresh = () => {
    refreshProducts();
    refreshCategories();
    refreshAnalytics();
  };

  const handleExport = async () => {
    try {
      // Export products to CSV
      const response = await fetch('/api/admin/products/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const response = await fetch('/api/admin/products/import', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            handleRefresh();
          }
        } catch (error) {
          console.error('Import failed:', error);
        }
      }
    };
    input.click();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    updateFilters({ ...filters, search: query });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    updateFilters({ ...filters, search: '' });
  };

  // Check if any data is loading
  const isLoading = productsLoading || categoriesLoading || analyticsLoading;
  
  // Check for errors
  const hasError = productsError || categoriesError;

  return (
    <div className="container mx-auto py-3 sm:py-6 space-y-4 sm:space-y-6 px-3 sm:px-4">
      {/* Page Header */}
      <ActionBar
        title="Product Management"
        subtitle="Manage products, categories, and pricing for your POS system"
      >
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 w-full sm:w-auto">
          <QuickSearch
            value={searchQuery}
            onChange={handleSearch}
            onClear={handleClearSearch}
            placeholder="Search products..."
            className="w-full sm:w-auto sm:mr-4"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex-1 sm:flex-initial sm:mr-2"
            >
              <Filter className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Filters</span>
              <span className="sm:hidden">Filter</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex-1 sm:flex-initial"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">Sync</span>
            </Button>
          </div>
        </div>
      </ActionBar>

      {/* Error Display */}
      {hasError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800">
              {productsError || categoriesError || 'An error occurred while loading data.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <QuickActions
        onCreateProduct={() => {
          setEditingProduct(undefined);
          setShowProductForm(true);
        }}
        onCreateCategory={() => {
          setEditingCategory(undefined);
          setShowCategoryForm(true);
        }}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onImport={handleImport}
        isLoading={isLoading}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          {/* Overview Cards */}
          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Products</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{products.filter(p => p.is_active).length}</div>
                  <p className="text-xs text-muted-foreground">
                    {products.length > 0 ? ((products.filter(p => p.is_active).length / products.length) * 100).toFixed(1) : 0}% of total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Price</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ฿{products.length > 0 ? Math.round(products.reduce((sum, p) => sum + p.price, 0) / products.length).toLocaleString() : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average product price
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">With Cost Data</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{products.filter(p => p.cost && p.cost > 0).length}</div>
                  <p className="text-xs text-muted-foreground">
                    {products.length > 0 ? ((products.filter(p => p.cost && p.cost > 0).length / products.length) * 100).toFixed(1) : 0}% have cost data
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Profit Margin</CardTitle>
                  <Percent className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(() => {
                      const productsWithMargin = products.filter(p => p.profit_margin != null);
                      if (productsWithMargin.length === 0) return "N/A";
                      const avgMargin = productsWithMargin.reduce((sum, p) => sum + (p.profit_margin || 0), 0) / productsWithMargin.length;
                      return `${avgMargin.toFixed(1)}%`;
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {products.filter(p => p.profit_margin != null).length} products with margin
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductFiltersComponent
                  filters={filters}
                  categories={categories}
                  onFiltersChange={updateFilters}
                  onClearFilters={() => updateFilters({ search: '', category_id: '', is_active: true })}
                />
              </CardContent>
            </Card>
          )}

          {/* Bulk Actions */}
          {selectedProducts.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedProducts.length} product(s) selected
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      Clear Selection
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                      Delete Selected
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products Table */}
          <Card>
            <CardContent className="p-0">
              <ProductListTable
                products={products}
                selectedProducts={selectedProducts}
                onProductSelect={toggleProductSelection}
                onSelectAll={selectAllProducts}
                isAllSelected={products.length > 0 && selectedProducts.length === products.length}
                isPartiallySelected={selectedProducts.length > 0 && selectedProducts.length < products.length}
                sort={sort}
                onSortChange={updateSort}
                onProductEdit={(product) => {
                  setEditingProduct(product);
                  setShowProductForm(true);
                }}
                onProductView={(product) => {
                  setEditingProduct(product);
                  setShowProductForm(true);
                }}
                isLoading={productsLoading}
              />
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination && (
            <ProductPagination
              pagination={pagination}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
            />
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-lg sm:text-xl">Category Management</CardTitle>
                  {!categoriesLoading && (
                    <p className="text-sm text-gray-500">
                      {categories.length} {showInactiveCategories ? 'total' : 'active'} categories
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showInactiveCategories ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowInactiveCategories(!showInactiveCategories)}
                    className="text-xs sm:text-sm"
                  >
                    {showInactiveCategories ? "Hide Inactive" : "Show Inactive"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {categoriesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
                    <p className="text-sm">Loading categories...</p>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">
                      {showInactiveCategories 
                        ? "No inactive categories found." 
                        : "No active categories found. Create your first category to get started."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Group categories by parent */}
                    {(() => {
                      const parentCategories = categories.filter(c => !c.parent_id);
                      const childCategoriesByParent = categories.reduce((acc, cat) => {
                        if (cat.parent_id) {
                          if (!acc[cat.parent_id]) acc[cat.parent_id] = [];
                          acc[cat.parent_id].push(cat);
                        }
                        return acc;
                      }, {} as Record<string, typeof categories>);

                      return parentCategories.map((parent) => (
                        <div key={parent.id} className="space-y-2">
                          {/* Parent Category */}
                          <Card className={`p-3 sm:p-4 ${parent.is_active ? 'bg-gray-50' : 'bg-red-50 border-red-200'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                {parent.color_code && (
                                  <div
                                    className="w-4 h-4 rounded flex-shrink-0 mt-0.5 sm:mt-0"
                                    style={{ backgroundColor: parent.color_code }}
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className={`font-semibold text-base sm:text-lg truncate ${!parent.is_active ? 'text-gray-500 line-through' : ''}`}>{parent.name}</h3>
                                    {!parent.is_active && (
                                      <Badge variant="destructive" className="text-xs">
                                        Inactive
                                      </Badge>
                                    )}
                                  </div>
                                  {parent.description && (
                                    <p className={`text-xs sm:text-sm line-clamp-2 ${!parent.is_active ? 'text-gray-400' : 'text-gray-600'}`}>{parent.description}</p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">
                                    {childCategoriesByParent[parent.id]?.length || 0} subcategories
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingCategory(parent);
                                    setShowCategoryForm(true);
                                  }}
                                  className="text-xs sm:text-sm"
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    const confirmed = window.confirm(
                                      `Are you sure you want to delete "${parent.name}"? This will also affect its subcategories.`
                                    );
                                    if (confirmed) {
                                      console.log('Delete category:', parent.id);
                                      refreshCategories();
                                    }
                                  }}
                                  className="text-xs sm:text-sm"
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </Card>

                          {/* Child Categories */}
                          {childCategoriesByParent[parent.id] && (
                            <div className="ml-4 sm:ml-8 space-y-2">
                              {childCategoriesByParent[parent.id].map((child) => (
                                <Card key={child.id} className={`p-3 sm:p-4 ${child.is_active ? '' : 'bg-red-50 border-red-200'}`}>
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                      <div className="w-1 h-6 sm:h-8 bg-gray-300 -ml-2 sm:-ml-4 mt-1 sm:mt-0 flex-shrink-0" />
                                      {child.color_code && (
                                        <div
                                          className="w-4 h-4 rounded flex-shrink-0 mt-0.5 sm:mt-0"
                                          style={{ backgroundColor: child.color_code }}
                                        />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h3 className={`font-medium text-sm sm:text-base truncate ${!child.is_active ? 'text-gray-500 line-through' : ''}`}>{child.name}</h3>
                                          {!child.is_active && (
                                            <Badge variant="destructive" className="text-xs">
                                              Inactive
                                            </Badge>
                                          )}
                                        </div>
                                        {child.description && (
                                          <p className={`text-xs sm:text-sm line-clamp-2 ${!child.is_active ? 'text-gray-400' : 'text-gray-600'}`}>{child.description}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setEditingCategory(child);
                                          setShowCategoryForm(true);
                                        }}
                                        className="text-xs sm:text-sm"
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                          const confirmed = window.confirm(
                                            `Are you sure you want to delete "${child.name}"?`
                                          );
                                          if (confirmed) {
                                            console.log('Delete category:', child.id);
                                            refreshCategories();
                                          }
                                        }}
                                        className="text-xs sm:text-sm"
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Product Form Dialog */}
      <ProductForm
        isOpen={showProductForm}
        product={editingProduct}
        categories={categories}
        onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
        onCancel={() => {
          setShowProductForm(false);
          setEditingProduct(undefined);
          // Refresh products when form closes (handles both success and cancel)
          refreshProducts();
        }}
        isLoading={productsLoading}
      />

      {/* Category Form Dialog */}
      <CategoryForm
        isOpen={showCategoryForm}
        category={editingCategory}
        parentCategories={categories.filter(c => !c.parent_id)}
        onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
        onCancel={() => {
          setShowCategoryForm(false);
          setEditingCategory(undefined);
        }}
        isLoading={categoriesLoading}
      />
    </div>
  );
}