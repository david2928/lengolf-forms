import { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { 
  Product, 
  ProductWithCategory, 
  ProductFilters, 
  ProductSort, 
  ProductFormData,
  PaginatedResponse,
  APIResponse,
  ProductListResponse,
  BulkUpdateData
} from '@/types/product-management';

const BASE_URL = '/api/admin/products';

// Custom fetcher for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  return response.json();
};

// Helper to build query string
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams.toString();
}

// Main hook for product management
export function useProducts(initialFilters?: Partial<ProductFilters>) {
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    is_active: true,
    show_in_staff_ui: true,
    ...initialFilters
  });
  
  const [sort, setSort] = useState<ProductSort>({
    field: 'display_order',
    direction: 'asc'
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 100
  });

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Build URL with current filters, sort, and pagination
  const url = useMemo(() => {
    const params = {
      ...filters,
      ...sort,
      sort_field: sort.field,
      sort_direction: sort.direction,
      ...pagination
    };
    return `${BASE_URL}?${buildQueryString(params)}`;
  }, [filters, sort, pagination]);

  // Use SWR for data fetching
  const { 
    data, 
    error, 
    isLoading, 
    mutate: revalidate 
  } = useSWR<ProductListResponse>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000 // 1 minute
  });

  // Products with type safety
  const products = useMemo(() => data?.data || [], [data]);
  const categories = useMemo(() => data?.meta?.categories || [], [data]);
  const paginationMeta = useMemo(() => data?.meta?.pagination, [data]);

  // Filter management
  const updateFilters = useCallback((newFilters: Partial<ProductFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      is_active: true,
      show_in_staff_ui: true
    });
    setPagination({ page: 1, per_page: 100 });
  }, []);

  // Sorting
  const updateSort = useCallback((newSort: Partial<ProductSort>) => {
    setSort(prev => ({ ...prev, ...newSort }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Pagination
  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const changePageSize = useCallback((per_page: number) => {
    setPagination({ page: 1, per_page });
  }, []);

  // Selection management
  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const selectAllProducts = useCallback(() => {
    setSelectedProducts(products.map(p => p.id));
  }, [products]);

  const clearSelection = useCallback(() => {
    setSelectedProducts([]);
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedProducts.length === products.length) {
      clearSelection();
    } else {
      selectAllProducts();
    }
  }, [selectedProducts.length, products.length, clearSelection, selectAllProducts]);

  // Computed values
  const isAllSelected = products.length > 0 && selectedProducts.length === products.length;
  const isPartiallySelected = selectedProducts.length > 0 && selectedProducts.length < products.length;

  return {
    // Data
    products,
    categories,
    pagination: paginationMeta,
    
    // Loading state
    isLoading,
    error,
    
    // Filters
    filters,
    updateFilters,
    clearFilters,
    
    // Sorting
    sort,
    updateSort,
    
    // Pagination
    goToPage,
    changePageSize,
    
    // Selection
    selectedProducts,
    toggleProductSelection,
    selectAllProducts,
    clearSelection,
    toggleSelectAll,
    isAllSelected,
    isPartiallySelected,
    
    // Actions
    revalidate
  };
}

// Hook for individual product management
export function useProduct(productId?: string) {
  const url = productId ? `${BASE_URL}/${productId}` : null;
  
  const { data, error, isLoading, mutate } = useSWR<APIResponse<ProductWithCategory>>(
    url, 
    fetcher,
    {
      revalidateOnFocus: false
    }
  );

  const product = data?.data;

  const updateProduct = useCallback(async (updates: Partial<ProductFormData>) => {
    if (!productId) return null;

    const response = await fetch(`${BASE_URL}/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to update product');
    }

    // Revalidate the data
    await mutate();
    
    return result.data;
  }, [productId, mutate]);

  const deleteProduct = useCallback(async () => {
    if (!productId) return false;

    const response = await fetch(`${BASE_URL}/${productId}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete product');
    }

    return true;
  }, [productId]);

  return {
    product,
    isLoading,
    error,
    updateProduct,
    deleteProduct,
    revalidate: mutate
  };
}

// Hook for creating products
export function useCreateProduct() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProduct = useCallback(async (productData: ProductFormData) => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create product');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    createProduct,
    isCreating,
    error,
    clearError: () => setError(null)
  };
}

// Hook for bulk operations
export function useBulkOperations() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bulkUpdate = useCallback(async (data: BulkUpdateData) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'update_fields',
          product_ids: data.product_ids,
          updates: data.updates,
          reason: data.reason
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update products');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const bulkUpdatePrices = useCallback(async (
    productIds: string[], 
    priceUpdates: any,
    reason?: string
  ) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'update_prices',
          product_ids: productIds,
          updates: priceUpdates,
          reason
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update prices');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const bulkUpdateCategory = useCallback(async (
    productIds: string[], 
    categoryId: string
  ) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'update_category',
          product_ids: productIds,
          updates: { category_id: categoryId }
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update category');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const bulkDelete = useCallback(async (productIds: string[]) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL}/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'delete',
          product_ids: productIds,
          updates: {}
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete products');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    bulkUpdate,
    bulkUpdatePrices,
    bulkUpdateCategory,
    bulkDelete,
    isProcessing,
    error,
    clearError: () => setError(null)
  };
}