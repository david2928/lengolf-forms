'use client';

import React, { useState } from 'react';
import { TableManagementDashboard } from '@/components/pos/table-management/TableManagementDashboard';
import { POSInterface } from '@/components/pos/POSInterface';
import { StaffLoginModal } from '@/components/pos/staff/StaffLoginModal';
import { POSStaffProvider, usePOSStaffAuth } from '@/hooks/use-pos-staff-auth';
import { TableSession } from '@/types/pos';

// Inner component that uses the staff auth context
function POSContent() {
  const [activeTableSession, setActiveTableSession] = useState<TableSession | null>(null);
  const { isAuthenticated } = usePOSStaffAuth();
  
  // Handle table selection from table management
  const handleTableSelect = (tableSession: TableSession) => {
    setActiveTableSession(tableSession);
  };
  
  // Handle back to table management
  const handleBackToTables = () => {
    setActiveTableSession(null);
  };

  const handleLoginSuccess = () => {
    // Login successful, component will re-render with isAuthenticated = true
  };
  
  return (
    <div className="fixed inset-0 bg-gray-50 overflow-hidden">
      {/* Main POS Content - only show when authenticated */}
      {isAuthenticated ? (
        <>
          {activeTableSession ? (
            /* POS Interface - Product Catalog + Order Management */
            <POSInterface
              tableSession={activeTableSession}
              onBack={handleBackToTables}
            />
          ) : (
            /* Table Management Dashboard */
            <TableManagementDashboard
              onTableSelect={handleTableSelect}
            />
          )}
        </>
      ) : (
        /* Staff Login Modal */
        <StaffLoginModal
          isOpen={true}
          onLoginSuccess={handleLoginSuccess}
          title="POS Staff Login"
          description="Please enter your staff PIN to access the Point of Sale system"
        />
      )}
    </div>
  );
}

export default function POSPage() {
  return (
    <POSStaffProvider>
      <POSContent />
    </POSStaffProvider>
  );
}