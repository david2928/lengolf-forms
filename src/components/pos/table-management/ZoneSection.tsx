'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TableCard } from './TableCard';
import type { Zone, Table, ZoneSectionProps } from '@/types/pos';

export function ZoneSection({ zone, tables, onTableClick, onTableStatusChange, closeTable }: ZoneSectionProps) {
  const occupiedCount = tables.filter(t => t.currentSession?.status === 'occupied').length;
  const totalCount = tables.length;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: zone.colorTheme }}
          />
          <CardTitle className="text-xl">
            {zone.displayName}
          </CardTitle>
          <span className="text-sm text-gray-500">
            ({occupiedCount}/{totalCount} occupied)
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        {tables.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tables in this zone
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {tables
              .sort((a, b) => a.tableNumber - b.tableNumber)
              .map(table => (
                <TableCard
                  key={table.id}
                  table={table}
                  onClick={onTableClick}
                  onStatusChange={onTableStatusChange}
                  closeTable={closeTable}
                />
              ))
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}