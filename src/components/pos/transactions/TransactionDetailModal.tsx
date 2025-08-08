'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useResponsive } from '@/hooks/use-responsive';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Receipt, Printer, FileText, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { formatThaiDateTime, formatCurrency } from '@/lib/pos-utils';
import { VoidPinModal } from './VoidPinModal';
import { TaxInvoiceModal } from './TaxInvoiceModal';
import { bluetoothThermalPrinter, BluetoothThermalPrinter } from '@/services/BluetoothThermalPrinter';
import { unifiedPrintService, PrintType } from '@/services/UnifiedPrintService';
import { TouchFriendlyDiscountTooltip } from '../discount/TouchFriendlyDiscountTooltip';

interface TransactionDetail {
  receipt_number: string;
  transaction_date: string;
  total_amount: number;
  subtotal_amount: number;
  vat_amount: number;
  discount_amount: number;
  discount_name?: string;
  discount_type?: string;
  discount_value?: number;
  original_items_total: number;
  items_after_item_discounts_total: number;
  total_item_level_discounts: number;
  receipt_level_discounts: number;
  status: string;
  customer_name: string;
  staff_name: string;
  payment_method: string;
  table_number?: string;
  bay: string;
  items: Array<{
    product_name: string;
    category: string;
    parent_category: string;
    item_cnt: number;
    unit_price: number;
    line_total: number;
    item_notes?: string;
    vat_amount: number;
    line_number: number;
    has_item_discount?: boolean;
    item_discount_amount?: number;
    applied_discount_id?: string;
  }>;
}

interface TransactionDetailModalProps {
  receiptNumber: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTransactionUpdated?: () => void;
}

