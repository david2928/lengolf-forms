# Product Management Implementation Tasks
## Step-by-Step Development Guide

### Document Information
- **Project**: Lengolf Forms Product Management System
- **Phase**: MVP Implementation 
- **Timeline**: 2-3 weeks
- **Technology Stack**: Next.js 14, TypeScript, Tailwind CSS, Supabase PostgreSQL

---

## Phase 1: Database Foundation

### Task 1.1: Database Schema Setup
**Estimated Time**: 4-6 hours  
**Priority**: Critical  
**Dependencies**: None

#### 1.1.1 Create Products Schema
```sql
-- Create dedicated schema for product management
CREATE SCHEMA IF NOT EXISTS products;
```

#### 1.1.2 Create Categories Table
```sql
CREATE TABLE products.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES products.categories(id),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    color_code VARCHAR(7), -- For UI theming (e.g., #FF6B6B)
    icon VARCHAR(50), -- Icon identifier for UI
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_categories_parent ON products.categories(parent_id);
CREATE INDEX idx_categories_active ON products.categories(is_active);
CREATE INDEX idx_categories_order ON products.categories(display_order);
CREATE INDEX idx_categories_slug ON products.categories(slug);
```

#### 1.1.3 Create Products Table
```sql
CREATE TABLE products.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES products.categories(id),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    
    -- Pricing & Cost
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    profit_margin DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN cost > 0 THEN ((price - cost) / price * 100)
            ELSE NULL 
        END
    ) STORED,
    
    -- Product Identifiers
    sku VARCHAR(100) UNIQUE,
    external_code VARCHAR(100), -- External system reference
    
    -- Basic Properties
    unit VARCHAR(50), -- pieces, bottles, hours, etc.
    is_sim_usage BOOLEAN DEFAULT false, -- Golf simulator usage
    
    -- Status & Display
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    pos_display_color VARCHAR(7), -- Background color for POS
    
    -- Legacy Migration
    legacy_qashier_id VARCHAR(100), -- For Qashier data migration
    legacy_pos_name VARCHAR(200), -- Original name from pos.dim_product
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Indexes
CREATE INDEX idx_products_category ON products.products(category_id);
CREATE INDEX idx_products_active ON products.products(is_active);
CREATE INDEX idx_products_sku ON products.products(sku);
CREATE INDEX idx_products_external_code ON products.products(external_code);
CREATE INDEX idx_products_sim_usage ON products.products(is_sim_usage);
CREATE INDEX idx_products_legacy_qashier ON products.products(legacy_qashier_id);
CREATE INDEX idx_products_slug ON products.products(slug);

-- Full-text search
CREATE INDEX idx_products_fts ON products.products USING gin(
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);
```

#### 1.1.4 Create Price History Table
```sql
CREATE TABLE products.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products.products(id),
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2) NOT NULL,
    old_cost DECIMAL(10,2),
    new_cost DECIMAL(10,2),
    reason VARCHAR(200),
    changed_by VARCHAR(100) NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_product ON products.price_history(product_id);
CREATE INDEX idx_price_history_date ON products.price_history(changed_at);
```

#### 1.1.5 Create Database Functions
```sql
-- Function to generate product slug
CREATE OR REPLACE FUNCTION products.generate_product_slug(product_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INT := 0;
BEGIN
    -- Convert to lowercase, replace spaces with hyphens, remove special chars
    base_slug := lower(regexp_replace(trim(product_name), '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    
    final_slug := base_slug;
    
    -- Check for duplicates and add counter if needed
    WHILE EXISTS (SELECT 1 FROM products.products WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to log price changes
CREATE OR REPLACE FUNCTION products.log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.price != NEW.price OR OLD.cost != NEW.cost THEN
        INSERT INTO products.price_history (
            product_id, old_price, new_price, old_cost, new_cost, 
            reason, changed_by
        ) VALUES (
            NEW.id, OLD.price, NEW.price, OLD.cost, NEW.cost,
            'Updated via admin panel', NEW.updated_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for price history
CREATE TRIGGER trigger_price_history
    AFTER UPDATE ON products.products
    FOR EACH ROW
    EXECUTE FUNCTION products.log_price_change();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION products.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER trigger_products_timestamp
    BEFORE UPDATE ON products.products
    FOR EACH ROW
    EXECUTE FUNCTION products.update_timestamp();

CREATE TRIGGER trigger_categories_timestamp
    BEFORE UPDATE ON products.categories
    FOR EACH ROW
    EXECUTE FUNCTION products.update_timestamp();
```

#### Validation Steps:
- [ ] Schema created successfully in Supabase
- [ ] All tables have proper indexes
- [ ] Functions and triggers are working
- [ ] Can insert test data successfully

---

### Task 1.2: Data Migration Setup
**Estimated Time**: 6-8 hours  
**Priority**: Critical  
**Dependencies**: Task 1.1

#### 1.2.1 Create Migration Scripts Directory
Create folder structure:
```
scripts/
├── migration/
│   ├── 01-create-categories.sql
│   ├── 02-migrate-qashier-data.sql
│   └── 03-validate-migration.sql
```

#### 1.2.2 Analyze Current POS Data
```sql
-- Analyze existing pos.dim_product structure
SELECT 
    tab,
    category,
    parent_category,
    COUNT(*) as product_count,
    STRING_AGG(DISTINCT product_name, ', ') as sample_products
FROM pos.dim_product 
GROUP BY tab, category, parent_category
ORDER BY tab, parent_category, category;
```

