import React from 'react'

interface ResponsiveDataViewProps<T> {
  data: T[]
  emptyStateMessage: string
  emptyStateIcon: React.ReactNode
  renderMobileCard: (item: T, index: number) => React.ReactNode
  renderDesktopTable: (data: T[]) => React.ReactNode
}

export function ResponsiveDataView<T>({
  data,
  emptyStateMessage,
  emptyStateIcon,
  renderMobileCard,
  renderDesktopTable
}: ResponsiveDataViewProps<T>) {
  // Empty state
  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="flex flex-col items-center gap-3">
          {emptyStateIcon}
          <div>
            <p className="font-medium text-lg">{emptyStateMessage}</p>
            <p className="text-sm text-gray-400 mt-1">for the selected criteria.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Card View (md and below) */}
      <div className="block md:hidden">
        <div className="p-4 space-y-3">
          {data.map((item, index) => renderMobileCard(item, index))}
        </div>
      </div>
      
      {/* Desktop Table View (md and above) */}
      <div className="hidden md:block overflow-x-auto">
        {renderDesktopTable(data)}
      </div>
    </>
  )
}