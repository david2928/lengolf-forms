'use client';

import React, { useState } from 'react';
import { TableManagementDashboard } from '@/components/pos/table-management/TableManagementDashboard';
import { POSInterface } from '@/components/pos/POSInterface';
import { StaffLoginModal } from '@/components/pos/StaffLoginModal';
import { StaffAuthProvider, useStaffAuth } from '@/hooks/use-staff-auth';
import { TableSession } from '@/types/pos';
import { POSHeader, POSView } from '@/components/pos/POSHeader';
import { ReprintReceiptModal } from '@/components/pos/ReprintReceiptModal';
import { POSTransactionList } from '@/components/pos/transactions/POSTransactionList';
import { CustomerManagementInterface } from '@/components/pos/customer-management/CustomerManagementInterface';
import { DailyClosingModal } from '@/components/pos/closing/DailyClosingModal';

// Inner component that uses the staff auth context
function POSContent() {
  const [activeTableSession, setActiveTableSession] = useState<TableSession | null>(null);
  const [currentView, setCurrentView] = useState<POSView>('tables');
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [transactionRefresh, setTransactionRefresh] = useState<(() => void) | null>(null);
  const [isTransactionRefreshing, setIsTransactionRefreshing] = useState(false);
  const { isAuthenticated, isLoading, login } = useStaffAuth();
  
  // Handle table selection from table management
  const handleTableSelect = (tableSession: TableSession) => {
    setActiveTableSession(tableSession);
    setCurrentView('pos');
  };
  
  // Handle view changes
  const handleViewChange = (view: POSView) => {
    setCurrentView(view);
    if (view === 'tables') {
      setActiveTableSession(null);
    }
  };
  
  // Handle back navigation
  const handleBack = () => {
    if (currentView === 'pos' && activeTableSession) {
      setCurrentView('tables');
      setActiveTableSession(null);
    } else if (currentView === 'transactions' || currentView === 'customers') {
      setCurrentView('tables');
    }
  };

  const handleTransactionRefreshRegister = (refreshFn: () => void, isLoading: boolean) => {
    setTransactionRefresh(() => refreshFn);
    setIsTransactionRefreshing(isLoading);
  };

  const handleRefresh = () => {
    if (transactionRefresh) {
      transactionRefresh();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-gray-50 overflow-hidden flex flex-col">
      {/* Main POS Content - only show when authenticated */}
      {isAuthenticated ? (
        <>
          <div className="h-full flex flex-col">
            {/* POS Header - Always visible when authenticated */}
            <POSHeader
              tableSession={activeTableSession || undefined}
              onBack={handleBack}
              currentView={currentView}
              onViewChange={handleViewChange}
              onReprintReceipt={() => setShowReprintModal(true)}
              onRefresh={handleRefresh}
              isRefreshing={isTransactionRefreshing}
              onCloseDay={() => setShowClosingModal(true)}
            />
            
            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden">
              {currentView === 'tables' && (
                /* Table Management Dashboard */
                <TableManagementDashboard
                  onTableSelect={handleTableSelect}
                />
              )}
              
              {currentView === 'pos' && activeTableSession && (
                /* POS Interface - Product Catalog + Order Management */
                <POSInterface
                  tableSession={activeTableSession}
                  onBack={handleBack}
                />
              )}
              
              {currentView === 'transactions' && (
                /* Transaction List for Staff */
                <POSTransactionList 
                  onRegisterRefresh={handleTransactionRefreshRegister}
                />
              )}
              
              {currentView === 'customers' && (
                /* Customer Management Interface */
                <CustomerManagementInterface />
              )}
            </div>
          </div>
            
          {/* Reprint Receipt Modal */}
          <ReprintReceiptModal
            isOpen={showReprintModal}
            onClose={() => setShowReprintModal(false)}
          />

          {/* Daily Closing Modal */}
          <DailyClosingModal
            isOpen={showClosingModal}
            onClose={() => setShowClosingModal(false)}
            onComplete={(reconciliationId) => {
              console.log('Closing complete:', reconciliationId);
              setShowClosingModal(false);
            }}
          />
        </>
      ) : (
        /* Staff Login Modal */
        <StaffLoginModal
          isOpen={!isAuthenticated}
          onLogin={login}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default function POSPage() {
  return (
    <StaffAuthProvider>
      <POSContent />
    </StaffAuthProvider>
  );
}