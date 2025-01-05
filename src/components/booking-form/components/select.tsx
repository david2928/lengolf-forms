'use client'

import * as React from 'react'
import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const CustomSelect = ({
  value,
  onValueChange,
  children,
  placeholder,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  placeholder?: string
  className?: string
}) => (
  <Select.Root value={value} onValueChange={onValueChange}>
    <Select.Trigger 
      className={cn(
        "inline-flex items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-full gap-1",
        className
      )}
    >
      <Select.Value placeholder={placeholder} />
      <Select.Icon>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content 
        position="popper"
        className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md relative animate-in fade-in-80"
        style={{ width: 'var(--radix-select-trigger-width)' }}
      >
        <Select.Viewport className="p-1">
          {children}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
)

const CustomSelectItem = React.forwardRef<
  HTMLDivElement,
  Select.SelectItemProps & { className?: string }
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <Select.Item
      {...props}
      ref={forwardedRef}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
        <Check className="h-4 w-4" />
      </Select.ItemIndicator>
    </Select.Item>
  )
})
CustomSelectItem.displayName = 'CustomSelectItem'

export { CustomSelect as Select, CustomSelectItem as SelectItem }