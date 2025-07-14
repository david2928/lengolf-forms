import { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { 
  Category, 
  CategoryWithProducts, 
  CategoryFilters, 
  CategorySort, 
  CategoryFormData,
  CategoryHierarchy,
  APIResponse,
  CategoryListResponse
} from '@/types/product-management';

const BASE_URL = '/api/admin/products/categories';

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

// Main hook for category management
export function useCategories(initialFilters?: Partial<CategoryFilters>) {
  const [filters, setFilters] = useState<CategoryFilters>({
    search: '',
    is_active: true,
    ...initialFilters
  });
  
  const [sort, setSort] = useState<CategorySort>({
    field: 'display_order',
    direction: 'asc'
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 50
  });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Build URL with current filters, sort, and pagination
  const url = useMemo(() => {
    const params = {
      ...filters,
      sort_field: sort.field,
      sort_direction: sort.direction,
      ...pagination,
      include_hierarchy: true,
      include_product_count: true
    };
    return `${BASE_URL}?${buildQueryString(params)}`;
  }, [filters, sort, pagination]);

  // Use SWR for data fetching
  const { 
    data, 
    error, 
    isLoading, 
    mutate: revalidate 
  } = useSWR<CategoryListResponse>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000 // 1 minute
  });

  // Categories with type safety
  const categories = useMemo(() => data?.data || [], [data]);
  const hierarchy = useMemo(() => data?.meta?.hierarchy || [], [data]);
  const paginationMeta = useMemo(() => data?.meta?.pagination, [data]);

  // Filter management
  const updateFilters = useCallback((newFilters: Partial<CategoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      is_active: true
    });
    setPagination({ page: 1, per_page: 50 });
  }, []);

  // Sorting
  const updateSort = useCallback((newSort: Partial<CategorySort>) => {
    setSort(prev => ({ ...prev, ...newSort }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Pagination
  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  // Category selection and expansion
  const selectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
  }, []);

  const toggleCategoryExpansion = useCallback((categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const expandAllCategories = useCallback(() => {
    const allCategoryIds = categories.map(c => c.id);
    setExpandedCategories(allCategoryIds);
  }, [categories]);

  const collapseAllCategories = useCallback(() => {
    setExpandedCategories([]);
  }, []);

  // Utility functions
  const getCategoryPath = useCallback((categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '';
    
    if (category.parent) {
      return `${category.parent.name} > ${category.name}`;
    }
    
    return category.name;
  }, [categories]);

  const getTopLevelCategories = useCallback((): CategoryWithProducts[] => {
    return categories.filter(c => !c.parent_id);
  }, [categories]);

  const getSubCategories = useCallback((parentId: string): CategoryWithProducts[] => {
    return categories.filter(c => c.parent_id === parentId);
  }, [categories]);

  const getCategoryBySlug = useCallback((slug: string): CategoryWithProducts | undefined => {
    return categories.find(c => c.slug === slug);
  }, [categories]);

  return {
    // Data
    categories,
    hierarchy,
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
    
    // Selection and expansion
    selectedCategory,
    selectCategory,
    expandedCategories,
    toggleCategoryExpansion,
    expandAllCategories,
    collapseAllCategories,
    
    // Utility functions
    getCategoryPath,
    getTopLevelCategories,
    getSubCategories,
    getCategoryBySlug,
    
    // Actions
    revalidate
  };
}

// Hook for individual category management
export function useCategory(categoryId?: string) {
  const url = categoryId ? `${BASE_URL}/${categoryId}` : null;
  
  const { data, error, isLoading, mutate } = useSWR<APIResponse<CategoryWithProducts>>(
    url, 
    fetcher,
    {
      revalidateOnFocus: false
    }
  );

  const category = data?.data;

  const updateCategory = useCallback(async (updates: Partial<CategoryFormData>) => {
    if (!categoryId) return null;

    const response = await fetch(`${BASE_URL}/${categoryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to update category');
    }

    // Revalidate the data
    await mutate();
    
    return result.data;
  }, [categoryId, mutate]);

  const deleteCategory = useCallback(async () => {
    if (!categoryId) return false;

    const response = await fetch(`${BASE_URL}/${categoryId}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete category');
    }

    return true;
  }, [categoryId]);

  return {
    category,
    isLoading,
    error,
    updateCategory,
    deleteCategory,
    revalidate: mutate
  };
}

// Hook for creating categories
export function useCreateCategory() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCategory = useCallback(async (categoryData: CategoryFormData) => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create category');
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
    createCategory,
    isCreating,
    error,
    clearError: () => setError(null)
  };
}

// Hook for category hierarchy navigation
export function useCategoryHierarchy() {
  const { hierarchy, isLoading, error, revalidate } = useCategories();

  const findCategoryInHierarchy = useCallback((
    categoryId: string, 
    searchIn: CategoryHierarchy[] = hierarchy
  ): CategoryHierarchy | null => {
    for (const category of searchIn) {
      if (category.id === categoryId) {
        return category;
      }
      
      if (category.children.length > 0) {
        const found = findCategoryInHierarchy(categoryId, category.children);
        if (found) return found;
      }
    }
    
    return null;
  }, [hierarchy]);

  const getCategoryAncestors = useCallback((categoryId: string): CategoryHierarchy[] => {
    const ancestors: CategoryHierarchy[] = [];
    
    function findAncestors(
      targetId: string, 
      searchIn: CategoryHierarchy[] = hierarchy, 
      currentPath: CategoryHierarchy[] = []
    ): boolean {
      for (const category of searchIn) {
        const newPath = [...currentPath, category];
        
        if (category.id === targetId) {
          ancestors.push(...currentPath);
          return true;
        }
        
        if (category.children.length > 0) {
          if (findAncestors(targetId, category.children, newPath)) {
            return true;
          }
        }
      }
      
      return false;
    }
    
    findAncestors(categoryId);
    return ancestors;
  }, [hierarchy]);

  const getCategoryDepth = useCallback((categoryId: string): number => {
    return getCategoryAncestors(categoryId).length;
  }, [getCategoryAncestors]);

  const getFlatCategoriesList = useCallback((): CategoryHierarchy[] => {
    const flatList: CategoryHierarchy[] = [];
    
    function flattenHierarchy(categories: CategoryHierarchy[]) {
      for (const category of categories) {
        flatList.push(category);
        if (category.children.length > 0) {
          flattenHierarchy(category.children);
        }
      }
    }
    
    flattenHierarchy(hierarchy);
    return flatList;
  }, [hierarchy]);

  return {
    hierarchy,
    isLoading,
    error,
    findCategoryInHierarchy,
    getCategoryAncestors,
    getCategoryDepth,
    getFlatCategoriesList,
    revalidate
  };
}