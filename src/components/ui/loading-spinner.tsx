import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  text?: string
  variant?: 'default' | 'overlay' | 'inline'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6', 
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

export function LoadingSpinner({ 
  size = 'md', 
  className, 
  text,
  variant = 'default' 
}: LoadingSpinnerProps) {
  const spinnerElement = (
    <Loader2 className={cn(
      'animate-spin text-muted-foreground',
      sizeClasses[size],
      className
    )} />
  )

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
        <div className="text-center space-y-2">
          {spinnerElement}
          {text && <p className="text-sm text-muted-foreground">{text}</p>}
        </div>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2">
        {spinnerElement}
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    )
  }

  // Default variant - centered
  return (
    <div className="flex flex-col items-center justify-center space-y-2 p-8">
      {spinnerElement}
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  )
} 