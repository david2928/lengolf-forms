'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';
import type { Vendor } from '@/types/expense-tracker';

interface VendorComboboxProps {
  value: Vendor | null;
  vendorNameOverride: string | null;
  onChange: (vendor: Vendor | null, nameOverride: string | null) => void;
  compact?: boolean;
}

export function VendorCombobox({ value, vendorNameOverride, onChange, compact }: VendorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);

  const searchVendors = useMemo(
    () =>
      debounce(async (q: string) => {
        if (!q || q.length < 1) {
          // Load recent vendors when no search term
          setLoading(true);
          try {
            const res = await fetch('/api/admin/expense-tracker/vendors?q=');
            if (res.ok) {
              const data = await res.json();
              setVendors(data.vendors || []);
            }
          } catch { /* ignore */ } finally {
            setLoading(false);
          }
          return;
        }
        setLoading(true);
        try {
          const res = await fetch(`/api/admin/expense-tracker/vendors?q=${encodeURIComponent(q)}`);
          if (res.ok) {
            const data = await res.json();
            setVendors(data.vendors || []);
          }
        } catch {
          setVendors([]);
        } finally {
          setLoading(false);
        }
      }, 250),
    []
  );

  // Clean up debounced function on unmount
  useEffect(() => {
    return () => { searchVendors.cancel(); };
  }, [searchVendors]);

  // Load vendors when popover opens
  useEffect(() => {
    if (open) {
      searchVendors(searchTerm);
    }
  }, [open, searchTerm, searchVendors]);

  const handleSelect = useCallback(
    (vendor: Vendor) => {
      onChange(vendor, null);
      setOpen(false);
      setSearchTerm('');
    },
    [onChange]
  );

  const handleCreateNew = useCallback(async () => {
    if (!searchTerm.trim()) return;
    try {
      const res = await fetch('/api/admin/expense-tracker/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: searchTerm.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        onChange(data.vendor, null);
      }
    } catch { /* ignore */ }
    setOpen(false);
    setSearchTerm('');
  }, [searchTerm, onChange]);

  const displayName = value?.name || vendorNameOverride || '';
  const exactMatch = vendors.some(
    (v) => v.name.toLowerCase() === searchTerm.toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center justify-between text-left text-sm w-full truncate',
            compact
              ? 'px-1.5 py-0.5 border-0 bg-transparent hover:bg-muted/50 rounded min-w-[120px]'
              : 'px-3 py-2 border rounded-md bg-background min-w-[180px]',
            !displayName && 'text-muted-foreground'
          )}
        >
          <span className="truncate">{displayName || 'Select vendor...'}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search vendors..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {loading && <CommandEmpty>Searching...</CommandEmpty>}
            {!loading && vendors.length === 0 && !searchTerm && (
              <CommandEmpty>No vendors yet.</CommandEmpty>
            )}
            {!loading && vendors.length === 0 && searchTerm && (
              <CommandEmpty>No matches found.</CommandEmpty>
            )}
            {vendors.length > 0 && (
              <CommandGroup>
                {vendors.map((vendor) => (
                  <CommandItem
                    key={vendor.id}
                    value={String(vendor.id)}
                    onSelect={() => handleSelect(vendor)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value?.id === vendor.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{vendor.name}</span>
                      {vendor.company_name && vendor.company_name !== vendor.name && (
                        <span className="text-xs text-muted-foreground truncate">
                          {vendor.company_name}
                        </span>
                      )}
                      {vendor.tax_id && (
                        <span className="text-xs text-muted-foreground">
                          Tax ID: {vendor.tax_id}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {searchTerm && !exactMatch && (
              <CommandGroup>
                <CommandItem onSelect={handleCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create &ldquo;{searchTerm}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
