'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Wifi, WifiOff, Plus, Table2, Home, User } from 'lucide-react';
import { useTableManagement } from '@/hooks/use-table-management';
import { useStaffAuth } from '@/hooks/use-staff-auth';
import { bluetoothThermalPrinter } from '@/services/BluetoothThermalPrinter';
import { USBThermalPrinter } from '@/services/USBThermalPrinter';
import { unifiedPrintService, PrintType } from '@/services/UnifiedPrintService';
import { TableCard } from './TableCard';
import { TableDetailModal } from './TableDetailModal';
import { PaymentInterface } from '../payment/PaymentInterface';
import { OccupiedTableDetailsPanel } from './OccupiedTableDetailsPanel';
import { CancelTableModal } from './CancelTableModal';
import type { Table, TableSession, TableStatus } from '@/types/pos';
import type { PaymentProcessingResponse } from '@/types/payment';

export interface TableManagementDashboardProps {
  onTableSelect?: (tableSession: TableSession) => void;
}

export function TableManagementDashboard({ onTableSelect }: TableManagementDashboardProps = {}) {
  const router = useRouter();
  const { staff, logout } = useStaffAuth();
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
  
  // New states for occupied table selection
  const [selectedOccupiedTable, setSelectedOccupiedTable] = useState<Table | null>(null);
  const [showOccupiedDetailsPanel, setShowOccupiedDetailsPanel] = useState(false);
  const [showOccupiedCancelModal, setShowOccupiedCancelModal] = useState(false);
  
  // Bill printing states
  const [isBluetoothSupported, setIsBluetoothSupported] = useState<boolean>(false);

  // Check Bluetooth support on mount
  useEffect(() => {
    const checkBluetoothSupport = () => {
      try {
        // Import BluetoothThermalPrinter class and check static method
        import('@/services/BluetoothThermalPrinter').then(({ BluetoothThermalPrinter }) => {
          const supported = BluetoothThermalPrinter.isSupported();
          setIsBluetoothSupported(supported);
          console.log('🔵 Bluetooth support:', supported);
        });
      } catch (error) {
        console.log('🔵 Bluetooth not supported:', error);
        setIsBluetoothSupported(false);
      }
    };
    
    checkBluetoothSupport();
  }, []);

  const handleTableClick = (table: Table) => {
    // If table is already occupied, show the occupied table details panel
    if (table.currentSession?.status === 'occupied') {
      setSelectedOccupiedTable(table);
      setShowOccupiedDetailsPanel(true);
      return;
    }
    
    // Otherwise, show the table detail modal for opening tables
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

  const handleTableStatusChange = async (tableId: string, status: TableStatus) => {
    try {
      // With the new status design, this function may not be needed
      // Tables either have no session or have an active session
      // Status changes happen through specific actions (payment, cancellation)
      console.log('Status change requested:', { tableId, status });
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

  // Handlers for occupied table details panel
  const handleOccupiedTableAddOrder = () => {
    if (selectedOccupiedTable?.currentSession && onTableSelect) {
      onTableSelect(selectedOccupiedTable.currentSession);
      setShowOccupiedDetailsPanel(false);
      setSelectedOccupiedTable(null);
    }
  };

  const handleOccupiedTablePayment = () => {
    if (selectedOccupiedTable) {
      setShowOccupiedDetailsPanel(false);
      handlePayment(selectedOccupiedTable);
      setSelectedOccupiedTable(null);
    }
  };

  const handleOccupiedTableCancel = () => {
    if (selectedOccupiedTable) {
      setShowOccupiedDetailsPanel(false);
      setShowOccupiedCancelModal(true);
    }
  };

  const handleOccupiedCancelConfirm = async (staffPin: string, reason: string) => {
    if (!selectedOccupiedTable) return;
    
    try {
      await closeTable(selectedOccupiedTable.id, {
        reason,
        staffPin,
        forceClose: true
      });
      
      setShowOccupiedCancelModal(false);
      setSelectedOccupiedTable(null);
    } catch (error) {
      console.error('Error cancelling occupied table:', error);
      throw error; // Re-throw to let the modal handle error display
    }
  };

  const handleOccupiedTableClose = () => {
    setShowOccupiedDetailsPanel(false);
    setSelectedOccupiedTable(null);
  };

  // Handler for print bill functionality with actual thermal printing
  const handleOccupiedTablePrintBill = async () => {
    if (!selectedOccupiedTable?.currentSession?.id) {
      console.error('No table session ID available for bill printing');
      return;
    }

    const tableSessionId = selectedOccupiedTable.currentSession.id;
    console.log('🖨️ Print bill clicked:', {
      tableSessionId,
      isBluetoothSupported,
      userAgent: navigator.userAgent,
      isMobile: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    });

    try {
      // Check if we should use Bluetooth (Android/mobile) or USB printing
      if (isBluetoothSupported && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
        console.log('🖨️ Using Bluetooth printing for bill');
        await handleBluetoothPrintBill(tableSessionId);
      } else {
        console.log('🖨️ Using USB printing for bill');
        await handleUSBPrintBill(tableSessionId);
      }
      
    } catch (error) {
      console.error('❌ Print bill error:', error);
      alert(`❌ Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle Bluetooth bill printing
  const handleBluetoothPrintBill = async (tableSessionId: string) => {
    try {
      console.log('📄 Using unified print service for bill printing via Bluetooth');
      
      // Use unified print service with Bluetooth preference
      const result = await unifiedPrintService.print(PrintType.BILL, tableSessionId, { method: 'bluetooth' });
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        throw new Error(result.error || result.message);
      }
      
    } catch (error) {
      console.error('❌ Bluetooth bill printing failed:', error);
      throw error;
    }
  };

  // Handle USB bill printing
  const handleUSBPrintBill = async (tableSessionId: string) => {
    try {
      console.log('📄 Using unified print service for bill printing');
      
      // Use unified print service with smart selection
      const result = await unifiedPrintService.print(PrintType.BILL, tableSessionId, { method: 'usb' });
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        throw new Error(result.error || result.message);
      }
      
    } catch (error) {
      console.error('❌ USB bill printing failed:', error);
      throw error;
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

  // Create order object for PaymentModal
  const createOrderFromSession = (table: Table) => {
    const session = table.currentSession;
    if (!session) return null;

    return {
      id: session.id,
      tableSessionId: session.id,
      orderNumber: `TABLE-${table.displayName}`,
      customerId: session.customer?.id || session.booking?.customerId,
      customerName: session.customer?.name || session.booking?.name,
      staffPin: '', // Will be provided during payment
      subtotal: session.totalAmount * (100/107), // Calculate subtotal from VAT-inclusive total
      vatAmount: session.totalAmount * (7/107), // 7% VAT
      totalAmount: session.totalAmount,
      discountAmount: 0,
      status: 'completed' as const,
      items: [],
      createdAt: new Date(session.sessionStart || new Date()),
      updatedAt: new Date()
    };
  };

  return (
    <div className="h-full flex flex-col">
      {/* Stats and Actions Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left: Status and Stats */}
          <div className="flex items-center space-x-4 text-sm text-slate-600">
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
          
          {/* Right: Refresh Button */}
          <button
            onClick={refreshTables}
            disabled={isLoading}
            className="flex items-center justify-center w-8 h-8 text-slate-700 bg-white rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
            title="Refresh Tables"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
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
                <div className="grid grid-cols-2 tablet:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
                          isSelected={selectedOccupiedTable?.id === table.id}
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
                            isSelected={selectedOccupiedTable?.id === table.id}
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

      {/* Occupied Table Details Panel */}
      <OccupiedTableDetailsPanel
        table={selectedOccupiedTable}
        isOpen={showOccupiedDetailsPanel}
        onClose={handleOccupiedTableClose}
        onAddOrder={handleOccupiedTableAddOrder}
        onPayment={handleOccupiedTablePayment}
        onCancel={handleOccupiedTableCancel}
        onPrintBill={handleOccupiedTablePrintBill}
        onRefreshTable={refreshTables}
      />

      {/* Occupied Table Cancel Modal */}
      {selectedOccupiedTable && (
        <CancelTableModal
          isOpen={showOccupiedCancelModal}
          table={selectedOccupiedTable}
          onClose={() => setShowOccupiedCancelModal(false)}
          onConfirm={handleOccupiedCancelConfirm}
        />
      )}

      {/* Payment Interface */}
      {showPaymentInterface && selectedPaymentTable && selectedPaymentTable.currentSession && (
        <div className="fixed inset-0 z-50 bg-white">
          <PaymentInterface
            order={createOrderFromSession(selectedPaymentTable)!}
            tableSessionId={selectedPaymentTable.currentSession.id}
            tableNumber={selectedPaymentTable.displayName}
            customerName={selectedPaymentTable.currentSession.customer?.name || selectedPaymentTable.currentSession.booking?.name}
            totalAmount={selectedPaymentTable.currentSession.totalAmount}
            onBack={handlePaymentBack}
            onPaymentComplete={handlePaymentComplete}
          />
        </div>
      )}

    </div>
  );
}