#### 1.2.3 Create Category Migration Script
```sql
-- scripts/migration/01-create-categories.sql
-- Insert root categories (tabs from Qashier)
INSERT INTO products.categories (name, slug, description, display_order, color_code, icon, parent_id) VALUES
('Drink', 'drink', 'Beverages and alcoholic drinks', 1, '#3B82F6', '🍺', NULL),
('Food', 'food', 'Food items and meals', 2, '#EF4444', '🍔', NULL),
('Golf', 'golf', 'Golf services and equipment', 3, '#10B981', '⛳', NULL),
('Packages', 'packages', 'Service packages', 4, '#8B5CF6', '📦', NULL),
('Events', 'events', 'Event-related items', 5, '#F59E0B', '🎪', NULL),
('Others', 'others', 'Miscellaneous items', 6, '#6B7280', '⚙️', NULL);

-- Insert subcategories
WITH root_categories AS (
    SELECT id, name FROM products.categories WHERE parent_id IS NULL
)
INSERT INTO products.categories (name, slug, description, display_order, parent_id)
SELECT 
    DISTINCT category as name,
    products.generate_category_slug(category) as slug,
    'Migrated from Qashier: ' || category as description,
    ROW_NUMBER() OVER (PARTITION BY tab ORDER BY category) as display_order,
    rc.id as parent_id
FROM pos.dim_product dp
JOIN root_categories rc ON rc.name = dp.tab
WHERE dp.category IS NOT NULL AND dp.category != '';
```

#### 1.2.4 Create Product Migration Script
```sql
-- scripts/migration/02-migrate-qashier-data.sql
INSERT INTO products.products (
    category_id, name, slug, description, price, cost, sku, 
    external_code, unit, is_sim_usage, is_active, display_order,
    pos_display_color, legacy_qashier_id, legacy_pos_name, created_by
)
SELECT 
    cat.id as category_id,
    dp.product_name as name,
    products.generate_product_slug(dp.product_name) as slug,
    CASE 
        WHEN dp.category IS NOT NULL 
        THEN 'Migrated from Qashier - ' || dp.category 
        ELSE 'Migrated from Qashier'
    END as description,
    COALESCE(dp.unit_price::DECIMAL, 0) as price,
    COALESCE(dp.unit_cost::DECIMAL, 0) as cost,
    NULLIF(dp.sku_number, '') as sku,
    NULLIF(dp.barcode, '') as external_code,
    CASE 
        WHEN dp.product_name ILIKE '%1H%' OR dp.product_name ILIKE '%hour%' THEN 'hours'
        WHEN dp.product_name ILIKE '%bottle%' OR dp.product_name ILIKE '%beer%' THEN 'bottles'
        WHEN dp.product_name ILIKE '%package%' THEN 'packages'
        ELSE 'pieces'
    END as unit,
    COALESCE(dp.is_sim_usage, false) as is_sim_usage,
    true as is_active,
    COALESCE(dp.id, 999) as display_order,
    CASE 
        WHEN dp.tab = 'Drink' THEN '#3B82F6'
        WHEN dp.tab = 'Food' THEN '#EF4444'
        WHEN dp.tab = 'Golf' THEN '#10B981'
        WHEN dp.tab = 'Packages' THEN '#8B5CF6'
        ELSE '#6B7280'
    END as pos_display_color,
    dp.id::TEXT as legacy_qashier_id,
    dp.product_name as legacy_pos_name,
    'migration-script' as created_by
FROM pos.dim_product dp
JOIN products.categories parent_cat ON parent_cat.name = dp.tab AND parent_cat.parent_id IS NULL
JOIN products.categories cat ON cat.name = dp.category AND cat.parent_id = parent_cat.id
WHERE dp.product_name IS NOT NULL AND dp.product_name != ''
ORDER BY dp.tab, dp.category, dp.product_name;
```

#### 1.2.5 Create Validation Script
```sql
-- scripts/migration/03-validate-migration.sql
-- Validation queries to ensure migration success
SELECT 
    'Categories' as type,
    COUNT(*) as migrated_count,
    (SELECT COUNT(*) FROM (SELECT DISTINCT tab FROM pos.dim_product WHERE tab IS NOT NULL) as tabs) as expected_root_count
FROM products.categories WHERE parent_id IS NULL

UNION ALL

SELECT 
    'Products' as type,
    COUNT(*) as migrated_count,
    (SELECT COUNT(*) FROM pos.dim_product WHERE product_name IS NOT NULL) as expected_count
FROM products.products;

-- Check for missing products
SELECT dp.product_name, dp.tab, dp.category
FROM pos.dim_product dp
LEFT JOIN products.products p ON p.legacy_qashier_id = dp.id::TEXT
WHERE p.id IS NULL AND dp.product_name IS NOT NULL;

-- Check category hierarchy
SELECT 
    parent.name as parent_category,
    child.name as child_category,
    COUNT(p.id) as product_count
FROM products.categories parent
JOIN products.categories child ON child.parent_id = parent.id
LEFT JOIN products.products p ON p.category_id = child.id
GROUP BY parent.name, child.name
ORDER BY parent.name, child.name;
```

#### Validation Steps:
- [ ] Migration scripts created and tested
- [ ] All categories migrated correctly with hierarchy
- [ ] All products migrated with proper category assignment
- [ ] Price and cost data preserved
- [ ] Legacy mapping fields populated

---

## Phase 2: API Layer Development

### Task 2.1: Create API Types and Interfaces
**Estimated Time**: 3-4 hours  
**Priority**: High  
**Dependencies**: Task 1.1

