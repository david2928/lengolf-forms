'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Wifi, WifiOff, Plus, Table2, Home } from 'lucide-react';
import { useTableManagement } from '@/hooks/use-table-management';
import { TableCard } from './TableCard';
import { TableDetailModal } from './TableDetailModal';
import { PaymentInterface } from '../payment/PaymentInterface';
import type { Table, TableSession } from '@/types/pos';
import type { PaymentProcessingResponse } from '@/types/payment';

export interface TableManagementDashboardProps {
  onTableSelect?: (tableSession: TableSession) => void;
}

export function TableManagementDashboard({ onTableSelect }: TableManagementDashboardProps = {}) {
  const router = useRouter();
  const {
    tables,
    zones,
    summary,
    selectedTable,
    isLoading,
    error,
    isConnected,
    setSelectedTable,
    refreshTables,
    openTable,
    closeTable
  } = useTableManagement();

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPaymentTable, setSelectedPaymentTable] = useState<Table | null>(null);
  const [showPaymentInterface, setShowPaymentInterface] = useState(false);

  const handleTableClick = (table: Table) => {
    // If table is already occupied and we have onTableSelect, go directly to POS interface
    if (table.currentSession?.status === 'occupied' && onTableSelect) {
      onTableSelect(table.currentSession);
      return;
    }
    
    // Otherwise, show the table detail modal
    setSelectedTable(table);
    setIsDetailModalOpen(true);
  };

  const handlePayment = (table: Table) => {
    if (!table.currentSession || table.currentSession.status !== 'occupied') {
      alert('Table must be occupied to process payment');
      return;
    }
    
    setSelectedPaymentTable(table);
    setShowPaymentInterface(true);
  };

  const handlePaymentComplete = async (response: PaymentProcessingResponse) => {
    if (response.success) {
      // Close payment interface
      setShowPaymentInterface(false);
      setSelectedPaymentTable(null);
      
      // Refresh tables to update status
      await refreshTables();
      
      // If payment indicates table should be closed, navigate back to tables view
      if (response.redirectToTables) {
        // Table is already closed, no additional action needed
        console.log('Payment completed and table session closed');
      }
    }
  };

  const handlePaymentBack = () => {
    setShowPaymentInterface(false);
    setSelectedPaymentTable(null);
  };

  const handleTableStatusChange = async (tableId: string, status: 'free' | 'occupied') => {
    try {
      if (status === 'free') {
        const table = tables.find(t => t.id === tableId);
        if (table?.currentSession?.status === 'occupied') {
          await closeTable(tableId);
        }
      }
    } catch (error) {
      console.error('Error changing table status:', error);
    }
  };

  const handleOpenTable = async (request: any) => {
    if (!selectedTable) return;
    
    try {
      const tableSession = await openTable(selectedTable.id, request);
      setIsDetailModalOpen(false);
      setSelectedTable(null);
      
      // If onTableSelect is provided, navigate to POS interface
      if (onTableSelect && tableSession) {
        onTableSelect(tableSession.session);
      }
    } catch (error) {
      console.error('Error opening table:', error);
      throw error;
    }
  };

  const handleQuickOpenTable = (zoneId: string) => {
    // Find next available table in the zone
    const zoneTables = tables.filter(table => table.zoneId === zoneId);
    const availableTable = zoneTables.find(table => table.currentSession?.status !== 'occupied');
    
    if (availableTable) {
      setSelectedTable(availableTable);
      setIsDetailModalOpen(true);
    } else {
      // Could show a toast or modal saying no tables available
      console.log('No available tables in this zone');
    }
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50">
        <div className="text-center p-8">
          <div className="text-red-600 text-lg font-medium mb-4">
            Connection Error
          </div>
          <p className="text-red-700 mb-6">{error.message}</p>
          <Button onClick={refreshTables} size="lg" className="px-8">
            <RefreshCw className="w-5 h-5 mr-2" />
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  // Show payment interface if selected
  if (showPaymentInterface && selectedPaymentTable?.currentSession) {
    return (
      <PaymentInterface
        tableSessionId={selectedPaymentTable.currentSession.id}
        tableNumber={selectedPaymentTable.displayName}
        customerName={selectedPaymentTable.currentSession.customer?.name || selectedPaymentTable.currentSession.booking?.name}
        totalAmount={selectedPaymentTable.currentSession.totalAmount}
        onBack={handlePaymentBack}
        onPaymentComplete={handlePaymentComplete}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - Matching POS Header Style */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Left: Title and Status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">Lengolf POS</h1>
                  <div className="flex items-center space-x-3 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      {isConnected ? (
                        <Wifi className="w-4 h-4 text-green-600" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-600" />
                      )}
                      <span>{isConnected ? 'Live' : 'Offline'}</span>
                    </div>
                    {summary && (
                      <>
                        <span>Free: {summary.availableTables}</span>
                        <span>Occupied: {summary.occupiedTables}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={refreshTables}
                disabled={isLoading}
                className="flex items-center justify-center w-10 h-10 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                title="Refresh Tables"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex items-center justify-center w-10 h-10 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                title="Back to Backoffice"
              >
                <Home className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-auto">
        {/* Tables Grid - Optimized for Touch */}
        <div className="p-4 space-y-6">
          {zones
            .sort((a, b) => {
              // Always put Bay zones first
              if (a.zoneType === 'bay' && b.zoneType !== 'bay') return -1;
              if (b.zoneType === 'bay' && a.zoneType !== 'bay') return 1;
              // Then sort by display order
              return a.displayOrder - b.displayOrder;
            })
            .map(zone => {
            const zoneTables = tables.filter(table => table.zoneId === zone.id);
            
            return (
              <div key={zone.id} className="space-y-3">
                {/* Zone Header */}
                <div className="flex items-center gap-3 px-2">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: zone.colorTheme }}
                  />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {zone.displayName}
                  </h2>
                  <span className="text-sm text-gray-500">
                    ({zoneTables.filter(t => t.currentSession?.status === 'occupied').length}/{zoneTables.length})
                  </span>
                </div>

                {/* Tables Grid - Optimized for Zone Type */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {/* Show all bay tables, but for other zones show compact plus icons */}
                  {zone.zoneType === 'bay' ? (
                    // Bay tables - Always show full cards
                    zoneTables
                      .sort((a, b) => a.tableNumber - b.tableNumber)
                      .map(table => (
                        <TableCard
                          key={table.id}
                          table={table}
                          onClick={handleTableClick}
                          onStatusChange={handleTableStatusChange}
                          onPayment={handlePayment}
                          closeTable={closeTable}
                        />
                      ))
                  ) : (
                    // Non-bay tables - Show occupied tables + add button
                    <>
                      {zoneTables
                        .filter(table => table.currentSession?.status === 'occupied')
                        .sort((a, b) => a.tableNumber - b.tableNumber)
                        .map(table => (
                          <TableCard
                            key={table.id}
                            table={table}
                            onClick={handleTableClick}
                            onStatusChange={handleTableStatusChange}
                            onPayment={handlePayment}
                            closeTable={closeTable}
                          />
                        ))
                      }
                      {/* Quick Add Table Button */}
                      <div
                        className="h-32 bg-white border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                        onClick={() => handleQuickOpenTable(zone.id)}
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mb-1">
                          <Plus className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-xs font-medium text-blue-600">Add Table</span>
                        <span className="text-xs text-gray-500 mt-1">{zone.displayName}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading State */}
        {isLoading && tables.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading tables...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && tables.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500 text-lg">No tables configured</p>
              <p className="text-gray-400 text-sm mt-2">Contact admin to set up tables</p>
            </div>
          </div>
        )}
      </div>


      {/* Table Detail Modal */}
      {selectedTable && (
        <TableDetailModal
          table={selectedTable}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedTable(null);
          }}
          onOpenTable={handleOpenTable}
        />
      )}

    </div>
  );
}