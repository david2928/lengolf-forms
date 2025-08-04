'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Category } from '@/types/product-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface CategorySelectorProps {
  categories: Category[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export function CategorySelector({
  categories,
  value,
  onValueChange,
  placeholder = "Select a category",
  className,
  error = false
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Get subcategories only (categories with parent_id)
  const subCategories = categories.filter(c => c.parent_id);
  
  // Get parent categories for grouping
  const parentCategories = categories.filter(c => !c.parent_id);
  
  // Group subcategories by parent
  const groupedCategories = parentCategories.map(parent => ({
    parent,
    children: subCategories.filter(sub => sub.parent_id === parent.id)
  })).filter(group => group.children.length > 0);

  // Get selected category name
  const selectedCategory = subCategories.find(c => c.id === value);

  // Filter categories based on search
  const filteredGroups = groupedCategories.map(group => ({
    ...group,
    children: group.children.filter(child => 
      child.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      group.parent.name.toLowerCase().includes(searchValue.toLowerCase())
    )
  })).filter(group => group.children.length > 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            error && "border-red-500",
            className
          )}
        >
          {selectedCategory ? selectedCategory.name : placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search categories..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            {filteredGroups.map((group) => (
              <CommandGroup key={group.parent.id} heading={group.parent.name}>
                {group.children.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={category.name}
                    onSelect={() => {
                      onValueChange(category.id);
                      setOpen(false);
                      setSearchValue('');
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === category.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {category.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}