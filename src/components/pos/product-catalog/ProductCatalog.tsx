'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { POSProduct, POSCategory } from '@/types/pos';
import { CategoryTabs } from './CategoryTabs';
import { CategorySubTabs } from './CategorySubTabs';
import { ProductGrid } from './ProductGrid';
import { ProductModifierModal } from './ProductModifierModal';
import { Search, Filter, Grid, List, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ProductCatalogProps {
  onProductSelect: (product: POSProduct, modifiers?: any[], notes?: string) => void;
  onProductQuickAdd?: (product: POSProduct) => void;
  showSearch?: boolean;
  showFilters?: boolean;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  className?: string;
  rememberLastCategory?: string | null;
  onCategoryChange?: (categoryId: string) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  onProductSelect,
  onProductQuickAdd,
  showSearch = true,
  showFilters = true,
  viewMode = 'grid',
  onViewModeChange,
  className = '',
  rememberLastCategory,
  onCategoryChange
}) => {
  const [allProducts, setAllProducts] = useState<POSProduct[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [rootCategories, setRootCategories] = useState<any[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<POSProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<POSProduct | null>(null);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mobileView, setMobileView] = useState<'categories' | 'products'>(
    rememberLastCategory ? 'products' : 'categories'
  );

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle remembered category on mobile
  useEffect(() => {
    if (isMobile && rememberLastCategory && activeTab === rememberLastCategory) {
      // If we have a remembered category and we're on mobile, stay on products view
      setMobileView('products');
    }
  }, [isMobile, rememberLastCategory, activeTab]);

  // Ensure we always have a category selected
  useEffect(() => {
    if (rootCategories.length > 0 && !activeTab) {
      // If no active tab is set but we have categories, select the first one
      setActiveTab(rootCategories[0].id);
    }
  }, [rootCategories, activeTab]);

  // Load all products and categories on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load ALL products for client-side filtering - better for POS performance
        const response = await fetch('/api/pos/products?all=true');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        
        // Filter for active products only and those that should show in UI
        const activeProducts = data.products.filter((product: POSProduct) => 
          product.isActive && 
          product.name && 
          product.price !== null
        );
        
        setAllProducts(activeProducts);
        
        // Use the hierarchical categories data that comes from API
        const categories = data.categories || [];
        setCategoryData(categories);
        
        // Build root categories with product counts
        const rootCats = categories.map((rootCat: any) => {
          // Get all category IDs for this root category and its children
          const allCategoryIds = getAllCategoryIds(rootCat);
          
          // Count products that belong to this category tree
          const productCount = activeProducts.filter((product: POSProduct) => 
            allCategoryIds.includes(product.categoryId)
          ).length;
          
          return {
            id: rootCat.id,
            name: rootCat.name,
            posTabCategory: rootCat.name.toUpperCase(),
            productCount,
            displayOrder: rootCat.display_order || 0,
            children: rootCat.children || []
          };
        }).filter((cat: any) => cat.productCount > 0); // Only show categories with products
        
        setRootCategories(rootCats);
        
        // Set initial active tab - use remembered category or first available
        if (rootCats.length > 0) {
          const categoryToSelect = rememberLastCategory && rootCats.find((cat: any) => cat.id === rememberLastCategory) 
            ? rememberLastCategory 
            : rootCats[0].id;
          setActiveTab(categoryToSelect);
        }
        
      } catch (error) {
        console.error('Failed to load products:', error);
        setAllProducts([]);
        setCategoryData([]);
        setRootCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [activeTab]);

  // Helper function to get all category IDs recursively (including root)
  const getAllCategoryIds = (category: any): string[] => {
    const ids = [category.id];
    
    if (category.children && category.children.length > 0) {
      category.children.forEach((child: any) => {
        ids.push(...getAllCategoryIds(child));
      });
    }
    
    return ids;
  };

  // Get products for a specific category (including all child categories)
  const getProductsForCategory = useCallback((categoryId: string): POSProduct[] => {
    // Find the category in our hierarchical data
    const findCategory = (cats: any[], id: string): any => {
      for (const cat of cats) {
        if (cat.id === id) return cat;
        if (cat.children && cat.children.length > 0) {
          const found = findCategory(cat.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const category = findCategory(categoryData, categoryId);
    if (!category) {
      return [];
    }
    
    // Get all category IDs for this category and its children
    const allCategoryIds = getAllCategoryIds(category);
    
    // Return products that belong to any of these categories
    const filteredProducts = allProducts.filter(product => allCategoryIds.includes(product.categoryId));
    
    return filteredProducts;
  }, [allProducts, categoryData]);

  // Update displayed products when tab/category changes
  useEffect(() => {
    if (activeTab) {
      if (activeSubCategory) {
        // Show products from specific subcategory
        const products = getProductsForCategory(activeSubCategory);
        setDisplayedProducts(products);
      } else {
        // Show all products from the main category and its children
        const products = getProductsForCategory(activeTab);
        setDisplayedProducts(products);
      }
    } else {
      // No tab selected - show empty (force category selection)
      setDisplayedProducts([]);
    }
  }, [allProducts, activeTab, activeSubCategory, getProductsForCategory]);


  // Handle tab change
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    
    // Auto-select first subcategory if available
    const selectedCategory = categoryData.find((cat: any) => cat.id === tabId);
    if (selectedCategory?.children && selectedCategory.children.length > 0) {
      setActiveSubCategory(selectedCategory.children[0].id);
    } else {
      setActiveSubCategory(null);
    }
    
    // Remember this category selection
    onCategoryChange?.(tabId);
    
    // On mobile, switch to products view when category is selected
    if (isMobile) {
      setMobileView('products');
    }
  }, [isMobile, categoryData, onCategoryChange]);

  // Handle subcategory change
  const handleSubCategoryChange = useCallback((categoryId: string | null) => {
    setActiveSubCategory(categoryId);
  }, []);

  // Handle product selection
  const handleProductSelect = useCallback((product: POSProduct) => {
    // Check if product has modifiers that require selection
    if (product.modifiers && product.modifiers.length > 0) {
      const requiredModifiers = product.modifiers.filter(mod => mod.required);
      
      if (requiredModifiers.length > 0) {
        // Open modifier modal for products with required modifiers
        setSelectedProduct(product);
        setShowModifierModal(true);
        return;
      }
    }

    // Add product directly if no required modifiers
    onProductSelect(product, [], '');
  }, [onProductSelect]);

  // Handle product quick add (bypass modifiers)
  const handleProductQuickAdd = useCallback((product: POSProduct) => {
    if (onProductQuickAdd) {
      onProductQuickAdd(product);
    } else {
      // Fallback to regular selection without modifiers
      onProductSelect(product, [], '');
    }
  }, [onProductQuickAdd, onProductSelect]);

  // Handle modifier modal completion
  const handleModifierComplete = useCallback((
    product: POSProduct,
    selectedModifiers: any[],
    notes: string
  ) => {
    setShowModifierModal(false);
    setSelectedProduct(null);
    onProductSelect(product, selectedModifiers, notes);
  }, [onProductSelect]);

  // Handle modifier modal cancel
  const handleModifierCancel = useCallback(() => {
    setShowModifierModal(false);
    setSelectedProduct(null);
  }, []);

  // Get current subcategories for the active tab
  const getCurrentSubCategories = () => {
    const activeCategory = rootCategories.find(cat => cat.id === activeTab);
    return activeCategory?.children || [];
  };

  const currentSubCategories = getCurrentSubCategories();

  return (
    <div className={`product-catalog flex flex-col h-full ${className}`}>
      {isMobile ? (
        // Mobile Layout: Card-based navigation
        <div className="h-full flex flex-col">
          <AnimatePresence mode="wait">
            {mobileView === 'categories' || !activeTab ? (
              // Mobile Category Selection
              <motion.div
                key="categories"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.2 }}
                className="h-full overflow-y-auto p-4"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Categories</h2>
                  <p className="text-gray-600">Select a category to browse products</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {rootCategories.map((category, index) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div
                        className={cn(
                          "p-6 border-2 rounded-xl cursor-pointer transition-all duration-200",
                          "hover:shadow-lg active:shadow-md bg-white",
                          activeTab === category.id && "border-blue-500 bg-blue-50"
                        )}
                        onClick={() => handleTabChange(category.id)}
                        style={{
                          borderLeftColor: category.colorTheme || '#6B7280',
                          borderLeftWidth: '6px'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div 
                              className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-white text-lg"
                              style={{ 
                                backgroundColor: category.colorTheme || '#6B7280'
                              }}
                            >
                              {category.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900">{category.name}</h3>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              // Mobile Product View
              <motion.div
                key="products"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                {/* Mobile Products Header */}
                <div className="p-4 bg-white border-b border-gray-200">
                  <div className="flex items-center mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMobileView('categories')}
                      className="mr-4 px-3 py-2"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Categories
                    </Button>
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-gray-900">
                        {rootCategories.find(cat => cat.id === activeTab)?.name || 'Products'}
                      </h1>
                    </div>
                  </div>
                  
                  
                  {/* Subcategory Buttons */}
                  {currentSubCategories.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {currentSubCategories.map((subCat: any) => (
                        <Button
                          key={subCat.id}
                          variant={activeSubCategory === subCat.id ? "default" : "outline"}
                          className={cn(
                            "h-12 text-sm font-medium",
                            activeSubCategory === subCat.id && "bg-blue-600 text-white"
                          )}
                          onClick={() => handleSubCategoryChange(subCat.id)}
                        >
                          {subCat.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mobile Product Grid */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                    <ProductGrid
                      products={displayedProducts}
                      onProductSelect={handleProductSelect}
                      onProductQuickAdd={handleProductQuickAdd}
                      loading={isLoading}
                      viewMode="grid"
                      enableLazyLoading={false}
                      enableVirtualization={false}
                      itemsPerPage={6}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        // Desktop Layout: Traditional tabs
        <>
          {/* Category Navigation */}
          <div className="flex-shrink-0 border-b border-gray-200">
            <CategoryTabs
              categories={rootCategories}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              showProductCounts={false}
            />
            
            {/* Subcategory tabs if available */}
            {currentSubCategories.length > 1 && (
              <CategorySubTabs
                categories={currentSubCategories
                  .map((subCat: any) => ({
                    id: subCat.id,
                    name: subCat.name,
                    parentId: subCat.parent_id,
                    posTabCategory: subCat.posTabCategory,
                    displayOrder: subCat.display_order || 0,
                    colorTheme: subCat.color_code || '#6B7280',
                    icon: subCat.icon,
                    description: subCat.description,
                    isActive: subCat.is_active,
                    productCount: getProductsForCategory(subCat.id).length
                  }))
                  .filter((subCat: any) => subCat.productCount > 0)
                }
                activeCategory={activeSubCategory || undefined}
                onCategoryChange={handleSubCategoryChange}
                showProductCounts={false}
              />
            )}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full p-4">
              <ProductGrid
                products={displayedProducts}
                onProductSelect={handleProductSelect}
                onProductQuickAdd={handleProductQuickAdd}
                loading={isLoading}
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
                enableLazyLoading={false}
                enableVirtualization={false}
                itemsPerPage={6}
              />
            </div>
          </div>
        </>
      )}

      {/* Product Modifier Modal */}
      {selectedProduct && (
        <ProductModifierModal
          product={selectedProduct}
          isOpen={showModifierModal}
          onComplete={handleModifierComplete}
          onCancel={handleModifierCancel}
        />
      )}
    </div>
  );

};