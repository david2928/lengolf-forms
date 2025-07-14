'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationMeta {
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface ProductPaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
}

export function ProductPagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  className
}: ProductPaginationProps) {
  const { page, per_page, total_count, total_pages, has_next, has_prev } = pagination;

  // Calculate the range of items being shown
  const startItem = Math.min((page - 1) * per_page + 1, total_count);
  const endItem = Math.min(page * per_page, total_count);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    // Calculate the range of pages to show
    const start = Math.max(1, page - delta);
    const end = Math.min(total_pages, page + delta);

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    // Add first page and dots if needed
    if (start > 1) {
      rangeWithDots.push(1);
      if (start > 2) {
        rangeWithDots.push('...');
      }
    }

    rangeWithDots.push(...range);

    // Add last page and dots if needed
    if (end < total_pages) {
      if (end < total_pages - 1) {
        rangeWithDots.push('...');
      }
      rangeWithDots.push(total_pages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  if (total_count === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop Pagination */}
      <div className={cn('hidden md:flex items-center justify-between', className)}>
        {/* Results info */}
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{total_count}</span> results
          </p>

          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show</span>
            <Select value={per_page.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center gap-2">
          {/* First page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={!has_prev}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">Go to first page</span>
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!has_prev}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Go to previous page</span>
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((pageNumber, index) => {
              if (pageNumber === '...') {
                return (
                  <span key={index} className="px-3 py-1 text-sm text-gray-500">
                    ...
                  </span>
                );
              }

              const isCurrentPage = pageNumber === page;
              return (
                <Button
                  key={pageNumber}
                  variant={isCurrentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNumber as number)}
                  className={cn(
                    "h-8 w-8 p-0",
                    isCurrentPage && "bg-primary text-primary-foreground"
                  )}
                >
                  {pageNumber}
                </Button>
              );
            })}
          </div>

          {/* Next page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!has_next}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Go to next page</span>
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(total_pages)}
            disabled={!has_next}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
            <span className="sr-only">Go to last page</span>
          </Button>
        </div>
      </div>

      {/* Mobile Pagination */}
      <div className={cn('md:hidden space-y-3', className)}>
        {/* Mobile Results Info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <span className="font-medium">{startItem}-{endItem}</span> of{' '}
            <span className="font-medium">{total_count}</span> products
          </p>

          {/* Mobile Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Show</span>
            <Select value={per_page.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="w-16 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex items-center justify-between gap-2">
          {/* Previous */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!has_prev}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          {/* Page Info */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600 px-2">
              Page {page} of {total_pages}
            </span>
          </div>

          {/* Next */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!has_next}
            className="flex-1"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Mobile Quick Jump (only show if more than 3 pages) */}
        {total_pages > 3 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={!has_prev}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-3 w-3" />
            </Button>
            
            {/* Show a few page numbers around current page */}
            <div className="flex items-center gap-1">
              {pageNumbers.slice(0, 5).map((pageNumber, index) => {
                if (pageNumber === '...') {
                  return (
                    <span key={index} className="px-2 py-1 text-xs text-gray-500">
                      ...
                    </span>
                  );
                }

                const isCurrentPage = pageNumber === page;
                return (
                  <Button
                    key={pageNumber}
                    variant={isCurrentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNumber as number)}
                    className={cn(
                      "h-7 w-7 p-0 text-xs",
                      isCurrentPage && "bg-primary text-primary-foreground"
                    )}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(total_pages)}
              disabled={!has_next}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

interface SimplePaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
}

export function SimplePagination({
  pagination,
  onPageChange,
  className
}: SimplePaginationProps) {
  const { page, total_count, total_pages, has_next, has_prev } = pagination;

  if (total_count === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={!has_prev}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Previous
      </Button>

      <span className="text-sm text-gray-600 px-3">
        Page {page} of {total_pages}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={!has_next}
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}