'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Receipt, 
  Printer, 
  FileText, 
  Trash2, 
  User, 
  Calendar, 
  CreditCard,
  X,
  AlertTriangle
} from 'lucide-react';
import { TaxInvoiceModal } from './TaxInvoiceModal';
import { useStaffAuth } from '@/hooks/use-staff-auth';

interface TransactionDetailItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  item_notes?: string;
  item_discount?: number;
  sales_discount?: number;
}

interface TransactionDetailData {
  receipt_number: string;
  sales_timestamp: string;
  customer_name: string;
  staff_name: string;
  payment_method: string;
  total_amount: number;
  vat_amount: number;
  net_amount: number;
  items: TransactionDetailItem[];
  status: string;
  table_number?: string;
  pax_count?: number;
}

interface POSTransactionDetailProps {
  receiptNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

export const POSTransactionDetail: React.FC<POSTransactionDetailProps> = ({
  receiptNumber,
  isOpen,
  onClose
}) => {
  const { staff } = useStaffAuth();
  const [transaction, setTransaction] = useState<TransactionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTaxInvoiceModal, setShowTaxInvoiceModal] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch transaction details
  useEffect(() => {
    if (!receiptNumber || !isOpen) return;

    const fetchTransactionDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/pos/transactions/${receiptNumber}`);
        if (response.ok) {
          const data = await response.json();
          setTransaction(data.transaction);
        }
      } catch (error) {
        console.error('Failed to fetch transaction details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetails();
  }, [receiptNumber, isOpen]);

  // Format date/time for display
  const formatDateTime = (timestamp: string) => {
    if (!timestamp) return 'Invalid Date';
    try {
      const cleanDateTime = timestamp.replace(/(\+00:00|Z)$/, '');
      const date = new Date(cleanDateTime);
      return format(date, 'MMMM d, yyyy \'at\' HH:mm');
    } catch {
      return 'Invalid Date';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Handle print receipt
  const handlePrintReceipt = async () => {
    setActionLoading('print');
    try {
      const response = await fetch('/api/pos/print-win32', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptNumber })
      });
      
      if (response.ok) {
        // Show success message
        alert('Receipt sent to printer!');
      } else {
        throw new Error('Print failed');
      }
    } catch (error) {
      console.error('Print failed:', error);
      alert('Failed to print receipt. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle void transaction
  const handleVoidTransaction = async () => {
    if (!staff) return;
    
    setActionLoading('void');
    try {
      const response = await fetch(`/api/pos/transactions/${receiptNumber}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Voided by staff',
          staffPin: '000000' // TODO: Implement proper PIN entry for void operations
        })
      });
      
      if (response.ok) {
        alert('Transaction voided successfully');
        onClose();
      } else {
        throw new Error('Void failed');
      }
    } catch (error) {
      console.error('Void failed:', error);
      alert('Failed to void transaction. Please try again.');
    } finally {
      setActionLoading(null);
      setShowVoidConfirm(false);
    }
  };

  // Calculate discount percentage
  const calculateDiscount = (item: TransactionDetailItem) => {
    const salesDiscount = item.sales_discount || 0;
    if (salesDiscount > 0) {
      const originalPrice = item.line_total + salesDiscount;
      const discountPercentage = (salesDiscount / originalPrice * 100);
      return `-${Math.round(discountPercentage)}% discount`;
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">Loading transaction details...</p>
            </div>
          ) : !transaction ? (
            <div className="py-8 text-center">
              <p className="text-red-500">Failed to load transaction details</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Receipt Number</p>
                      <p className="font-mono font-semibold">{transaction.receipt_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date & Time</p>
                      <p className="font-medium">{formatDateTime(transaction.sales_timestamp)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Customer</p>
                      <p className="font-medium">{transaction.customer_name || 'Walk-in'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Staff</p>
                      <p className="font-medium">{transaction.staff_name}</p>
                    </div>
                    {transaction.table_number && (
                      <div>
                        <p className="text-sm text-gray-500">Table</p>
                        <p className="font-medium">{transaction.table_number}</p>
                      </div>
                    )}
                    {transaction.pax_count && transaction.pax_count > 0 && (
                      <div>
                        <p className="text-sm text-gray-500">Guests</p>
                        <p className="font-medium">{transaction.pax_count}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Items */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {transaction.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-start py-2 border-b last:border-b-0">
                        <div className="flex-1">
                          <p className="font-medium">{item.quantity} x {item.item_name}</p>
                          {item.item_notes && item.item_notes !== '-' && (
                            <p className="text-sm text-gray-500 mt-1">{item.item_notes}</p>
                          )}
                          {calculateDiscount(item) && (
                            <p className="text-sm text-gray-500 mt-1">{calculateDiscount(item)}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.line_total)}</p>
                          <p className="text-sm text-gray-500">{formatCurrency(item.unit_price)} each</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Summary */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Payment Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(transaction.net_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT (7%)</span>
                      <span>{formatCurrency(transaction.vat_amount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>{formatCurrency(transaction.total_amount)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Paid via {transaction.payment_method}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrintReceipt}
                  disabled={actionLoading === 'print'}
                  className="flex-1"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {actionLoading === 'print' ? 'Printing...' : 'Print Receipt'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowTaxInvoiceModal(true)}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Tax Invoice
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowVoidConfirm(true)}
                  disabled={actionLoading === 'void' || transaction.status === 'voided'}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {actionLoading === 'void' ? 'Voiding...' : 'VOID'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tax Invoice Modal */}
      {transaction && (
        <TaxInvoiceModal
          isOpen={showTaxInvoiceModal}
          onClose={() => setShowTaxInvoiceModal(false)}
          receiptNumber={transaction.receipt_number}
        />
      )}

      {/* Void Confirmation */}
      {showVoidConfirm && (
        <Dialog open={showVoidConfirm} onOpenChange={setShowVoidConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Confirm Void Transaction
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Are you sure you want to void transaction <strong>{receiptNumber}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowVoidConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleVoidTransaction}
                disabled={actionLoading === 'void'}
              >
                {actionLoading === 'void' ? 'Voiding...' : 'Confirm Void'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};