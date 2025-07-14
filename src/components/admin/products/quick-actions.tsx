'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  Download, 
  Upload, 
  Settings,
  Filter,
  RefreshCw,
  Archive,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  onCreateProduct: () => void;
  onCreateCategory: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
  className?: string;
}

export function QuickActions({
  onCreateProduct,
  onCreateCategory,
  onExport,
  onImport,
  onRefresh,
  isLoading = false,
  className
}: QuickActionsProps) {
  return (
    <Card className={cn('border-0 shadow-sm bg-white', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Package className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">Product Management</span>
          <span className="sm:hidden">Products</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
          {/* Primary Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={onCreateProduct}
              className="flex items-center gap-2 flex-1 sm:flex-initial"
              disabled={isLoading}
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Product</span>
              <span className="sm:hidden">Product</span>
            </Button>

            <Button 
              variant="outline"
              onClick={onCreateCategory}
              className="flex items-center gap-2 flex-1 sm:flex-initial"
              disabled={isLoading}
              size="sm"
            >
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">New Category</span>
              <span className="sm:hidden">Category</span>
            </Button>
          </div>

          {/* Secondary Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 flex-1 sm:flex-initial"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLoading} className="flex-1 sm:flex-initial">
                  <Settings className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">More Actions</span>
                  <span className="sm:hidden">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onExport && (
                  <DropdownMenuItem onClick={onExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Products
                  </DropdownMenuItem>
                )}
                {onImport && (
                  <DropdownMenuItem onClick={onImport}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Products
                  </DropdownMenuItem>
                )}
                {(onExport || onImport) && <DropdownMenuSeparator />}
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
}

export function QuickSearch({
  value,
  onChange,
  onClear,
  placeholder = "Search products...",
  className
}: QuickSearchProps) {
  return (
    <div className={cn("relative max-w-md", className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
        >
          <span className="sr-only">Clear search</span>
          ×
        </Button>
      )}
    </div>
  );
}

interface ActionBarProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function ActionBar({ title, subtitle, children, className }: ActionBarProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 py-3 sm:py-4', className)}>
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 shrink-0">
        {children}
      </div>
    </div>
  );
}