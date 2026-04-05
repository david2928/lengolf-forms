'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface CourseRentalCounterProps {
  count: number;
  setNames: string[];
  isLoading: boolean;
  isMobile?: boolean;
}

export function CourseRentalCounter({
  count,
  setNames,
  isLoading,
  isMobile = false
}: CourseRentalCounterProps) {
  const router = useRouter();

  if (count === 0 && !isLoading) {
    return null;
  }

  const handleClick = () => {
    router.push('/manage-club-rentals');
  };

  const tooltip = setNames.length > 0
    ? `Out on course: ${setNames.join(', ')}`
    : 'Club sets out on course rental';

  return (
    <Button
      variant="outline"
      size={isMobile ? 'sm' : 'default'}
      onClick={handleClick}
      disabled={isLoading || count === 0}
      title={tooltip}
      className={`
        relative flex items-center gap-2
        ${count > 0 ? 'border-cyan-500 bg-cyan-50 hover:bg-cyan-100 text-cyan-700' : ''}
        ${isMobile ? 'px-2' : 'px-3'}
      `}
    >
      <span className="text-base leading-none">🏌️</span>
      {isLoading ? (
        <span className={isMobile ? 'text-xs' : 'text-sm'}>...</span>
      ) : (
        <>
          <span className={`font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
            {count}
          </span>
          {!isMobile && (
            <span className="text-sm">club rental{count !== 1 ? 's' : ''}</span>
          )}
        </>
      )}
    </Button>
  );
}
