'use client';

import { useState, useEffect, useCallback } from 'react';
import { POSCategory } from '@/types/pos';
import { productCatalogService } from '@/services/ProductCatalogService';

export interface CategoryNavigationState {
  activeTab: string;
  activeCategory: string | null;
  categories: POSCategory[];
  tabCategories: Record<string, POSCategory[]>;
  loading: boolean;
  error: string | null;
}

export interface UseCategoryNavigationOptions {
  initialTab?: string;
  autoLoad?: boolean;
  includeProductCounts?: boolean;
}

export const useCategoryNavigation = (options: UseCategoryNavigationOptions = {}) => {
  const {
    initialTab = 'DRINK',
    autoLoad = true,
    includeProductCounts = true
  } = options;

  const [state, setState] = useState<CategoryNavigationState>({
    activeTab: initialTab,
    activeCategory: null,
    categories: [],
    tabCategories: {},
    loading: autoLoad,
    error: null
  });

  // Load categories from API
  const loadCategories = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await productCatalogService.getCategories(includeProductCounts, true);
      
      setState(prev => ({
        ...prev,
        categories: response.categories,
        tabCategories: response.tabCategories,
        loading: false,
        error: null
      }));
    } catch (error) {
      console.error('Failed to load categories:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load categories'
      }));
    }
  }, [includeProductCounts]);

  // Initialize categories on mount
  useEffect(() => {
    if (autoLoad) {
      loadCategories();
    }
  }, [autoLoad, loadCategories]);

  // Change active tab
  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({
      ...prev,
      activeTab: tab,
      activeCategory: null // Reset category when changing tabs
    }));
  }, []);

  // Change active category
  const setActiveCategory = useCallback((categoryId: string | null) => {
    setState(prev => ({
      ...prev,
      activeCategory: categoryId
    }));
  }, []);

  // Navigate to next tab
  const nextTab = useCallback(() => {
    const availableTabs = Object.keys(state.tabCategories).filter(
      tab => state.tabCategories[tab].length > 0
    );
    const currentIndex = availableTabs.indexOf(state.activeTab);
    const nextIndex = (currentIndex + 1) % availableTabs.length;
    setActiveTab(availableTabs[nextIndex]);
  }, [state.activeTab, state.tabCategories, setActiveTab]);

  // Navigate to previous tab
  const previousTab = useCallback(() => {
    const availableTabs = Object.keys(state.tabCategories).filter(
      tab => state.tabCategories[tab].length > 0
    );
    const currentIndex = availableTabs.indexOf(state.activeTab);
    const previousIndex = currentIndex === 0 ? availableTabs.length - 1 : currentIndex - 1;
    setActiveTab(availableTabs[previousIndex]);
  }, [state.activeTab, state.tabCategories, setActiveTab]);

  // Get categories for current tab
  const getCurrentTabCategories = useCallback((): POSCategory[] => {
    return state.tabCategories[state.activeTab] || [];
  }, [state.activeTab, state.tabCategories]);

  // Get active category object
  const getActiveCategory = useCallback((): POSCategory | null => {
    if (!state.activeCategory) return null;
    return state.categories.find(cat => cat.id === state.activeCategory) || null;
  }, [state.activeCategory, state.categories]);

  // Get tab statistics
  const getTabStats = useCallback(() => {
    return Object.entries(state.tabCategories).reduce((acc, [tab, categories]) => {
      acc[tab] = {
        categoryCount: categories.length,
        productCount: categories.reduce((sum, cat) => sum + (cat.productCount || 0), 0),
        hasProducts: categories.some(cat => (cat.productCount || 0) > 0)
      };
      return acc;
    }, {} as Record<string, { categoryCount: number; productCount: number; hasProducts: boolean }>);
  }, [state.tabCategories]);

  // Get navigation breadcrumbs
  const getBreadcrumbs = useCallback((): string[] => {
    const breadcrumbs: string[] = [];
    
    // Add tab name
    const tabNames = {
      DRINK: 'Drinks',
      FOOD: 'Food',
      GOLF: 'Golf',
      PACKAGES: 'Packages',
      OTHER: 'Other'
    };
    
    breadcrumbs.push(tabNames[state.activeTab as keyof typeof tabNames] || state.activeTab);
    
    // Add category name if active
    const activeCategory = getActiveCategory();
    if (activeCategory) {
      breadcrumbs.push(activeCategory.name);
    }
    
    return breadcrumbs;
  }, [state.activeTab, getActiveCategory]);

  // Check if a tab has products
  const tabHasProducts = useCallback((tab: string): boolean => {
    const categories = state.tabCategories[tab] || [];
    return categories.some(cat => (cat.productCount || 0) > 0);
  }, [state.tabCategories]);

  // Get available tabs (with products)
  const getAvailableTabs = useCallback((): string[] => {
    return Object.keys(state.tabCategories).filter(tab => tabHasProducts(tab));
  }, [state.tabCategories, tabHasProducts]);

  // Reset navigation to initial state
  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeTab: initialTab,
      activeCategory: null
    }));
  }, [initialTab]);

  // Navigate by keyboard shortcuts
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        if (event.ctrlKey) {
          event.preventDefault();
          previousTab();
        }
        break;
      case 'ArrowRight':
        if (event.ctrlKey) {
          event.preventDefault();
          nextTab();
        }
        break;
      case 'Escape':
        if (state.activeCategory) {
          event.preventDefault();
          setActiveCategory(null);
        }
        break;
    }
  }, [previousTab, nextTab, state.activeCategory, setActiveCategory]);

  // Setup keyboard navigation
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardNavigation);
    return () => window.removeEventListener('keydown', handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  return {
    // State
    ...state,
    
    // Actions
    setActiveTab,
    setActiveCategory,
    nextTab,
    previousTab,
    loadCategories,
    reset,
    
    // Computed values
    getCurrentTabCategories,
    getActiveCategory,
    getTabStats,
    getBreadcrumbs,
    getAvailableTabs,
    tabHasProducts,
    
    // Helper flags
    hasCategories: state.categories.length > 0,
    isTabActive: (tab: string) => state.activeTab === tab,
    isCategoryActive: (categoryId: string) => state.activeCategory === categoryId,
    canNavigate: !state.loading && !state.error,
    
    // Navigation info
    currentTabIndex: getAvailableTabs().indexOf(state.activeTab),
    totalTabs: getAvailableTabs().length,
    totalCategoriesInTab: getCurrentTabCategories().length
  };
};