'use client';

import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Category } from '@/types/product-management';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const isMobile = useMediaQuery('(max-width: 640px)');

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

  const handleSelect = (categoryId: string) => {
    onValueChange(categoryId);
    setOpen(false);
    setSearchValue('');
  };

  const buttonContent = (
    <>
      <span className="truncate">
        {selectedCategory ? selectedCategory.name : placeholder}
      </span>
      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </>
  );

  const buttonClassName = cn(
    "w-full justify-between",
    error && "border-red-500",
    className
  );

  const commandContent = (
    <Command>
      <CommandInput
        placeholder="Search categories..."
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList className={isMobile ? "max-h-[60vh]" : "max-h-[300px]"}>
        <CommandEmpty>No category found.</CommandEmpty>
        {filteredGroups.map((group) => (
          <CommandGroup key={group.parent.id} heading={group.parent.name}>
            {group.children.map((category) => (
              <CommandItem
                key={category.id}
                value={category.name}
                onSelect={() => handleSelect(category.id)}
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
  );

  // Mobile: use a Dialog (bottom sheet style) for reliable scrolling
  // Avoids Popover scroll conflicts inside parent Dialog
  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          aria-haspopup="dialog"
          aria-expanded={open}
          className={buttonClassName}
          onClick={() => setOpen(true)}
        >
          {buttonContent}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="sm:max-w-md p-0 gap-0 top-auto bottom-0 translate-y-0 translate-x-[-50%] rounded-t-xl rounded-b-none max-h-[80vh] data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom"
            onInteractOutside={(e) => e.stopPropagation()}
            onEscapeKeyDown={(e) => e.stopPropagation()}
          >
            <DialogHeader className="px-4 pt-4 pb-2">
              <DialogTitle className="text-base">Select Category</DialogTitle>
            </DialogHeader>
            {commandContent}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop: use Popover (no onClick needed - PopoverTrigger handles toggle)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={buttonClassName}
        >
          {buttonContent}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        {commandContent}
      </PopoverContent>
    </Popover>
  );
}
