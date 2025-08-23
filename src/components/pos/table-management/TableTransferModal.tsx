'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ArrowRightLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Table, Zone } from '@/types/pos';

interface TableTransferModalProps {
  isOpen: boolean;
  currentTable: Table;
  onClose: () => void;
  onTransferComplete: (toTableId: string) => void;
}



export function TableTransferModal({
  isOpen,
  currentTable,
  onClose,
  onTransferComplete
}: TableTransferModalProps) {
  
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string>('');

  const fetchAvailableTables = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pos/tables');
      if (response.ok) {
        const data = await response.json();
        
        // Filter out occupied tables and the current table
        const available = data.tables.filter((table: Table) => 
          table.id !== currentTable.id && 
          table.currentSession?.status !== 'occupied'
        );
        
        setAvailableTables(available);
        setZones(data.zones || []);

        // Auto-select Bar 1 if available and moving from a Bay
        if (currentTable.zone?.name?.toLowerCase().includes('bay')) {
          const bar1 = available.find((table: Table) => 
            table.zone?.name?.toLowerCase().includes('bar') && 
            table.displayName?.includes('1')
          );
          if (bar1) {
            setSelectedTableId(bar1.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch available tables:', error);
    } finally {
      setLoading(false);
    }
  }, [currentTable.id, currentTable.zone?.name]);

  // Fetch available tables when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableTables();
    }
  }, [isOpen, fetchAvailableTables]);

  const handleTransfer = async () => {
    if (!selectedTableId) return;
    
    setIsTransferring(true);
    setTransferError('');
    
    try {
      const response = await fetch('/api/pos/tables/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromTableId: currentTable.id,
          toTableId: selectedTableId,
          transferAll: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        onTransferComplete(selectedTableId);
        onClose();
      } else {
        const error = await response.json();
        setTransferError(error.error || 'Transfer failed');
      }
    } catch (error) {
      setTransferError('Network error occurred');
    } finally {
      setIsTransferring(false);
    }
  };

  const getSelectedTable = () => {
    return availableTables.find(table => table.id === selectedTableId);
  };

  const groupTablesByZone = () => {
    const grouped: { [zoneDisplayName: string]: Table[] } = {};
    
    availableTables.forEach(table => {
      const zoneDisplayName = table.zone?.displayName || 'Other';
      if (!grouped[zoneDisplayName]) {
        grouped[zoneDisplayName] = [];
      }
      grouped[zoneDisplayName].push(table);
    });

    // Sort zones with Bar Area first, then alphabetically
    const sortedZones = Object.keys(grouped).sort((a, b) => {
      if (a.toLowerCase().includes('bar')) return -1;
      if (b.toLowerCase().includes('bar')) return 1;
      return a.localeCompare(b);
    });

    return sortedZones.map(zoneDisplayName => ({
      name: zoneDisplayName,
      tables: grouped[zoneDisplayName].sort((a, b) => a.displayName.localeCompare(b.displayName))
    }));
  };

  const selectedTable = getSelectedTable();

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
              onClick={onClose}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ 
                type: "spring", 
                damping: 20, 
                stiffness: 300
              }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Move Table</h2>
                    <p className="text-gray-600 mt-1">
                      Moving from: <span className="font-semibold text-blue-600">{currentTable.displayName}</span>
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-gray-500">Loading available tables...</div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Select destination table:
                        </h3>
                        
                        {groupTablesByZone().map(({ name: zoneName, tables }) => (
                          <div key={zoneName} className="mb-6">
                            <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center">
                              {zoneName}
                              {zoneName.toLowerCase().includes('bar') && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Recommended
                                </Badge>
                              )}
                            </h4>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {tables.map((table) => (
                                <button
                                  key={table.id}
                                  onClick={() => setSelectedTableId(table.id)}
                                  className={cn(
                                    "p-4 border-2 rounded-xl text-left transition-all duration-200 hover:shadow-md",
                                    selectedTableId === table.id
                                      ? "border-blue-500 bg-blue-50 shadow-md"
                                      : "border-gray-200 hover:border-gray-300"
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-semibold text-gray-900">
                                        {table.displayName}
                                      </div>
                                      <div className="text-sm text-green-600 font-medium">
                                        Available
                                      </div>
                                    </div>
                                    {selectedTableId === table.id && (
                                      <Check className="w-5 h-5 text-blue-500" />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}

                        {availableTables.length === 0 && !loading && (
                          <div className="text-center py-12 text-gray-500">
                            <div className="text-lg font-medium mb-2">No tables available</div>
                            <div className="text-sm">All other tables are currently occupied</div>
                          </div>
                        )}
                      </div>

                      {/* Error Display */}
                      {transferError && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="text-red-800 text-sm">{transferError}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200">
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleTransfer}
                      disabled={!selectedTableId || loading || isTransferring}
                      className="flex-1"
                    >
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      {isTransferring ? 'Transferring...' : `Move to ${selectedTable?.displayName || 'Selected Table'}`}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </>
  );
}