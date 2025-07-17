/**
 * Product Mapping Admin Page
 * Allows staff to manually map unmapped POS products to existing products or create new ones
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  AlertCircle, 
  CheckCircle,
  Link2,
  Search,
  Filter,
  Loader2,
  Plus,
  Edit,
  DollarSign,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface UnmappedProduct {
  pos_product_name: string;
  usage_count: number;
  is_unmapped: boolean;
  suggested_price: number;
}

interface ProductMappingStats {
  total_pos_products: number;
  mapped_products: number;
  unmapped_products: number;
}

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string;
  price: number;
  cost: number;
  sku?: string;
  description?: string;
  is_sim_usage: boolean;
  legacy_pos_name?: string;
}

interface MappingModalState {
  open: boolean;
  product: UnmappedProduct | null;
  action: 'map_existing' | 'create_new' | null;
  selectedProductId?: string;
  selectedProduct?: Product;
}

interface CreateProductForm {
  name: string;
  category_id: string;
  price: number;
  cost: number;
  sku: string;
  description: string;
  is_sim_usage: boolean;
  show_in_staff_ui: boolean;
}

export default function ProductMappingPage() {
  const [unmappedProducts, setUnmappedProducts] = useState<UnmappedProduct[]>([]);
  const [stats, setStats] = useState<ProductMappingStats>({
    total_pos_products: 0,
    mapped_products: 0,
    unmapped_products: 0
  });
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  const [mappingModal, setMappingModal] = useState<MappingModalState>({
    open: false,
    product: null,
    action: null
  });
  const [createForm, setCreateForm] = useState<CreateProductForm>({
    name: '',
    category_id: '',
    price: 0,
    cost: 0,
    sku: '',
    description: '',
    is_sim_usage: false,
    show_in_staff_ui: false
  });

  const fetchUnmappedProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/products/unmapped');
      if (!response.ok) throw new Error('Failed to fetch unmapped products');

      const data = await response.json();
      console.log('API Response:', data); // Debug log
      console.log('Stats:', data.stats); // Debug log
      setUnmappedProducts(data.data);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching unmapped products:', error);
      toast.error('Failed to load unmapped products');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/products/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');

      const data = await response.json();
      setCategories(data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/products?per_page=500');
      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();
      setProducts(data.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    }
  }, []);

  useEffect(() => {
    fetchUnmappedProducts();
    fetchCategories();
    fetchProducts();
  }, [fetchUnmappedProducts, fetchCategories, fetchProducts]);

  const handleMapExisting = (product: UnmappedProduct) => {
    setProductSearchTerm(''); // Reset search term when opening modal
    setMappingModal({
      open: true,
      product,
      action: 'map_existing'
    });
  };

  const handleCreateNew = (product: UnmappedProduct) => {
    // Refresh categories to show any newly created ones
    fetchCategories();
    
    setCreateForm({
      name: product.pos_product_name,
      category_id: '',
      price: product.suggested_price || 0,
      cost: 0,
      sku: '',
      description: '',
      is_sim_usage: false,
      show_in_staff_ui: false
    });
    setMappingModal({
      open: true,
      product,
      action: 'create_new'
    });
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setMappingModal(prev => ({
      ...prev,
      selectedProductId: productId,
      selectedProduct: product
    }));
  };

  const handleSubmitMapping = async () => {
    if (!mappingModal.product || !mappingModal.action) return;

    try {
      const requestData = {
        pos_product_name: mappingModal.product.pos_product_name,
        action: mappingModal.action,
        ...(mappingModal.action === 'map_existing' && {
          product_id: mappingModal.selectedProductId
        }),
        ...(mappingModal.action === 'create_new' && createForm)
      };

      const response = await fetch('/api/admin/products/unmapped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process mapping');
      }

      const result = await response.json();
      
      toast.success(result.message, {
        duration: 5000
      });

      // Remove the mapped product from the list
      setUnmappedProducts(prev => 
        prev.filter(p => p.pos_product_name !== mappingModal.product?.pos_product_name)
      );
      setSuccessCount(prev => prev + 1);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        mapped_products: prev.mapped_products + 1,
        unmapped_products: prev.unmapped_products - 1
      }));

      // Close modal
      setMappingModal({ open: false, product: null, action: null });
      
      // Refresh products if new one was created
      if (mappingModal.action === 'create_new') {
        fetchProducts();
      }

    } catch (error: any) {
      console.error('Error processing mapping:', error);
      toast.error(error.message || 'Failed to process mapping');
    }
  };

  const filteredProducts = unmappedProducts.filter(product =>
    product.pos_product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Allow mapping to any product - historical POS names can be overwritten to point to current products
  const availableProducts = products.filter(product => product.is_active !== false);

  // Fuzzy matching helper function
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    // Exact match
    if (s1 === s2) return 1.0;
    
    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Word overlap
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    const wordScore = commonWords.length / Math.max(words1.length, words2.length);
    
    return wordScore;
  };

  // Get suggested products for the current unmapped product
  const getSuggestedProducts = () => {
    if (!mappingModal.product?.pos_product_name) return [];
    
    return availableProducts
      .map(product => ({
        ...product,
        similarity: calculateSimilarity(mappingModal.product.pos_product_name, product.name)
      }))
      .filter(product => product.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  };

  const suggestedProducts = getSuggestedProducts();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Product Mapping</h1>
        <p className="text-muted-foreground">
          Map unmapped POS products to existing products or create new ones
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POS Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_pos_products}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mapped Products</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.mapped_products}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unmapped Products</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unmapped_products}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mapped Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{successCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find unmapped products by name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button 
              onClick={fetchUnmappedProducts} 
              variant="outline"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Filter className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unmapped Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Unmapped Products</CardTitle>
          <CardDescription>
            Map each POS product to an existing product or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading unmapped products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {searchTerm 
                  ? 'No unmapped products found matching your search.'
                  : 'Great! All POS products are mapped to the product catalog.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-gray-50/50">
                    <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[30%]">POS Product Name</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%]">Usage Count</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%]">Suggested Price</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%]">Priority</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[25%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.pos_product_name} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Package className="h-5 w-5 text-blue-700" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-base">{product.pos_product_name}</p>
                            <p className="text-sm text-gray-500">From POS system</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="flex items-center">
                          <Badge variant="secondary" className="text-sm">
                            <BarChart3 className="h-3 w-3 mr-1" />
                            {product.usage_count} transactions
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="flex items-center">
                          <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-200">
                            ฿{product.suggested_price || 0}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <Badge variant={product.usage_count > 50 ? "destructive" : product.usage_count > 10 ? "default" : "secondary"}>
                          {product.usage_count > 50 ? "High" : product.usage_count > 10 ? "Medium" : "Low"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 hover:bg-blue-50 text-blue-600 border-blue-200"
                            onClick={() => handleMapExisting(product)}
                          >
                            <Link2 className="h-3 w-3 mr-1" />
                            Map Existing
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 hover:bg-green-50 text-green-600 border-green-200"
                            onClick={() => handleCreateNew(product)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Create New
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mapping Modal */}
      <Dialog open={mappingModal.open} onOpenChange={(open) => setMappingModal(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {mappingModal.action === 'map_existing' ? 'Map to Existing Product' : 'Create New Product'}
            </DialogTitle>
            <DialogDescription>
              {mappingModal.action === 'map_existing' 
                ? `Map "${mappingModal.product?.pos_product_name}" to an existing product`
                : `Create a new product for "${mappingModal.product?.pos_product_name}"`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {mappingModal.action === 'map_existing' ? (
              <div className="space-y-3">
                <Label>Search and Select Product</Label>
                
                {/* Suggested matches */}
                {suggestedProducts.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-blue-600">Suggested Matches</Label>
                    <div className="grid gap-2">
                      {suggestedProducts.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product.id)}
                          className="p-3 text-left border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-600">฿{product.price}</div>
                            </div>
                            <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {Math.round(product.similarity * 100)}% match
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm">Or search all products:</Label>
                  <Input
                    placeholder="Type to search products..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                  />
                  <Select value={mappingModal.selectedProductId} onValueChange={handleProductSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a product..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {availableProducts
                        .filter(product => 
                          product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                          (product.sku && product.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
                        )
                        .map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ฿{product.price}
                            {product.sku && <span className="text-gray-500 text-xs"> ({product.sku})</span>}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {mappingModal.selectedProduct && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="font-medium">{mappingModal.selectedProduct.name}</p>
                    <p className="text-sm text-gray-600">
                      Price: ฿{mappingModal.selectedProduct.price} | 
                      Cost: ฿{mappingModal.selectedProduct.cost}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Product Name</Label>
                    <Input
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={createForm.category_id} onValueChange={(value) => setCreateForm(prev => ({ ...prev, category_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          // Get parent categories (no parent_id) and sort them
                          const parentCategories = categories
                            .filter(c => !c.parent_id)
                            .sort((a, b) => a.name.localeCompare(b.name));
                          
                          // Get child categories for each parent
                          const getCategoryWithChildren = (parentId: string) => 
                            categories
                              .filter(c => c.parent_id === parentId)
                              .sort((a, b) => a.name.localeCompare(b.name));
                          
                          return parentCategories.map((parentCategory) => {
                            const children = getCategoryWithChildren(parentCategory.id);
                            return [
                              // Parent Category - bold, no extra padding
                              <SelectItem key={parentCategory.id} value={parentCategory.id} className="font-semibold pl-2">
                                {parentCategory.name}
                              </SelectItem>,
                              // Child Categories - indented with pl-6
                              ...children.map((childCategory) => (
                                <SelectItem key={childCategory.id} value={childCategory.id} className="pl-6 text-muted-foreground">
                                  {childCategory.name}
                                </SelectItem>
                              ))
                            ];
                          }).flat();
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price (฿)</Label>
                    <div className="space-y-2">
                      {mappingModal.product?.suggested_price && mappingModal.product.suggested_price > 0 && (
                        <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                          💡 Suggested: ฿{mappingModal.product.suggested_price}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-green-600 hover:text-green-700"
                            onClick={() => setCreateForm(prev => ({ ...prev, price: mappingModal.product?.suggested_price || 0 }))}
                          >
                            Use
                          </Button>
                        </div>
                      )}
                      <Input
                        type="number"
                        value={createForm.price}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cost (฿)</Label>
                    <div className="space-y-2">
                      <div className="h-6"></div> {/* Spacer to align with price field */}
                      <Input
                        type="number"
                        value={createForm.cost}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>SKU (Optional)</Label>
                  <Input
                    value={createForm.sku}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Enter SKU"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_sim_usage"
                      checked={createForm.is_sim_usage}
                      onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, is_sim_usage: checked as boolean }))}
                    />
                    <Label htmlFor="is_sim_usage">This is a golf simulator usage product</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show_in_staff_ui"
                      checked={createForm.show_in_staff_ui}
                      onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, show_in_staff_ui: checked as boolean }))}
                    />
                    <Label htmlFor="show_in_staff_ui">Show in staff UI (make visible to staff)</Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingModal({ open: false, product: null, action: null })}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitMapping}
              disabled={
                (mappingModal.action === 'map_existing' && !mappingModal.selectedProductId) ||
                (mappingModal.action === 'create_new' && (!createForm.name || !createForm.category_id))
              }
            >
              {mappingModal.action === 'map_existing' ? 'Map Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}