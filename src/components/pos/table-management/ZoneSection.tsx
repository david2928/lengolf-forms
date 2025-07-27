'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Users } from 'lucide-react';
import { TableCard } from './TableCard';
import type { Zone, Table, ZoneSectionProps } from '@/types/pos';

export function ZoneSection({ zone, tables, onTableClick, onTableStatusChange, closeTable }: ZoneSectionProps) {
  const occupiedCount = tables.filter(t => t.currentSession?.status === 'occupied').length;
  const totalCount = tables.length;
  const availableCount = totalCount - occupiedCount;

  const isBayZone = zone.name?.toLowerCase().includes('bay') || zone.displayName?.toLowerCase().includes('bay');
  
  return (
    <Card className={`transition-all duration-200 ${
      isBayZone 
        ? 'border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 shadow-lg' 
        : 'border-gray-200 hover:shadow-md'
    }`}>
      <CardHeader className={`pb-4 ${
        isBayZone 
          ? 'bg-gradient-to-r from-amber-100/80 via-amber-50/60 to-yellow-50/80 border-b border-amber-200' 
          : 'bg-gray-50/30'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isBayZone && (
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-200 shadow-sm flex-shrink-0">
                <Crown className="w-4 h-4 text-amber-700" />
              </div>
            )}
            <div 
              className={`${isBayZone ? 'w-4 h-4' : 'w-4 h-4'} rounded-full border-2 border-white shadow-sm flex-shrink-0`}
              style={{ backgroundColor: zone.colorTheme }}
            />
            <div className="min-w-0 flex-1">
              <CardTitle className={`${
                isBayZone 
                  ? 'text-lg sm:text-xl font-bold text-amber-900' 
                  : 'text-base sm:text-lg font-semibold text-gray-900'
              } truncate`}>
                {zone.displayName}
              </CardTitle>
              {isBayZone && (
                <p className="text-xs sm:text-sm text-amber-700 font-medium mt-1 truncate">
                  Premium Golf Simulator Experience
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
            <Badge 
              variant={availableCount > 0 ? "secondary" : "outline"} 
              className={`text-xs font-medium whitespace-nowrap ${
                isBayZone 
                  ? availableCount > 0 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                  : availableCount > 0 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}
            >
              <Users className="w-3 h-3 mr-1" />
              {availableCount} Available
            </Badge>
            <Badge 
              variant="outline" 
              className={`text-xs font-medium whitespace-nowrap ${
                isBayZone 
                  ? 'bg-amber-50 text-amber-700 border-amber-300' 
                  : 'bg-gray-50 text-gray-600 border-gray-300'
              }`}
            >
              {occupiedCount}/{totalCount}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={`p-4 sm:p-5 ${isBayZone ? 'bg-gradient-to-b from-transparent to-amber-50/20' : ''}`}>
        {tables.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">No tables configured</p>
            <p className="text-sm text-gray-400 mt-1">Contact admin to set up tables</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {tables
              .sort((a, b) => a.tableNumber - b.tableNumber)
              .map(table => (
                <TableCard
                  key={table.id}
                  table={table}
                  onClick={onTableClick}
                  onStatusChange={onTableStatusChange}
                  closeTable={closeTable}
                  isPremiumZone={isBayZone}
                />
              ))
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}