export function TransactionDetailModal({ 
  receiptNumber, 
  isOpen, 
  onClose,
  onTransactionUpdated
}: TransactionDetailModalProps) {
  const { isMobile, isTablet } = useResponsive();
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVoidPinModal, setShowVoidPinModal] = useState(false);
  const [isVoided, setIsVoided] = useState(false);
  const [voidSuccess, setVoidSuccess] = useState(false);
  const [isBluetoothSupported, setIsBluetoothSupported] = useState<boolean>(false);
  const [bluetoothConnected, setBluetoothConnected] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showTaxInvoiceModal, setShowTaxInvoiceModal] = useState(false);

  const fetchTransactionDetails = useCallback(async (receiptNumber: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/pos/transactions/${receiptNumber}`);
      
      if (response.ok) {
        const data = await response.json();
        setTransactionDetails(data.transaction);
        // Check if transaction is already voided
        setIsVoided(data.transaction.status === 'voided');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load transaction details');
      }
    } catch (error) {
      console.error('Failed to fetch transaction details:', error);
      setError('Failed to load transaction details');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleVoidTransactionClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setShowVoidPinModal(true);
  };

  const handleVoidPinSuccess = useCallback(async (pin: string) => {
    if (!transactionDetails) return;
    
    
    try {
      setShowVoidPinModal(false);
      
      const response = await fetch(`/api/pos/transactions/${transactionDetails.receipt_number}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Voided from POS Transaction Management',
          staffPin: pin
        })
      });
      
      
      if (response.ok) {
        const data = await response.json();
        setIsVoided(true);
        setVoidSuccess(true);
        
        // Update transaction details to reflect voided status
        if (transactionDetails) {
          setTransactionDetails({
            ...transactionDetails,
            status: 'voided'
          });
        }
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setVoidSuccess(false);
        }, 3000);
        
        // Refresh transaction list
        if (onTransactionUpdated) {
          onTransactionUpdated();
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to void transaction: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to void transaction:', error);
      alert('Failed to void transaction');
    }
  }, [transactionDetails, onClose]);

  const handleVoidPinCancel = () => {
    setShowVoidPinModal(false);
    // The parent dialog will reopen automatically when showVoidPinModal becomes false
  };

  const handlePrintReceipt = useCallback(async (receiptNumber: string) => {
    if (!receiptNumber) return;
    
    
    try {
      setIsPrinting(true);
      
      // Check if we should use Bluetooth (Android/mobile) or Windows printing
      if (isBluetoothSupported && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
        await handleBluetoothPrint(receiptNumber);
      } else {
        await handleUnifiedPrint(receiptNumber);
      }
      
    } catch (error) {
      console.error('Print error:', error);
      alert(`❌ Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPrinting(false);
    }
  }, [isBluetoothSupported, bluetoothConnected]);

  const handleBluetoothPrint = async (receiptNumber: string) => {
    try {
      // First get receipt data from API
      const response = await fetch('/api/pos/print-bluetooth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptNumber: receiptNumber
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get receipt data');
      }
      
      // Connect to Bluetooth printer if not already connected
      if (!bluetoothConnected) {
        const connected = await bluetoothThermalPrinter.connect();
        if (!connected) {
          throw new Error('Failed to connect to Bluetooth printer');
        }
        setBluetoothConnected(true);
      }
      
      // Print the receipt
      await bluetoothThermalPrinter.printReceipt(result.receiptData);
      
      alert(`✅ Receipt printed successfully via Bluetooth!`);
      
    } catch (error) {
      console.error('Bluetooth print error:', error);
      
      // Reset connection status on error
      setBluetoothConnected(false);
      
      if (error instanceof Error && error.message.includes('User cancelled')) {
        alert('❌ Bluetooth connection cancelled by user');
      } else {
        alert(`❌ Bluetooth print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      throw error;
    }
  };

  const handleUnifiedPrint = async (receiptNumber: string) => {
    try {
      console.log('🖨️ Using unified print service for transaction receipt');
      
      // Use unified print service for smart printer selection
      const result = await unifiedPrintService.print(PrintType.TAX_INV_ABB, receiptNumber);
      
      if (result.success) {
        alert(`✅ ${result.message}`);
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (error) {
      console.error('Unified print error:', error);
      alert(`❌ Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const handleTaxInvoice = useCallback(async (receiptNumber: string) => {
    setShowTaxInvoiceModal(true);
  }, []);


  useEffect(() => {
    if (receiptNumber && isOpen) {
      fetchTransactionDetails(receiptNumber);
    }
  }, [receiptNumber, isOpen, fetchTransactionDetails]);

  // Check for Bluetooth support on component mount
  useEffect(() => {
    const checkBluetoothSupport = () => {
      const supported = BluetoothThermalPrinter.isSupported();
      setIsBluetoothSupported(supported);
    };
    
    checkBluetoothSupport();
  }, []);


  if (!receiptNumber) return null;

  return (
    <>
    <Dialog open={isOpen && !showVoidPinModal && !showTaxInvoiceModal} onOpenChange={onClose}>
      <DialogContent 
        className={`focus:outline-none flex flex-col ${
          isMobile || isTablet
            ? "max-w-full max-h-full h-screen w-screen m-0 p-0 rounded-none"
            : "max-w-lg max-h-[80vh] h-auto w-auto m-auto p-0 rounded-lg"
        } [&>button]:hidden`}
      >
        {/* Accessibility Components - visually hidden */}
        <DialogTitle className="sr-only">
          Transaction Details - {receiptNumber}
        </DialogTitle>
        <DialogDescription className="sr-only">
          View transaction details including items, total amount, payment information, and available actions like printing receipt or voiding transaction.
        </DialogDescription>
        
        {/* Mobile Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-5 sm:hidden relative">
          <div className="flex items-center justify-between">
            {/* Receipt Info */}
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">
                {receiptNumber}
              </h2>
              {transactionDetails && (
                <div className="text-sm text-gray-600">
                  {transactionDetails.customer_name || 'Walk-in Customer'}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-700 bg-white/80 hover:bg-white rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Desktop Header */}
        <div className="hidden sm:block">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-5">
            <div className="flex items-center justify-between">
              {/* Receipt Info */}
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-gray-900">
                  {receiptNumber}
                </h2>
                {transactionDetails && (
                  <div className="text-sm text-gray-600">
                    {transactionDetails.customer_name || 'Walk-in Customer'}
                    {isVoided && (
                      <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs font-semibold rounded">
                        VOIDED
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center text-gray-700 bg-white/80 hover:bg-white rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 sm:px-4 sm:space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-500">Loading...</span>
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          
          {transactionDetails && (
            <>
              {/* Order Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>
                
                {transactionDetails.items && transactionDetails.items.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {transactionDetails.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.product_name}</div>
                          <div className="text-sm text-gray-600">
                            {item.item_cnt} × {formatCurrency(item.unit_price)}
                            {item.has_item_discount && item.item_discount_amount && (
                              <TouchFriendlyDiscountTooltip 
                                orderItem={{
                                  id: `${index}`,
                                  productId: '',
                                  productName: item.product_name,
                                  quantity: item.item_cnt,
                                  unitPrice: item.unit_price,
                                  totalPrice: item.line_total,
                                  modifiers: [],
                                  categoryId: '',
                                  categoryName: '',
                                  applied_discount_id: item.applied_discount_id,
                                  discount_amount: item.item_discount_amount
                                }}
                              >
                                <span className="ml-2 text-green-600 font-medium cursor-pointer touch-manipulation">• Discount Applied</span>
                              </TouchFriendlyDiscountTooltip>
                            )}
                          </div>
                          {item.item_notes && (
                            <div className="text-xs text-gray-400 mt-1">
                              {item.item_notes}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {item.has_item_discount && item.item_discount_amount ? (
                            <div>
                              <div className="text-xs text-gray-500 line-through">
                                {formatCurrency(item.line_total + item.item_discount_amount)}
                              </div>
                              <div className="font-semibold text-green-700">
                                {formatCurrency(item.line_total)}
                              </div>
                              <div className="text-xs text-green-600">
                                -{formatCurrency(item.item_discount_amount)}
                              </div>
                            </div>
                          ) : (
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(item.line_total)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200 mb-6">
                    <Receipt className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <div className="text-sm">No items found for this transaction</div>
                    <div className="text-xs mt-1">Transaction details may not be available</div>
                  </div>
                )}
              </div>

              {/* Summary - Match occupied table modal format exactly */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(transactionDetails.original_items_total || transactionDetails.subtotal_amount)}</span>
                </div>
                {transactionDetails.receipt_level_discounts > 0 && transactionDetails.discount_name && (
                  <div className="flex justify-between text-sm text-green-700 font-medium">
                    <span>Discount {transactionDetails.discount_type === 'percentage' ? `(${transactionDetails.discount_value}%)` : ''}:</span>
                    <span>-{formatCurrency(transactionDetails.receipt_level_discounts)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>VAT (7%) incl.:</span>
                  <span>{formatCurrency(transactionDetails.vat_amount)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-green-800 border-t border-gray-200 pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(transactionDetails.total_amount)}</span>
                </div>
              </div>

              {/* Transaction Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date & Time:</span>
                  <span className="text-gray-900">{formatThaiDateTime(transactionDetails.transaction_date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Staff:</span>
                  <span className="text-gray-900">{transactionDetails.staff_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Bay:</span>
                  <span className="text-gray-900">{transactionDetails.bay}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Fixed Bottom Action Bar */}
        {transactionDetails && (
          <div className="bg-background border-t px-6 py-4 space-y-3 flex-shrink-0">
            {isVoided ? (
              // Voided Status Display
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-lg font-semibold text-red-600">Transaction Voided</span>
                </div>
                <div className="text-sm text-red-600 text-center mt-2">
                  This transaction has been voided and cannot be modified
                </div>
              </div>
            ) : (
              // Active Transaction Actions
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 h-12 font-semibold text-xs sm:text-sm"
                  onClick={() => handlePrintReceipt(transactionDetails.receipt_number)}
                  disabled={isPrinting}
                >
                  {isPrinting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">
                        {isBluetoothSupported && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'Connecting...' : 'Printing...'}
                      </span>
                      <span className="sm:hidden">Print...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">
                        {isBluetoothSupported && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'Print via Bluetooth' : 'Print Receipt'}
                        {bluetoothConnected && <span className="ml-2 text-xs text-green-600">• Connected</span>}
                      </span>
                      <span className="sm:hidden">Print</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 h-12 font-semibold text-xs sm:text-sm"
                  onClick={() => handleTaxInvoice(transactionDetails.receipt_number)}
                >
                  <FileText className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Tax Invoice</span>
                  <span className="sm:hidden">Invoice</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 h-12 font-semibold text-xs sm:text-sm text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                  onClick={handleVoidTransactionClick}
                  type="button"
                >
                  <Trash2 className="h-4 w-4 mr-1 sm:mr-2" />
                  Void
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    
    {/* Void PIN Modal - Rendered outside Dialog to avoid focus trap */}
    {typeof window !== 'undefined' && showVoidPinModal && transactionDetails && createPortal(
      <div 
        key="void-pin-modal-wrapper"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <VoidPinModal
          isOpen={showVoidPinModal}
          onSuccess={handleVoidPinSuccess}
          onCancel={handleVoidPinCancel}
          receiptNumber={transactionDetails.receipt_number}
        />
      </div>,
      document.body
    )}
    
    {/* Success Notification - Floating */}
    {typeof window !== 'undefined' && voidSuccess && createPortal(
      <div 
        className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300"
        style={{ zIndex: 100000 }}
      >
        <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
          <CheckCircle className="h-6 w-6" />
          <div>
            <div className="font-semibold">Transaction Voided Successfully</div>
            <div className="text-sm opacity-90">Receipt {transactionDetails?.receipt_number} has been voided</div>
          </div>
        </div>
      </div>,
      document.body
    )}
    
    {/* Tax Invoice Modal */}
    {showTaxInvoiceModal && (
      <TaxInvoiceModal
        isOpen={showTaxInvoiceModal}
        onClose={() => setShowTaxInvoiceModal(false)}
        receiptNumber={receiptNumber}
      />
    )}
  </>
  );
};