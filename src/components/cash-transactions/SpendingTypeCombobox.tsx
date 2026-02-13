'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { SPENDING_TYPES } from '@/types/cash-transactions'

interface SpendingTypeComboboxProps {
  value: string
  onChange: (type: string) => void
}

export function SpendingTypeCombobox({ value, onChange }: SpendingTypeComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const filteredTypes = SPENDING_TYPES.filter((t) =>
    t.toLowerCase().includes(searchValue.toLowerCase())
  )

  const showCustom =
    searchValue.trim().length > 0 &&
    !SPENDING_TYPES.some((t) => t.toLowerCase() === searchValue.trim().toLowerCase())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || 'Select spending type...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or type custom..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No matching type.</CommandEmpty>
            <CommandGroup>
              {filteredTypes.map((type) => (
                <CommandItem
                  key={type}
                  value={type}
                  onSelect={() => {
                    onChange(type)
                    setOpen(false)
                    setSearchValue('')
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === type ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {type}
                </CommandItem>
              ))}
            </CommandGroup>
            {showCustom && (
              <CommandGroup>
                <CommandItem
                  value={`custom:${searchValue.trim()}`}
                  onSelect={() => {
                    onChange(searchValue.trim())
                    setOpen(false)
                    setSearchValue('')
                  }}
                  className="text-primary"
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  Use custom: &ldquo;{searchValue.trim()}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
