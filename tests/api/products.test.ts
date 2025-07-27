import { test, expect } from '@playwright/test';
import { createPOSAPIClient } from '../helpers/api-client';

/**
 * Products API Tests
 * Tests product catalog functionality
 */

test.describe('Products API', () => {
  let apiClient: any;

  test.beforeEach(async ({ request }) => {
    apiClient = await createPOSAPIClient(request);
  });

  test.afterEach(async () => {
    if (apiClient) {
      await apiClient.dispose();
    }
  });

  test('should get products with pagination', async () => {
    const response = await apiClient.getProducts({ page: 1, limit: 10 });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('products');
    expect(data).toHaveProperty('categories');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.products)).toBeTruthy();
    expect(data.products.length).toBeLessThanOrEqual(10);
    
    // Verify product structure
    if (data.products.length > 0) {
      const product = data.products[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('category_id');
    }
  });

  test('should filter products by category', async () => {
    // First get categories
    const categoriesResponse = await apiClient.getCategoryHierarchy();
    const categoriesData = await categoriesResponse.json();
    
    expect(categoriesResponse.ok()).toBeTruthy();
    expect(categoriesData).toHaveProperty('flatCategories');
    
    if (categoriesData.flatCategories.length > 0) {
      const firstCategory = categoriesData.flatCategories[0];
      
      const response = await apiClient.getProducts({ category: firstCategory.id });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(Array.isArray(data.products)).toBeTruthy();
      // All products should belong to the filtered category
      data.products.forEach((product: any) => {
        expect(product.category_id).toBe(firstCategory.id);
      });
    }
  });

  test('should search products by name', async () => {
    // First get a product to use for search
    const allProductsResponse = await apiClient.getProducts({ limit: 1 });
    const allProductsData = await allProductsResponse.json();
    
    if (allProductsData.products.length > 0) {
      const firstProduct = allProductsData.products[0];
      const searchTerm = firstProduct.name.split(' ')[0]; // Use first word
      
      const response = await apiClient.getProducts({ search: searchTerm });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(Array.isArray(data.products)).toBeTruthy();
      expect(data.products.length).toBeGreaterThan(0);
      
      // At least one product should contain the search term
      const matchingProduct = data.products.find((p: any) => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(matchingProduct).toBeDefined();
    }
  });

  test('should get category hierarchy', async () => {
    const response = await apiClient.getCategoryHierarchy();
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('hierarchy');
    expect(data).toHaveProperty('tabHierarchy');
    expect(data).toHaveProperty('flatCategories');
    expect(data).toHaveProperty('categoryBreadcrumbs');
    
    // Verify tab hierarchy has expected main categories
    expect(data.tabHierarchy).toHaveProperty('DRINK');
    expect(data.tabHierarchy).toHaveProperty('FOOD');
    expect(data.tabHierarchy).toHaveProperty('GOLF');
    expect(data.tabHierarchy).toHaveProperty('PACKAGES');
    
    expect(Array.isArray(data.flatCategories)).toBeTruthy();
  });

  test('should handle empty search results', async () => {
    const response = await apiClient.getProducts({ search: 'nonexistentproduct12345' });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(Array.isArray(data.products)).toBeTruthy();
    expect(data.products.length).toBe(0);
  });

  test('should get all products without pagination', async () => {
    const response = await apiClient.getProducts({ all: true });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('products');
    expect(Array.isArray(data.products)).toBeTruthy();
    // Should return more than default page limit
    expect(data.products.length).toBeGreaterThan(20);
  });
});