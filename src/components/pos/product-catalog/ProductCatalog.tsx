'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { POSProduct, POSCategory } from '@/types/pos';
import { CategoryTabs } from './CategoryTabs';
import { CategorySubTabs } from './CategorySubTabs';
import { ProductGrid } from './ProductGrid';
import { ModifierSelectionModal } from './ModifierSelectionModal';
import { CustomProductModal } from './CustomProductModal';
import { Search, Filter, Grid, List, ArrowLeft, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

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
  onBack?: () => void; // Add back navigation handler
  showBackButton?: boolean; // Control back button visibility
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
  onCategoryChange,
  onBack,
  showBackButton = false
}) => {
  const [allProducts, setAllProducts] = useState<POSProduct[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [rootCategories, setRootCategories] = useState<any[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<POSProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<POSProduct | null>(null);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [showCustomProductModal, setShowCustomProductModal] = useState(false);
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
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);

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


  // Load categories quickly first, then products
  useEffect(() => {
    const loadCategoriesFirst = async () => {
      try {
        // Load categories immediately for fast UI response
        const categoriesResponse = await fetch('/api/pos/categories/quick');
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          const categories = categoriesData.categories || [];
          
          // Set categories immediately for fast rendering
          setRootCategories(categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            posTabCategory: cat.name.toUpperCase(),
            productCount: cat.totalProductCount || 0,
            displayOrder: cat.display_order || 0,
            children: cat.children || []
          })));
          
          setCategoryData(categories);
          
          // Set initial active tab immediately
          if (categories.length > 0) {
            const categoryToSelect = rememberLastCategory && 
              categories.find((cat: any) => cat.id === rememberLastCategory) 
              ? rememberLastCategory 
              : categories[0].id;
            setActiveTab(categoryToSelect);
          }
        }
      } catch (error) {
        console.error('Failed to load categories quickly:', error);
      }
    };

    loadCategoriesFirst();
  }, []); // Remove activeTab dependency to prevent re-loading

  // Load products separately, only when needed
  useEffect(() => {
    if (!activeTab) return;
    
    const loadProducts = async () => {
      if (allProducts.length > 0) return; // Already loaded
      
      setIsLoading(true);
      try {
        const response = await fetch('/api/pos/products?all=true');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        
        // Filter for active products only
        const activeProducts = data.products.filter((product: POSProduct) => 
          product.isActive && 
          product.name && 
          product.price !== null
        );
        
        setAllProducts(activeProducts);
        
      } catch (error) {
        console.error('Failed to load products:', error);
        setAllProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [activeTab, allProducts.length]);

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
      // Always ensure we have a category selected - never show empty
      setDisplayedProducts([]);
    }
  }, [allProducts, activeTab, activeSubCategory, getProductsForCategory]);

  // Ensure we always have a category selected - never allow empty state
  useEffect(() => {
    if (rootCategories.length > 0 && !activeTab) {
      const categoryToSelect = rememberLastCategory && 
        rootCategories.find((cat: any) => cat.id === rememberLastCategory) 
        ? rememberLastCategory 
        : rootCategories[0].id;
      setActiveTab(categoryToSelect);
    }
  }, [rootCategories, activeTab, rememberLastCategory]);


  // Handle tab change - always ensure a category is selected
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    
    // Always clear subcategory when switching main categories 
    setActiveSubCategory(null);
    
    // Remember this category selection
    onCategoryChange?.(tabId);
    
    // On mobile, switch to products view when category is selected
    if (isMobile) {
      setMobileView('products');
    }
  }, [isMobile, onCategoryChange]);

  // Handle subcategory change
  const handleSubCategoryChange = useCallback((categoryId: string | null) => {
    setActiveSubCategory(categoryId);
  }, []);

  // Handle product selection
  const handleProductSelect = useCallback((product: POSProduct) => {
    // Check if product has modifiers
    if (product.hasModifiers && product.modifiers && product.modifiers.length > 0) {
      // Open modifier modal for products with modifiers
      setSelectedProduct(product);
      setShowModifierModal(true);
      return;
    }

    // Add product directly if no modifiers
    onProductSelect(product, [], '');
  }, [onProductSelect]);

  // Handle product quick add (bypass modifiers or use default)
  const handleProductQuickAdd = useCallback((product: POSProduct) => {
    if (product.hasModifiers && product.modifiers.length > 0) {
      // For products with modifiers, use default modifier for quick add
      const defaultModifier = product.modifiers.find(m => m.isDefault) || product.modifiers[0];
      const modifierData = [{
        modifier_id: defaultModifier.id,
        modifier_name: defaultModifier.name,
        modifier_price: defaultModifier.price,
        modifier_type: defaultModifier.modifierType
      }];
      onProductSelect(product, modifierData, '');
    } else {
      // Regular quick add for products without modifiers
      if (onProductQuickAdd) {
        onProductQuickAdd(product);
      } else {
        onProductSelect(product, [], '');
      }
    }
  }, [onProductQuickAdd, onProductSelect]);

  // Handle modifier modal completion
  const handleModifierComplete = useCallback((
    product: POSProduct,
    selectedModifier: any
  ) => {
    setShowModifierModal(false);
    setSelectedProduct(null);
    
    const modifierData = [{
      modifier_id: selectedModifier.id,
      modifier_name: selectedModifier.name,
      modifier_price: selectedModifier.price,
      modifier_type: selectedModifier.modifierType
    }];
    
    onProductSelect(product, modifierData, '');
  }, [onProductSelect]);

  // Handle modifier modal quick add
  const handleModifierQuickAdd = useCallback((
    product: POSProduct,
    defaultModifier: any
  ) => {
    setShowModifierModal(false);
    setSelectedProduct(null);
    
    const modifierData = [{
      modifier_id: defaultModifier.id,
      modifier_name: defaultModifier.name,
      modifier_price: defaultModifier.price,
      modifier_type: defaultModifier.modifierType
    }];
    
    onProductSelect(product, modifierData, '');
  }, [onProductSelect]);

  // Handle modifier modal cancel
  const handleModifierCancel = useCallback(() => {
    setShowModifierModal(false);
    setSelectedProduct(null);
  }, []);

  // Handle custom product creation
  const handleCustomProductCreate = useCallback(() => {
    setShowCustomProductModal(true);
  }, []);

  // Handle custom product modal completion
  const handleCustomProductCreated = useCallback((product: POSProduct) => {
    setShowCustomProductModal(false);
    // Directly add the custom product to the order
    onProductSelect(product, [], '');
  }, [onProductSelect]);

  // Handle custom product modal cancel
  const handleCustomProductCancel = useCallback(() => {
    setShowCustomProductModal(false);
  }, []);

  // Swipe gesture handlers for mobile navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    setSwipeStartX(touch.clientX);
    setSwipeStartY(touch.clientY);
  }, [isMobile]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || swipeStartX === null || swipeStartY === null) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;
    
    // Only trigger swipe if horizontal movement is significant and vertical is minimal
    const minSwipeDistance = 100;
    const maxVerticalDrift = 50;
    
    if (Math.abs(deltaY) < maxVerticalDrift && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // Swipe right - go back
        handleBackNavigation();
      }
    }
    
    setSwipeStartX(null);
    setSwipeStartY(null);
  }, [isMobile, swipeStartX, swipeStartY]);

  // Enhanced back navigation logic - always consistent
  const handleBackNavigation = useCallback(() => {
    if (isMobile) {
      if (mobileView === 'products') {
        // Always go back to categories from products view
        setMobileView('categories');
        // Clear subcategory selection when going back to categories
        setActiveSubCategory(null);
      } else if (onBack) {
        // If in categories view and onBack is provided, call it (go back to table management)
        onBack();
      }
    } else if (onBack) {
      // Desktop: direct back navigation
      onBack();
    }
  }, [isMobile, mobileView, onBack]);

  // Handle keyboard navigation (ESC key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBackNavigation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleBackNavigation]);

  // Swipe gesture for tablet navigation
  const swipeRef = useSwipeGesture({
    onSwipeRight: () => {
      // Swipe right to go back (more intuitive on tablets)
      handleBackNavigation();
    },
    threshold: 80, // Require longer swipe for tablets
    restraint: 150, // Allow more vertical movement during swipe
    allowedTime: 600 // Give more time for tablet swipes
  });

  // Get current subcategories for the active tab
  const getCurrentSubCategories = () => {
    const activeCategory = rootCategories.find(cat => cat.id === activeTab);
    return activeCategory?.children || [];
  };

  const currentSubCategories = getCurrentSubCategories();

  return (
    <div 
      ref={swipeRef as any}
      className={`product-catalog flex flex-col h-full ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {isMobile ? (
        // Mobile Layout: Card-based navigation with swipe support
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
                {/* Enhanced Header with Back Button */}
                <div className="flex items-center mb-6">
                  {showBackButton && onBack && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onBack}
                      className="mr-4 px-3 py-2"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {/* Regular Categories */}
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

                  {/* Custom Product Button - At Bottom, Less Prominent */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rootCategories.length * 0.1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={handleCustomProductCreate}
                      variant="outline"
                      className="w-full h-12 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-600 font-normal"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Custom Product
                    </Button>
                  </motion.div>
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
                    {/* Always show back to categories - consistent behavior */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMobileView('categories');
                        setActiveSubCategory(null); // Clear subcategory when going back
                      }}
                      className="mr-4 px-3 py-2"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Categories
                    </Button>
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-gray-900">
                        {activeSubCategory 
                          ? categoryData.find(cat => cat.id === activeSubCategory)?.name || 'Products'
                          : rootCategories.find(cat => cat.id === activeTab)?.name || 'Products'
                        }
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
        // Desktop Layout: Traditional tabs with back navigation
        <>
          {/* Desktop Header with Back Button */}
          {showBackButton && onBack && (
            <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBack}
                  className="mr-4 px-3 py-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <div className="text-sm text-gray-600">
                  Product Selection
                </div>
              </div>
            </div>
          )}
          
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
            <div className="h-full p-4 flex flex-col">
              <div className="flex-1">
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
              
              {/* Custom Product Button - Desktop Bottom, Less Prominent */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleCustomProductCreate}
                  variant="ghost"
                  className="w-full h-10 text-gray-500 hover:text-gray-700 hover:bg-gray-100 font-normal text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Product
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Product Modifier Modal */}
      <ModifierSelectionModal
        product={selectedProduct}
        isOpen={showModifierModal}
        onComplete={handleModifierComplete}
        onQuickAdd={handleModifierQuickAdd}
        onCancel={handleModifierCancel}
      />

      {/* Custom Product Modal */}
      <CustomProductModal
        isOpen={showCustomProductModal}
        onClose={handleCustomProductCancel}
        onProductCreated={handleCustomProductCreated}
        staffName="Staff" // TODO: Get actual staff name from session/auth
      />
    </div>
  );

};