#### 2.1.1 Create Type Definitions
Create `src/types/products.ts`:
```typescript
// Base types
export interface BaseProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  cost: number;
  profitMargin?: number;
  sku?: string;
  externalCode?: string;
  unit?: string;
  isSimUsage: boolean;
  isActive: boolean;
  displayOrder: number;
  posDisplayColor?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Product extends BaseProduct {
  categoryId: string;
  category?: Category;
  legacyQashierId?: string;
  legacyPosName?: string;
}

export interface BaseCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  colorCode?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category extends BaseCategory {
  parentId?: string;
  parent?: Category;
  children?: Category[];
  productCount?: number;
}

export interface PriceHistory {
  id: string;
  productId: string;
  oldPrice?: number;
  newPrice: number;
  oldCost?: number;
  newCost?: number;
  reason?: string;
  changedBy: string;
  changedAt: string;
}

// API Request/Response types
export interface CreateProductRequest {
  name: string;
  categoryId: string;
  description?: string;
  price: number;
  cost?: number;
  sku?: string;
  externalCode?: string;
  unit?: string;
  isSimUsage?: boolean;
  posDisplayColor?: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  isActive?: boolean;
  displayOrder?: number;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'price' | 'cost' | 'profitMargin' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductListResponse {
  products: Product[];
  categories: Category[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    priceRange?: [number, number];
  };
}

export interface BulkUpdateRequest {
  productIds: string[];
  updates: {
    price?: number;
    cost?: number;
    categoryId?: string;
    isActive?: boolean;
    posDisplayColor?: string;
  };
  reason?: string;
}

// Dashboard types
export interface ProductAnalytics {
  totalProducts: number;
  totalCategories: number;
  totalValue: number;
  averageMargin: number;
  topPerformers: Product[];
  lowStock: Product[];
  recentActivity: {
    type: 'created' | 'updated' | 'price_changed';
    product: Product;
    timestamp: string;
    details?: string;
  }[];
}

// Error types
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: Record<string, any>;
}
```

