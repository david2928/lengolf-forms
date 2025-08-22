'use client';

import React from 'react';
import { Calendar, Plus, Search } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HierarchicalFilterOption {
  value: string;
  label: string;
  type: 'all' | 'category' | 'subcategory';
}

interface ExpenseControlsProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  hierarchicalFilterValue: string;
  onHierarchicalFilterChange: (value: string) => void;
  hierarchicalFilterOptions: HierarchicalFilterOption[];
  costTypeFilter: string;
  onCostTypeFilterChange: (filter: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onAddExpense: () => void;
}

export default function ExpenseControls({
  selectedPeriod,
  onPeriodChange,
  hierarchicalFilterValue,
  onHierarchicalFilterChange,
  hierarchicalFilterOptions,
  costTypeFilter,
  onCostTypeFilterChange,
  searchTerm,
  onSearchChange,
  onAddExpense
}: ExpenseControlsProps) {
  // Generate month options
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    
    return options;
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Controls */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {/* Period Selector */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <Label className="font-semibold text-gray-900">Period</Label>
              </div>
              <Select value={selectedPeriod} onValueChange={onPeriodChange}>
                <SelectTrigger className="w-48 h-10 bg-white border-2 border-gray-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="w-48">
                  {generateMonthOptions().slice(0, 12).map(option => (
                    <SelectItem key={option.value} value={option.value} className="hover:bg-primary/5">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                          option.value === new Date().toISOString().slice(0, 7) 
                            ? 'bg-primary' 
                            : 'bg-gray-300'
                        }`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              {/* Hierarchical Category/Subcategory Filter */}
              <Select value={hierarchicalFilterValue} onValueChange={onHierarchicalFilterChange}>
                <SelectTrigger className="w-56 h-10">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {hierarchicalFilterOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className={`${
                        option.type === 'category' ? 'font-semibold' : 
                        option.type === 'subcategory' ? 'font-normal text-gray-600' : 
                        'font-semibold'
                      }`}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={costTypeFilter} onValueChange={onCostTypeFilterChange}>
                <SelectTrigger className="w-36 h-10">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-64 h-10 bg-white border-2 border-gray-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
            
            {/* Add Button */}
            <Button 
              onClick={onAddExpense} 
              className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}