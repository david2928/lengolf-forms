import * as React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, onCheckedChange, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      checked={checked}
      onChange={e => onCheckedChange?.(e.target.checked)}
      {...props}
      className={
        'h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary ' +
        (props.className || '')
      }
    />
  )
);
Checkbox.displayName = 'Checkbox'; 