#### 2.1.2 Create Database Utility Functions
Create `src/lib/database/products.ts`:
```typescript
import { supabase } from '@/lib/supabase';
import type { 
  Product, 
  Category, 
  CreateProductRequest,
  UpdateProductRequest,
  ProductListParams,
  BulkUpdateRequest
} from '@/types/products';

export class ProductDatabase {
  // Categories
  static async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('products.categories')
      .select(`
        id, name, slug, description, display_order, color_code, icon,
        is_active, parent_id, created_at, updated_at,
        children:products.categories(id, name, slug, display_order),
        product_count:products.products(count)
      `)
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    return this.mapCategories(data);
  }

  static async getCategoryHierarchy(): Promise<Category[]> {
    const categories = await this.getCategories();
    return this.buildCategoryTree(categories);
  }

  // Products
  static async getProducts(params: ProductListParams = {}): Promise<{
    products: Product[];
    total: number;
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      isActive,
      minPrice,
      maxPrice,
      sortBy = 'name',
      sortOrder = 'asc'
    } = params;

    let query = supabase
      .from('products.products')
      .select(`
        id, name, slug, description, price, cost, profit_margin,
        sku, external_code, unit, is_sim_usage, is_active,
        display_order, pos_display_color, category_id,
        created_at, updated_at, created_by, updated_by,
        legacy_qashier_id, legacy_pos_name,
        category:products.categories(id, name, slug, color_code)
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (typeof isActive === 'boolean') {
      query = query.eq('is_active', isActive);
    }

    if (minPrice !== undefined) {
      query = query.gte('price', minPrice);
    }

    if (maxPrice !== undefined) {
      query = query.lte('price', maxPrice);
    }

    // Apply sorting
    const sortColumn = this.mapSortColumn(sortBy);
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const start = (page - 1) * limit;
    query = query.range(start, start + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      products: this.mapProducts(data),
      total: count || 0
    };
  }

  static async getProduct(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products.products')
      .select(`
        id, name, slug, description, price, cost, profit_margin,
        sku, external_code, unit, is_sim_usage, is_active,
        display_order, pos_display_color, category_id,
        created_at, updated_at, created_by, updated_by,
        legacy_qashier_id, legacy_pos_name,
        category:products.categories(id, name, slug, color_code, parent_id,
          parent:products.categories(id, name, slug))
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapProduct(data);
  }

  static async createProduct(productData: CreateProductRequest, userId: string): Promise<Product> {
    const slug = await this.generateProductSlug(productData.name);
    
    const { data, error } = await supabase
      .from('products.products')
      .insert({
        ...productData,
        slug,
        created_by: userId,
        updated_by: userId
      })
      .select(`
        id, name, slug, description, price, cost, profit_margin,
        sku, external_code, unit, is_sim_usage, is_active,
        display_order, pos_display_color, category_id,
        created_at, updated_at, created_by, updated_by,
        category:products.categories(id, name, slug, color_code)
      `)
      .single();

    if (error) throw error;
    return this.mapProduct(data);
  }

  static async updateProduct(id: string, updates: UpdateProductRequest, userId: string): Promise<Product> {
    const updateData: any = { ...updates, updated_by: userId };
    
    // Generate new slug if name changed
    if (updates.name) {
      updateData.slug = await this.generateProductSlug(updates.name, id);
    }

    const { data, error } = await supabase
      .from('products.products')
      .update(updateData)
      .eq('id', id)
      .select(`
        id, name, slug, description, price, cost, profit_margin,
        sku, external_code, unit, is_sim_usage, is_active,
        display_order, pos_display_color, category_id,
        created_at, updated_at, created_by, updated_by,
        category:products.categories(id, name, slug, color_code)
      `)
      .single();

    if (error) throw error;
    return this.mapProduct(data);
  }

  static async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products.products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async bulkUpdateProducts(request: BulkUpdateRequest, userId: string): Promise<Product[]> {
    const { productIds, updates } = request;
    
    const updateData = { 
      ...updates, 
      updated_by: userId 
    };

    const { data, error } = await supabase
      .from('products.products')
      .update(updateData)
      .in('id', productIds)
      .select(`
        id, name, slug, description, price, cost, profit_margin,
        sku, external_code, unit, is_sim_usage, is_active,
        display_order, pos_display_color, category_id,
        created_at, updated_at, created_by, updated_by,
        category:products.categories(id, name, slug, color_code)
      `);

    if (error) throw error;
    return this.mapProducts(data);
  }

  // Utility methods
  private static mapProduct(data: any): Product {
    return {
      id: data.id,
      categoryId: data.category_id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      price: parseFloat(data.price),
      cost: data.cost ? parseFloat(data.cost) : 0,
      profitMargin: data.profit_margin ? parseFloat(data.profit_margin) : undefined,
      sku: data.sku,
      externalCode: data.external_code,
      unit: data.unit,
      isSimUsage: data.is_sim_usage,
      isActive: data.is_active,
      displayOrder: data.display_order,
      posDisplayColor: data.pos_display_color,
      legacyQashierId: data.legacy_qashier_id,
      legacyPosName: data.legacy_pos_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      category: data.category ? this.mapCategory(data.category) : undefined
    };
  }

  private static mapProducts(data: any[]): Product[] {
    return data.map(item => this.mapProduct(item));
  }

  private static mapCategory(data: any): Category {
    return {
      id: data.id,
      parentId: data.parent_id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      displayOrder: data.display_order,
      colorCode: data.color_code,
      icon: data.icon,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      parent: data.parent ? this.mapCategory(data.parent) : undefined,
      children: data.children ? data.children.map((child: any) => this.mapCategory(child)) : undefined,
      productCount: data.product_count ? data.product_count.length : undefined
    };
  }

  private static mapCategories(data: any[]): Category[] {
    return data.map(item => this.mapCategory(item));
  }

  private static buildCategoryTree(categories: Category[]): Category[] {
    const roots = categories.filter(cat => !cat.parentId);
    const children = categories.filter(cat => cat.parentId);

    roots.forEach(root => {
      root.children = children.filter(child => child.parentId === root.id);
    });

    return roots;
  }

  private static mapSortColumn(sortBy: string): string {
    const mapping: Record<string, string> = {
      name: 'name',
      price: 'price',
      cost: 'cost',
      profitMargin: 'profit_margin',
      createdAt: 'created_at'
    };
    return mapping[sortBy] || 'name';
  }

  private static async generateProductSlug(name: string, excludeId?: string): Promise<string> {
    const { data } = await supabase.rpc('products.generate_product_slug', { 
      product_name: name 
    });
    return data;
  }
}
```

#### Validation Steps:
- [ ] Type definitions created and exported correctly
- [ ] Database utility functions implemented
- [ ] All CRUD operations working
- [ ] Error handling implemented

---

### Task 2.2: Create API Routes
**Estimated Time**: 6-8 hours  
**Priority**: High  
**Dependencies**: Task 2.1

#### 2.2.1 Create Products API Routes
Create `app/api/admin/products/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ProductDatabase } from '@/lib/database/products';
import type { ProductListParams, CreateProductRequest, APIResponse } from '@/types/products';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const params: ProductListParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'name',
      sortOrder: (searchParams.get('sortOrder') as any) || 'asc'
    };

    const { products, total } = await ProductDatabase.getProducts(params);
    const categories = await ProductDatabase.getCategoryHierarchy();

    const response: APIResponse<any> = {
      success: true,
      data: {
        products,
        categories,
        pagination: {
          page: params.page!,
          limit: params.limit!,
          total,
          totalPages: Math.ceil(total / params.limit!)
        },
        filters: {
          search: params.search,
          categoryId: params.categoryId,
          isActive: params.isActive,
          priceRange: params.minPrice !== undefined || params.maxPrice !== undefined 
            ? [params.minPrice || 0, params.maxPrice || 999999] : undefined
        }
      }
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Products API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch products',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        } 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 401 }
      );
    }

    const body: CreateProductRequest = await request.json();

    // Validation
    if (!body.name || !body.categoryId || body.price === undefined) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Required fields: name, categoryId, price' 
          } 
        },
        { status: 400 }
      );
    }

    const product = await ProductDatabase.createProduct(body, session.user.email!);

    const response: APIResponse<any> = {
      success: true,
      data: { product }
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('Create Product Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to create product',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        } 
      },
      { status: 500 }
    );
  }
}
```

#### 2.2.2 Create Individual Product Route
Create `app/api/admin/products/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ProductDatabase } from '@/lib/database/products';
import type { UpdateProductRequest, APIResponse } from '@/types/products';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 401 }
      );
    }

    const product = await ProductDatabase.getProduct(params.id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
        { status: 404 }
      );
    }

    const response: APIResponse<any> = {
      success: true,
      data: { product }
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Get Product Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch product',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        } 
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 401 }
      );
    }

    const body: UpdateProductRequest = await request.json();

    const product = await ProductDatabase.updateProduct(params.id, body, session.user.email!);

    const response: APIResponse<any> = {
      success: true,
      data: { product }
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Update Product Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to update product',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        } 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 401 }
      );
    }

    await ProductDatabase.deleteProduct(params.id);

    const response: APIResponse<any> = {
      success: true,
      data: { message: 'Product deleted successfully' }
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Delete Product Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to delete product',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        } 
      },
      { status: 500 }
    );
  }
}
```

#### 2.2.3 Create Categories API Route
Create `app/api/admin/products/categories/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ProductDatabase } from '@/lib/database/products';
import type { APIResponse } from '@/types/products';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 401 }
      );
    }

    const categories = await ProductDatabase.getCategoryHierarchy();

    const response: APIResponse<any> = {
      success: true,
      data: { categories }
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Categories API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch categories',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        } 
      },
      { status: 500 }
    );
  }
}
```

#### 2.2.4 Create Bulk Operations Route
Create `app/api/admin/products/bulk/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ProductDatabase } from '@/lib/database/products';
import type { BulkUpdateRequest, APIResponse } from '@/types/products';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 401 }
      );
    }

    const body: BulkUpdateRequest = await request.json();

    // Validation
    if (!body.productIds || body.productIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Product IDs are required' 
          } 
        },
        { status: 400 }
      );
    }

    if (!body.updates || Object.keys(body.updates).length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Updates are required' 
          } 
        },
        { status: 400 }
      );
    }

    const products = await ProductDatabase.bulkUpdateProducts(body, session.user.email!);

    const response: APIResponse<any> = {
      success: true,
      data: { 
        products,
        updatedCount: products.length,
        message: `Successfully updated ${products.length} products`
      }
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Bulk Update Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to update products',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        } 
      },
      { status: 500 }
    );
  }
}
```

#### 2.2.5 Create Export Route
Create `app/api/admin/products/export/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ProductDatabase } from '@/lib/database/products';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';
    const categoryId = searchParams.get('categoryId') || undefined;
    const isActive = searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined;

    // Get all products based on filters
    const { products } = await ProductDatabase.getProducts({
      limit: 10000, // Large limit to get all products
      categoryId,
      isActive
    });

    if (format === 'csv') {
      const csvHeaders = [
        'Name', 'Category', 'SKU', 'External Code', 'Price (THB)', 'Cost (THB)', 
        'Profit Margin (%)', 'Unit', 'Status', 'Golf Simulator', 'Created At'
      ];

      const csvRows = products.map(product => [
        product.name,
        product.category?.name || '',
        product.sku || '',
        product.externalCode || '',
        product.price.toString(),
        product.cost.toString(),
        product.profitMargin?.toFixed(2) || '',
        product.unit || '',
        product.isActive ? 'Active' : 'Inactive',
        product.isSimUsage ? 'Yes' : 'No',
        new Date(product.createdAt).toLocaleDateString()
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `lengolf-products-${timestamp}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_FORMAT', message: 'Only CSV format is supported' } },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Export Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to export products',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        } 
      },
      { status: 500 }
    );
  }
}
```

#### Validation Steps:
- [ ] All API routes created and working
- [ ] Authentication and authorization implemented
- [ ] Error handling consistent across routes
- [ ] API responses follow standard format
- [ ] Bulk operations working correctly
- [ ] Export functionality working

---

## Phase 3: Frontend Components

### Task 3.1: Create Custom Hooks
**Estimated Time**: 4-5 hours  
**Priority**: High  
**Dependencies**: Task 2.2

#### 3.1.1 Create Products Hook
Create `src/hooks/use-products.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react';
import type { 
  Product, 
  ProductListParams, 
  ProductListResponse, 
  APIResponse 
} from '@/types/products';

