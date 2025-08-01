'use client';

import React, { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  sku: string;
  category_name: string;
  parent_category_name: string;
}

interface Category {
  id: string;
  name: string;
  parent_name?: string;
  products: Product[];
}

interface ProductEligibilitySelectorProps {
  selectedProductIds: string[];
  onChange: (productIds: string[]) => void;
}

export function ProductEligibilitySelector({ selectedProductIds, onChange }: ProductEligibilitySelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('products'); // 'products' or 'categories'
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProductsAndCategories();
  }, []);

  const fetchProductsAndCategories = async () => {
    try {
      // Fetch products with category hierarchy from API
      const response = await fetch('/api/admin/products/hierarchy');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch products');
      }
      
      const data = await response.json();
      setProducts(data.products || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching products and categories:', error);
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Group categories by parent for hierarchy display
  const categoryHierarchy = categories.reduce((acc, category) => {
    const parentName = category.parent_name || 'Other';
    if (!acc[parentName]) {
      acc[parentName] = [];
    }
    acc[parentName].push(category);
    return acc;
  }, {} as Record<string, Category[]>);

  // Filter hierarchy based on search
  const filteredHierarchy = Object.entries(categoryHierarchy).filter(([parentName, childCategories]) => {
    if (searchTerm === '') return true;
    const parentMatches = parentName.toLowerCase().includes(searchTerm.toLowerCase());
    const childMatches = childCategories.some(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return parentMatches || childMatches;
  }).reduce((acc, [parentName, childCategories]) => {
    acc[parentName] = childCategories.filter(cat => {
      if (searchTerm === '') return true;
      const parentMatches = parentName.toLowerCase().includes(searchTerm.toLowerCase());
      const childMatches = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
      return parentMatches || childMatches;
    });
    return acc;
  }, {} as Record<string, Category[]>);

  const toggleProduct = (productId: string) => {
    const newSelection = selectedProductIds.includes(productId)
      ? selectedProductIds.filter(id => id !== productId)
      : [...selectedProductIds, productId];
    onChange(newSelection);
  };

  const toggleCategory = (category: Category) => {
    const categoryProductIds = category.products.map(p => p.id);
    const allSelected = categoryProductIds.every(id => selectedProductIds.includes(id));
    
    if (allSelected) {
      // Deselect all products in this category
      onChange(selectedProductIds.filter(id => !categoryProductIds.includes(id)));
    } else {
      // Select all products in this category
      const newSelection = Array.from(new Set([...selectedProductIds, ...categoryProductIds]));
      onChange(newSelection);
    }
  };

  const toggleCategoryOnly = (category: Category, event: React.MouseEvent) => {
    // Prevent the expand/collapse when clicking the checkbox
    event.stopPropagation();
    toggleCategory(category);
  };

  const toggleParentExpansion = (parentName: string) => {
    const newExpanded = new Set(expandedParents);
    if (newExpanded.has(parentName)) {
      newExpanded.delete(parentName);
    } else {
      newExpanded.add(parentName);
    }
    setExpandedParents(newExpanded);
  };

  const toggleCategorySelection = (category: Category) => {
    const categoryProductIds = category.products.map(p => p.id);
    const isSelected = categoryProductIds.every(id => selectedProductIds.includes(id));
    
    if (isSelected) {
      // Deselect all products in this category
      onChange(selectedProductIds.filter(id => !categoryProductIds.includes(id)));
    } else {
      // Select all products in this category
      const newSelection = Array.from(new Set([...selectedProductIds, ...categoryProductIds]));
      onChange(newSelection);
    }
  };

  const selectAll = () => {
    if (selectedTab === 'products') {
      onChange(filteredProducts.map(p => p.id));
    } else {
      const allProductIds = Object.values(filteredHierarchy).flatMap(cats => 
        cats.flatMap(cat => cat.products.map(p => p.id))
      );
      onChange(Array.from(new Set(allProductIds)));
    }
  };

  const getCategorySelectionState = (category: Category) => {
    const categoryProductIds = category.products.map(p => p.id);
    const selectedCount = categoryProductIds.filter(id => selectedProductIds.includes(id)).length;
    
    if (selectedCount === 0) return 'none';
    if (selectedCount === categoryProductIds.length) return 'all';
    return 'partial';
  };

  const clearAll = () => {
    onChange([]);
  };

  if (loading) {
    return <div className="text-center py-4">Loading products...</div>;
  }

  return (
    <div className="border rounded-lg p-4 max-w-full overflow-hidden">
      <div className="mb-4 space-y-3">
        {/* Tab Selection */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setSelectedTab('products')}
            className={`px-4 py-2 text-sm font-medium ${
              selectedTab === 'products'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Browse Products
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('categories')}
            className={`px-4 py-2 text-sm font-medium ${
              selectedTab === 'categories'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Select by Category
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder={selectedTab === 'products' ? 'Search products by name or SKU...' : 'Search categories...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        
        {/* Actions */}
        <div className="flex space-x-3 text-sm">
          <button
            type="button"
            onClick={selectAll}
            className="text-blue-600 hover:text-blue-800"
          >
            Select All Visible
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-red-600 hover:text-red-800"
          >
            Clear All
          </button>
          <span className="text-gray-500">
            {selectedProductIds.length} products selected
          </span>
        </div>
      </div>

      <div className="max-h-80 md:max-h-96 overflow-y-auto border rounded relative">
        {selectedTab === 'products' ? (
          // Individual Products View - Browse and select specific products
          // Individual Products View
          <>
            {filteredProducts.map(product => (
              <label key={product.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b">
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(product.id)}
                  onChange={() => toggleProduct(product.id)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-500">
                    {product.sku && `${product.sku} • `}
                    {product.parent_category_name && `${product.parent_category_name} → `}
                    {product.category_name}
                  </div>
                </div>
              </label>
            ))}
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No products found
              </div>
            )}
          </>
        ) : (
          // Categories View - Select entire categories only (no individual products shown)
          <>
            <div className="bg-blue-50 border-b p-3 text-sm text-blue-700">
              <strong>Category Selection:</strong> Select categories to apply discount to ALL products within those categories.
            </div>
            {Object.entries(filteredHierarchy).map(([parentName, childCategories]) => {
              const isParentExpanded = expandedParents.has(parentName);
              
              return (
                <div key={parentName} className="border-b">
                  {/* Parent Category */}
                  <div 
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                    onClick={() => toggleParentExpansion(parentName)}
                  >
                    <span className="text-gray-400 mr-3">
                      {isParentExpanded ? '▼' : '▶'}
                    </span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{parentName}</div>
                      <div className="text-sm text-gray-600">
                        {childCategories.length} categories
                      </div>
                    </div>
                  </div>
                  
                  {/* Child Categories */}
                  {isParentExpanded && (
                    <div className="ml-6">
                      {childCategories.map(category => {
                        const selectionState = getCategorySelectionState(category);
                        
                        return (
                          <div key={category.id} className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100">
                            <input
                              type="checkbox"
                              checked={selectionState === 'all'}
                              ref={(el) => {
                                if (el) {
                                  el.indeterminate = selectionState === 'partial';
                                }
                              }}
                              onChange={() => toggleCategorySelection(category)}
                              className="mr-3"
                            />
                            <div className="flex-1">
                              <div className="font-medium">{category.name}</div>
                              <div className="text-sm text-gray-500">
                                {category.products.length} products
                                {selectionState === 'all' && <span className="ml-2 text-green-600 font-medium">(Selected)</span>}
                                {selectionState === 'partial' && <span className="ml-2 text-orange-600 font-medium">(Partial)</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            
            {Object.keys(filteredHierarchy).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No categories found
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}