interface UseProductsOptions extends ProductListParams {
  enabled?: boolean;
}

interface UseProductsResult {
  products: Product[];
  categories: any[];
  pagination: any;
  filters: any;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateFilters: (newFilters: Partial<ProductListParams>) => void;
}

export function useProducts(options: UseProductsOptions = {}): UseProductsResult {
  const [data, setData] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductListParams>({
    page: 1,
    limit: 20,
    sortBy: 'name',
    sortOrder: 'asc',
    ...options
  });

  const fetchProducts = useCallback(async () => {
    if (options.enabled === false) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/products?${params.toString()}`);
      const result: APIResponse<ProductListResponse> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch products');
      }

      setData(result.data!);
    } catch (err: any) {
      setError(err.message);
      console.error('Products fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, options.enabled]);

  const updateFilters = useCallback((newFilters: Partial<ProductListParams>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page ?? 1 // Reset to page 1 unless explicitly set
    }));
  }, []);

  const refetch = useCallback(() => fetchProducts(), [fetchProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products: data?.products || [],
    categories: data?.categories || [],
    pagination: data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    filters: data?.filters || {},
    loading,
    error,
    refetch,
    updateFilters
  };
}

// Hook for single product
interface UseProductOptions {
  enabled?: boolean;
}

interface UseProductResult {
  product: Product | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProduct(id: string, options: UseProductOptions = {}): UseProductResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!id || options.enabled === false) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/${id}`);
      const result: APIResponse<{ product: Product }> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch product');
      }

      setProduct(result.data!.product);
    } catch (err: any) {
      setError(err.message);
      console.error('Product fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [id, options.enabled]);

  const refetch = useCallback(() => fetchProduct(), [fetchProduct]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return {
    product,
    loading,
    error,
    refetch
  };
}
```

#### 3.1.2 Create Product Mutations Hook
Create `src/hooks/use-product-mutations.ts`:
```typescript
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { 
  Product, 
  CreateProductRequest, 
  UpdateProductRequest, 
  BulkUpdateRequest,
  APIResponse 
} from '@/types/products';

interface UseProductMutationsResult {
  createProduct: (data: CreateProductRequest) => Promise<Product | null>;
  updateProduct: (id: string, data: UpdateProductRequest) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  bulkUpdateProducts: (data: BulkUpdateRequest) => Promise<Product[] | null>;
  loading: boolean;
  error: string | null;
}

export function useProductMutations(): UseProductMutationsResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProduct = useCallback(async (data: CreateProductRequest): Promise<Product | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result: APIResponse<{ product: Product }> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create product');
      }

      toast.success('Product created successfully');
      return result.data!.product;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      console.error('Create product error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProduct = useCallback(async (id: string, data: UpdateProductRequest): Promise<Product | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result: APIResponse<{ product: Product }> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update product');
      }

      toast.success('Product updated successfully');
      return result.data!.product;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      console.error('Update product error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE'
      });

      const result: APIResponse<any> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete product');
      }

      toast.success('Product deleted successfully');
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      console.error('Delete product error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const bulkUpdateProducts = useCallback(async (data: BulkUpdateRequest): Promise<Product[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/products/bulk', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result: APIResponse<{ products: Product[]; updatedCount: number }> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update products');
      }

      toast.success(`Successfully updated ${result.data!.updatedCount} products`);
      return result.data!.products;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      console.error('Bulk update error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createProduct,
    updateProduct,
    deleteProduct,
    bulkUpdateProducts,
    loading,
    error
  };
}
```

#### Validation Steps:
- [ ] Hooks created and exported correctly
- [ ] Error handling implemented with toast notifications
- [ ] Loading states managed properly
- [ ] TypeScript types properly used

---

### Task 3.2: Create UI Components
**Estimated Time**: 8-10 hours  
**Priority**: High  
**Dependencies**: Task 3.1

#### 3.2.1 Create Product Card Component
Create `src/components/admin/products/product-card.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Copy, Eye } from 'lucide-react';
import type { Product } from '@/types/products';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onDuplicate?: (product: Product) => void;
  onView?: (product: Product) => void;
  className?: string;
}

export function ProductCard({ 
  product, 
  onEdit, 
  onDelete, 
  onDuplicate, 
  onView,
  className 
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getProfitMarginColor = (margin?: number) => {
    if (!margin) return 'text-gray-500';
    if (margin >= 70) return 'text-green-600';
    if (margin >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProfitMarginBadgeVariant = (margin?: number): "default" | "secondary" | "destructive" | "outline" => {
    if (!margin) return 'outline';
    if (margin >= 70) return 'default';
    if (margin >= 30) return 'secondary';
    return 'destructive';
  };

  return (
    <Card className={`group hover:shadow-md transition-shadow duration-200 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
              {product.name}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {product.category?.name}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(product)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(product)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(product)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(product)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Product Image Placeholder */}
        <div 
          className="w-full h-24 rounded-md mb-3 flex items-center justify-center text-4xl"
          style={{ backgroundColor: product.posDisplayColor || '#f3f4f6' }}
        >
          {product.category?.icon || '📦'}
        </div>

        {/* Product Details */}
        <div className="space-y-2">
          {/* Price and Cost */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Price:</span>
            <span className="font-semibold">{formatCurrency(product.price)}</span>
          </div>

          {product.cost > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Cost:</span>
              <span>{formatCurrency(product.cost)}</span>
            </div>
          )}

          {/* Profit Margin */}
          {product.profitMargin && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Margin:</span>
              <Badge variant={getProfitMarginBadgeVariant(product.profitMargin)} className="text-xs">
                {product.profitMargin.toFixed(1)}%
              </Badge>
            </div>
          )}

          {/* SKU */}
          {product.sku && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">SKU:</span>
              <span className="font-mono text-xs">{product.sku}</span>
            </div>
          )}

          {/* Status Badges */}
          <div className="flex flex-wrap gap-1 pt-2">
            <Badge variant={product.isActive ? 'default' : 'secondary'} className="text-xs">
              {product.isActive ? 'Active' : 'Inactive'}
            </Badge>
            
            {product.isSimUsage && (
              <Badge variant="outline" className="text-xs">
                ⛳ Golf Sim
              </Badge>
            )}
            
            {product.unit && (
              <Badge variant="outline" className="text-xs">
                {product.unit}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 3.2.2 Create Product Table Component
Create `src/components/admin/products/product-table.tsx`:
```typescript
'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Copy 
} from 'lucide-react';
import type { Product, ProductListParams } from '@/types/products';

interface ProductTableProps {
  products: Product[];
  selectedProducts: string[];
  onSelectionChange: (productIds: string[]) => void;
  onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onDuplicate?: (product: Product) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  loading?: boolean;
}

export function ProductTable({
  products,
  selectedProducts,
  onSelectionChange,
  onSort,
  onEdit,
  onDelete,
  onDuplicate,
  sortBy,
  sortOrder,
  loading = false
}: ProductTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getProfitMarginColor = (margin?: number) => {
    if (!margin) return 'text-gray-500';
    if (margin >= 70) return 'text-green-600';
    if (margin >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(products.map(p => p.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedProducts, productId]);
    } else {
      onSelectionChange(selectedProducts.filter(id => id !== productId));
    }
  };

  const isAllSelected = products.length > 0 && selectedProducts.length === products.length;
  const isIndeterminate = selectedProducts.length > 0 && selectedProducts.length < products.length;

  const renderSortButton = (column: string, label: string) => {
    const isSorted = sortBy === column;
    const isAsc = isSorted && sortOrder === 'asc';
    const isDesc = isSorted && sortOrder === 'desc';

    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 font-medium"
        onClick={() => {
          if (!onSort) return;
          if (isSorted) {
            onSort(column, isAsc ? 'desc' : 'asc');
          } else {
            onSort(column, 'asc');
          }
        }}
      >
        {label}
        {isSorted ? (
          isAsc ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
        ) : (
          <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
        )}
      </Button>
    );
  };

  if (loading) {
    return (
      <div className="border rounded-lg">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading products...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="border rounded-lg">
        <div className="p-8 text-center">
          <p className="text-lg font-medium text-gray-900">No products found</p>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all products"
                {...(isIndeterminate ? { 'data-state': 'indeterminate' } : {})}
              />
            </TableHead>
            <TableHead>
              {renderSortButton('name', 'Product')}
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">
              {renderSortButton('price', 'Price')}
            </TableHead>
            <TableHead className="text-right">
              {renderSortButton('cost', 'Cost')}
            </TableHead>
            <TableHead className="text-right">
              {renderSortButton('profitMargin', 'Margin')}
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Checkbox
                  checked={selectedProducts.includes(product.id)}
                  onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                  aria-label={`Select ${product.name}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-8 h-8 rounded flex items-center justify-center text-sm"
                    style={{ backgroundColor: product.posDisplayColor || '#f3f4f6' }}
                  >
                    {product.category?.icon || '📦'}
                  </div>
                  <div>
                    <div className="font-medium">{product.name}</div>
                    {product.sku && (
                      <div className="text-xs text-gray-500 font-mono">{product.sku}</div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">{product.category?.name}</div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(product.price)}
              </TableCell>
              <TableCell className="text-right">
                {product.cost > 0 ? formatCurrency(product.cost) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {product.profitMargin ? (
                  <span className={getProfitMarginColor(product.profitMargin)}>
                    {product.profitMargin.toFixed(1)}%
                  </span>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={product.isActive ? 'default' : 'secondary'} className="text-xs">
                    {product.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {product.isSimUsage && (
                    <Badge variant="outline" className="text-xs">
                      ⛳
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(product)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onDuplicate && (
                      <DropdownMenuItem onClick={() => onDuplicate(product)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem 
                        onClick={() => onDelete(product)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

#### Validation Steps:
- [ ] Product card component displays correctly
- [ ] Product table component with sorting and selection
- [ ] Proper styling and responsive design
- [ ] Action menus working correctly

---

### Task 3.3: Create Form Components
**Estimated Time**: 6-8 hours  
**Priority**: High  
**Dependencies**: Task 3.2

#### 3.3.1 Create Product Form Component
Create `src/components/admin/products/product-form.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Trash2, Copy } from 'lucide-react';
import type { Product, Category, CreateProductRequest, UpdateProductRequest } from '@/types/products';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Name too long'),
  categoryId: z.string().min(1, 'Category is required'),
  description: z.string().max(1000, 'Description too long').optional(),
  price: z.number().min(0, 'Price must be non-negative'),
  cost: z.number().min(0, 'Cost must be non-negative').optional(),
  sku: z.string().max(100, 'SKU too long').optional(),
  externalCode: z.string().max(100, 'External code too long').optional(),
  unit: z.string().max(50, 'Unit too long').optional(),
  isSimUsage: z.boolean().optional(),
  posDisplayColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().min(0, 'Display order must be non-negative').optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  onSubmit: (data: CreateProductRequest | UpdateProductRequest) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  loading?: boolean;
}

export function ProductForm({
  product,
  categories,
  onSubmit,
  onCancel,
  onDelete,
  onDuplicate,
  loading = false
}: ProductFormProps) {
  const [profitMargin, setProfitMargin] = useState<number | null>(null);
  const [profit, setProfit] = useState<number | null>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      categoryId: product?.categoryId || '',
      description: product?.description || '',
      price: product?.price || 0,
      cost: product?.cost || 0,
      sku: product?.sku || '',
      externalCode: product?.externalCode || '',
      unit: product?.unit || '',
      isSimUsage: product?.isSimUsage || false,
      posDisplayColor: product?.posDisplayColor || '#3B82F6',
      isActive: product?.isActive ?? true,
      displayOrder: product?.displayOrder || 0,
    }
  });

  const watchPrice = form.watch('price');
  const watchCost = form.watch('cost');

  // Calculate profit margin
  useEffect(() => {
    const price = watchPrice || 0;
    const cost = watchCost || 0;

    if (price > 0 && cost > 0) {
      const calculatedProfit = price - cost;
      const calculatedMargin = (calculatedProfit / price) * 100;
      
      setProfit(calculatedProfit);
      setProfitMargin(calculatedMargin);
    } else {
      setProfit(null);
      setProfitMargin(null);
    }
  }, [watchPrice, watchCost]);

  const handleSubmit = async (data: ProductFormData) => {
    await onSubmit(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getProfitMarginColor = (margin: number) => {
    if (margin >= 70) return 'text-green-600';
    if (margin >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProfitMarginVariant = (margin: number): "default" | "secondary" | "destructive" => {
    if (margin >= 70) return 'default';
    if (margin >= 30) return 'secondary';
    return 'destructive';
  };

  // Flatten categories for dropdown
  const flatCategories = categories.reduce<Category[]>((acc, category) => {
    acc.push(category);
    if (category.children) {
      category.children.forEach(child => {
        acc.push({
          ...child,
          name: `${category.name} › ${child.name}`
        });
      });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {product ? 'Edit Product' : 'New Product'}
            </h1>
            {product && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated {new Date(product.updatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex space-x-2">
          {product && onDuplicate && (
            <Button variant="outline" onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
          )}
          {product && onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Product Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {flatCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.icon && `${category.icon} `}{category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="Product SKU" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="externalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>External Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Supplier code" {...field} />
                      </FormControl>
                      <FormDescription>
                        External reference code (e.g., supplier code)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <Input placeholder="pieces, bottles, hours..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Product description" 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Profitability */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Profitability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (THB) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost (THB)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Profit Analysis */}
              {profitMargin !== null && profit !== null && (
                <Card className="bg-gray-50">
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-3">💹 Profit Analysis</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-gray-600">Profit Margin</Label>
                        <div className="mt-1">
                          <Badge variant={getProfitMarginVariant(profitMargin)}>
                            {profitMargin.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-600">Profit Amount</Label>
                        <div className="mt-1 font-semibold">
                          {formatCurrency(profit)}
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-600">Performance</Label>
                        <div className="mt-1">
                          {profitMargin >= 70 ? '🟢 Excellent' : profitMargin >= 30 ? '🟡 Good' : '🔴 Low'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-600">Recommendation</Label>
                        <div className="mt-1 text-xs">
                          {profitMargin >= 70 
                            ? 'Great margins!' 
                            : profitMargin >= 30 
                            ? 'Consider optimization' 
                            : 'Review pricing strategy'
                          }
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Display & Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Display & Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <FormLabel>Product Status</FormLabel>
                          <FormDescription>
                            Active products are visible in POS
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isSimUsage"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <FormLabel>Golf Simulator Usage</FormLabel>
                          <FormDescription>
                            Track as simulator usage for analytics
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="displayOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            step="1"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Lower numbers appear first in lists
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="posDisplayColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>POS Display Color</FormLabel>
                        <div className="flex space-x-2">
                          <FormControl>
                            <Input 
                              type="color"
                              className="w-16 h-10 p-1 border rounded"
                              {...field}
                            />
                          </FormControl>
                          <FormControl>
                            <Input 
                              placeholder="#3B82F6"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormDescription>
                          Background color for POS buttons
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {product ? 'Update Product' : 'Create Product'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
```

#### Validation Steps:
- [ ] Product form component with all fields
- [ ] Form validation working correctly
- [ ] Real-time profit calculation
- [ ] Proper styling and layout
- [ ] Error handling and loading states

---

## Phase 4: Admin Pages

### Task 4.1: Create Product Management Pages
**Estimated Time**: 6-8 hours  
**Priority**: High  
**Dependencies**: Task 3.3

#### 4.1.1 Create Main Products Page
Create `app/admin/products/page.tsx`:
```typescript
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductTable } from '@/components/admin/products/product-table';
import { ProductCard } from '@/components/admin/products/product-card';
import { BulkActionsBar } from '@/components/admin/products/bulk-actions-bar';
import { useProducts } from '@/hooks/use-products';
import { useProductMutations } from '@/hooks/use-product-mutations';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Download,
  TrendingUp,
  Package2,
  DollarSign
} from 'lucide-react';
import type { Product, ProductListParams } from '@/types/products';

export default function ProductsPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ProductListParams>({
    page: 1,
    limit: 20,
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const { 
    products, 
    categories, 
    pagination, 
    loading, 
    error, 
    refetch, 
    updateFilters 
  } = useProducts(filters);

  const { deleteProduct } = useProductMutations();

  // Handle search with debouncing
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    updateFilters({ search: query.trim() || undefined, page: 1 });
  }, [updateFilters]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<ProductListParams>) => {
    updateFilters({ ...newFilters, page: 1 });
  }, [updateFilters]);

  // Handle sorting
  const handleSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    updateFilters({ sortBy, sortOrder });
  }, [updateFilters]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    updateFilters({ page });
  }, [updateFilters]);

  // Product actions
  const handleEditProduct = useCallback((product: Product) => {
    router.push(`/admin/products/${product.id}/edit`);
  }, [router]);

  const handleDeleteProduct = useCallback(async (product: Product) => {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      const success = await deleteProduct(product.id);
      if (success) {
        refetch();
        setSelectedProducts(prev => prev.filter(id => id !== product.id));
      }
    }
  }, [deleteProduct, refetch]);

  const handleDuplicateProduct = useCallback((product: Product) => {
    router.push(`/admin/products/new?duplicate=${product.id}`);
  }, [router]);

  // Bulk actions
  const handleBulkAction = useCallback(async (action: string, data?: any) => {
    // Implementation for bulk actions
    console.log('Bulk action:', action, 'Data:', data, 'Products:', selectedProducts);
    // Refetch after bulk action
    refetch();
    setSelectedProducts([]);
  }, [selectedProducts, refetch]);

  // Export functionality
  const handleExport = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    
    const url = `/api/admin/products/export?format=csv&${params.toString()}`;
    window.open(url, '_blank');
  }, [filters]);

  // Calculate analytics
  const analytics = {
    totalProducts: products.length,
    totalCategories: categories.length,
    totalValue: products.reduce((sum, product) => sum + product.price, 0),
    averageMargin: products.filter(p => p.profitMargin).reduce((sum, product, _, arr) => 
      sum + (product.profitMargin || 0) / arr.length, 0
    )
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center">
            <Package className="h-6 w-6 mr-2" />
            Product Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your product catalog and pricing
          </p>
        </div>
        <Button onClick={() => router.push('/admin/products/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Product
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-semibold">{analytics.totalProducts}</p>
              </div>
              <Package2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-2xl font-semibold">{analytics.totalCategories}</p>
              </div>
              <Grid className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-semibold">
                  {new Intl.NumberFormat('th-TH', {
                    style: 'currency',
                    currency: 'THB',
                    minimumFractionDigits: 0
                  }).format(analytics.totalValue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Margin</p>
                <p className="text-2xl font-semibold">
                  {analytics.averageMargin.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/products/categories')}>
              <Grid className="h-4 w-4 mr-2" />
              Manage Categories
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/products/bulk-edit')}>
              <Filter className="h-4 w-4 mr-2" />
              Bulk Edit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Product Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Product Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleFilterChange({ categoryId: category.id })}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <div className="text-2xl mb-2">{category.icon}</div>
                <div className="font-medium text-sm">{category.name}</div>
                <div className="text-xs text-gray-500">
                  {category.productCount} products
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select 
              value={filters.categoryId || 'all'} 
              onValueChange={(value) => handleFilterChange({ categoryId: value === 'all' ? undefined : value })}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select 
              value={filters.isActive === undefined ? 'all' : filters.isActive.toString()} 
              onValueChange={(value) => handleFilterChange({ 
                isActive: value === 'all' ? undefined : value === 'true' 
              })}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="flex border rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedProducts.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedProducts.length}
          onAction={handleBulkAction}
          onClear={() => setSelectedProducts([])}
        />
      )}

      {/* Products List/Grid */}
      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="p-8 text-center">
              <p className="text-red-600 mb-4">Error loading products: {error}</p>
              <Button onClick={refetch}>Try Again</Button>
            </div>
          ) : viewMode === 'table' ? (
            <ProductTable
              products={products}
              selectedProducts={selectedProducts}
              onSelectionChange={setSelectedProducts}
              onSort={handleSort}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onDuplicate={handleDuplicateProduct}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              loading={loading}
            />
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    onDuplicate={handleDuplicateProduct}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} products
              </p>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  const pageNumber = Math.max(1, pagination.page - 2) + i;
                  if (pageNumber <= pagination.totalPages) {
                    return (
                      <Button
                        key={pageNumber}
                        variant={pageNumber === pagination.page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    );
                  }
                  return null;
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

#### Validation Steps:
- [ ] Main products page displays correctly
- [ ] Search and filtering working
- [ ] Table and grid view modes
- [ ] Pagination working correctly
- [ ] Analytics cards showing correct data

---

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "remove-qashier-import-ui", "content": "Remove Qashier import UI elements from design (one-time setup only)", "status": "completed", "priority": "high"}, {"id": "modernize-ui-design", "content": "Update UI design to latest modern standards", "status": "completed", "priority": "high"}, {"id": "create-implementation-tasks", "content": "Create detailed TASKS document with step-by-step implementation instructions", "status": "completed", "priority": "high"}]