'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { X, FileText, Printer, ArrowLeft, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { bluetoothThermalPrinter, BluetoothThermalPrinter } from '@/services/BluetoothThermalPrinter';
import { useResponsive } from '@/hooks/use-responsive';

interface TaxInvoiceData {
  customerName: string;
  customerAddress: string;
  customerTaxId: string;
  isCompany: boolean;
}

interface TaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptNumber: string;
}

export const TaxInvoiceModal: React.FC<TaxInvoiceModalProps> = ({
  isOpen,
  onClose,
  receiptNumber
}) => {
  const { isMobile, isTablet } = useResponsive();
  const [transactionData, setTransactionData] = useState<any>(null);
  const [taxInvoiceData, setTaxInvoiceData] = useState<TaxInvoiceData>({
    customerName: '',
    customerAddress: '',
    customerTaxId: '',
    isCompany: false
  });
  const [loading, setLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isBluetoothSupported, setIsBluetoothSupported] = useState<boolean>(false);
  const [bluetoothConnected, setBluetoothConnected] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [existingTaxInvoice, setExistingTaxInvoice] = useState<any>(null);

  // Define fetchTransactionData function first
  const fetchTransactionData = useCallback(async () => {
    try {
      const response = await fetch(`/api/pos/transactions/${receiptNumber}`);
      
      if (response.ok) {
        const data = await response.json();
        setTransactionData(data.transaction);
        
        // Check if tax invoice data already exists
        const transaction = data.transaction;
        
        if (transaction.tax_invoice_issued && transaction.customer_tax_info) {
          setExistingTaxInvoice(transaction);
          
          // Pre-fill with existing tax invoice data
          const newTaxInvoiceData = {
            customerName: transaction.customer_tax_info.name || '',
            customerAddress: transaction.customer_tax_info.address || '',
            customerTaxId: transaction.customer_tax_info.taxId || '',
            isCompany: transaction.customer_tax_info.isCompany || false
          };
          setTaxInvoiceData(newTaxInvoiceData);
        } else {
          // Pre-fill customer name if available (new tax invoice)
          const customerName = transaction.customer?.customer_name || transaction.customer_name || '';
          setTaxInvoiceData(prev => ({
            ...prev,
            customerName: customerName !== 'Walk-in' ? customerName : ''
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch transaction data:', error);
    }
  }, [receiptNumber]);

  // Reset and fetch data when modal opens
  useEffect(() => {
    if (isOpen && receiptNumber) {
      // Reset all states first
      setExistingTaxInvoice(null);
      setTransactionData(null);
      setShowSuccess(false);
      setTaxInvoiceData({
        customerName: '',
        customerAddress: '',
        customerTaxId: '',
        isCompany: false
      });
      
      // Then fetch fresh data
      fetchTransactionData();
    }
  }, [isOpen, receiptNumber, fetchTransactionData]);


  // Check for Bluetooth support on component mount
  useEffect(() => {
    const checkBluetoothSupport = () => {
      const supported = BluetoothThermalPrinter.isSupported();
      setIsBluetoothSupported(supported);
    };
    
    checkBluetoothSupport();
  }, []);

  // Save tax invoice data to database
  const handleSaveTaxInvoice = async () => {
    if (!taxInvoiceData.customerName.trim() || !taxInvoiceData.customerTaxId.trim()) {
      alert('Please fill in customer name and tax ID');
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/pos/transactions/${receiptNumber}/tax-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taxInvoiceData)
      });

      if (response.ok) {
        const result = await response.json();
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save tax invoice');
      }
    } catch (error) {
      alert(`Failed to save tax invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Show success animation
  const showSuccessAnimation = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  // Handle Save & Preview button
  const handleSaveAndPreview = async () => {
    const saved = await handleSaveTaxInvoice();
    if (saved) {
      showSuccessAnimation('Tax invoice information saved successfully!');
      setExistingTaxInvoice({ tax_invoice_issued: true }); // Mark as existing
      // Preview is already visible, just show success message
    }
  };

  // Handle Print button - save first then print
  const handleGenerateTaxInvoice = async () => {
    const saved = await handleSaveTaxInvoice();
    if (saved) {
      // Print tax invoice
      await printTaxInvoice();
    }
  };

  // Print tax invoice with unified printing service
  const printTaxInvoice = async () => {
    if (!receiptNumber) return;
    
    try {
      setIsPrinting(true);
      
      // Check if we should use Bluetooth (Android/mobile) or Windows printing
      if (isBluetoothSupported && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
        await handleBluetoothPrintTaxInvoice();
      } else {
        await handleWindowsPrintTaxInvoice();
      }
      
      // Close modal on successful print
      onClose();
      
    } catch (error) {
      alert(`❌ Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleBluetoothPrintTaxInvoice = async () => {
    try {
      // First generate tax invoice data using unified print API
      const response = await fetch('/api/pos/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'TAX_INV_RECEIPT',
          id: receiptNumber,
          options: {
            method: 'bluetooth',
            format: 'thermal'
          }
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get tax invoice data');
      }
      
      // Connect to Bluetooth printer if not already connected
      if (!bluetoothConnected) {
        const connected = await bluetoothThermalPrinter.connect();
        if (!connected) {
          throw new Error('Failed to connect to Bluetooth printer');
        }
        setBluetoothConnected(true);
      }
      
      // Print the tax invoice using the data from unified API
      await bluetoothThermalPrinter.printReceipt(result.data);
      
      alert(`✅ Tax invoice printed successfully via Bluetooth!`);
      
    } catch (error) {
      // Reset connection status on error
      setBluetoothConnected(false);
      
      if (error instanceof Error && error.message.includes('User cancelled')) {
        alert('❌ Bluetooth connection cancelled by user');
      } else {
        alert(`❌ Bluetooth tax invoice print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      throw error;
    }
  };

  const handleWindowsPrintTaxInvoice = async () => {
    try {
      const response = await fetch('/api/pos/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'TAX_INV_RECEIPT',
          id: receiptNumber,
          options: {
            method: 'auto',
            format: 'thermal'
          }
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Tax invoice printed successfully!`);
      } else {
        alert(`❌ Print failed: ${result.message || result.error}`);
      }
    } catch (error) {
      throw error;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Generate thermal receipt preview like test-thermal page
  const generateThermalPreview = () => {
    const width = 48; // 80mm thermal printer width
    
    const lines: string[] = [];
    
    // Company name (larger effect)
    lines.push(centerText('L E N G O L F   C O .   L T D .', width));
    lines.push('');
    
    // Business info
    lines.push(centerText('540 Mercury Tower, 4th Floor, Unit 407', width));
    lines.push(centerText('Ploenchit Road, Lumpini, Pathumwan', width));
    lines.push(centerText('Bangkok 10330', width));
    lines.push(centerText('TAX ID: 0105566207013', width));
    lines.push('');
    
    // Receipt type - split into two lines
    lines.push(centerText('Receipt / TAX Invoice', width));
    lines.push(centerText('(Original)', width));
    lines.push('------------------------------------------------');
    
    // Receipt details - left aligned
    lines.push(`Receipt No: ${receiptNumber}`);
    
    if (transactionData?.staff_name) {
      lines.push(`Staff: ${transactionData.staff_name}`);
    }
    
    // Guest count
    const guestCount = transactionData?.pax_count || 1;
    lines.push(`Guests: ${guestCount}`);
    
    // Date on left, time on right (same line) - use transaction date
    const transactionDate = transactionData?.transaction_date ? new Date(transactionData.transaction_date) : new Date();
    const dateStr = transactionDate.toLocaleDateString('en-GB', { year: '2-digit', month: '2-digit', day: '2-digit' });
    const timeStr = transactionDate.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const dateText = `Date: ${dateStr}`;
    const timeText = `Time: ${timeStr}`;
    const totalLength = dateText.length + timeText.length;
    const spacing = ' '.repeat(Math.max(1, width - totalLength));
    lines.push(`${dateText}${spacing}${timeText}`);
    
    lines.push('------------------------------------------------');
    
    // Items - consistent 48-character width
    if (transactionData?.items) {
      transactionData.items.forEach((item: any) => {
        const qty = item.item_cnt || 1;
        const finalTotal = item.line_total || 0;
        const discountAmount = item.item_discount_amount || 0;
        const originalTotal = finalTotal + discountAmount; // Calculate correct original price
        const qtyStr = qty.toString();
        const priceStr = originalTotal.toFixed(2);
        const nameMaxLength = width - qtyStr.length - priceStr.length - 4;
        const itemName = item.product_name.length > nameMaxLength ? 
          item.product_name.substring(0, nameMaxLength - 3) + '...' : item.product_name;
        
        const spaces = ' '.repeat(Math.max(1, width - qtyStr.length - 4 - itemName.length - priceStr.length));
        lines.push(`${qtyStr}    ${itemName}${spaces}${priceStr}`);
        
        // Show item discount if applicable
        if (item.has_item_discount && item.item_discount_amount > 0) {
          // Use actual discount name from applied_discount or fallback to generic name
          const discountName = item.applied_discount?.title || 'Item Discount';
          const discountLabel = `     ${discountName}`;
          const discountAmountStr = `-${item.item_discount_amount.toFixed(2)}`;
          const discountSpacing = ' '.repeat(Math.max(1, width - discountLabel.length - discountAmountStr.length));
          lines.push(`${discountLabel}${discountSpacing}${discountAmountStr}`);
        }
      });
    }
    
    lines.push('------------------------------------------------');
    
    // Items count
    const itemCount = transactionData?.items ? 
      transactionData.items.reduce((sum: number, item: any) => sum + (item.item_cnt || 1), 0) : 0;
    lines.push(`Items: ${itemCount}`);
    lines.push('');
    
    // Totals section - labels aligned to left, amounts to right
    const leftAlign = 20;
    
    if (transactionData) {
      // Original subtotal (before discount) - use original_items_total if available
      const originalSubtotal = (transactionData.original_items_total || transactionData.subtotal_amount || 0);
      const originalSubtotalStr = originalSubtotal.toFixed(2);
      lines.push(`${' '.repeat(leftAlign)}Subtotal:${' '.repeat(width - leftAlign - 9 - originalSubtotalStr.length)}${originalSubtotalStr}`);
      
      // Receipt discount (if applicable)
      if (transactionData.receipt_level_discounts && transactionData.receipt_level_discounts > 0 && transactionData.discount_name) {
        const discount = {
          type: transactionData.discount_type,
          value: transactionData.discount_value,
          title: transactionData.discount_name
        };
        const discountAmount = transactionData.receipt_level_discounts;
        
        let discountLabel = '';
        let discountAmountStr = '';
        if (discount.type === 'percentage') {
          // Calculate the correct discount amount based on order items total
          const correctDiscountAmount = transactionData.original_items_total ? 
            (transactionData.original_items_total * discount.value / 100) : discountAmount;
          discountLabel = `Discount (${discount.value}%):`;
          discountAmountStr = `-${correctDiscountAmount.toFixed(2)}`;
        } else {
          discountLabel = 'Discount:';
          discountAmountStr = `-${discountAmount.toFixed(2)}`;
        }
        
        const discountSpacing = ' '.repeat(Math.max(1, width - leftAlign - discountLabel.length - discountAmountStr.length));
        lines.push(`${' '.repeat(leftAlign)}${discountLabel}${discountSpacing}${discountAmountStr}`);
      }
      
      // VAT (calculated from final amount)
      const vatAmount = (transactionData.vat_amount || 0).toFixed(2);
      lines.push(`${' '.repeat(leftAlign)}VAT(7%) incl.:${' '.repeat(width - leftAlign - 14 - vatAmount.length)}${vatAmount}`);
      
      // Double line under VAT (before Total)
      lines.push(`${' '.repeat(leftAlign)}============================`);
      
      // Total
      const totalAmount = (transactionData.total_amount || 0).toFixed(2);
      lines.push(`${' '.repeat(leftAlign)}Total:${' '.repeat(width - leftAlign - 6 - totalAmount.length)}${totalAmount}`);
    }
    
    lines.push('');
    lines.push('------------------------------------------------');
    
    // Payment method
    const paymentMethod = transactionData?.payment_method || 'Cash';
    const paymentAmount = transactionData?.total_amount || 0;
    const methodText = paymentMethod;
    const amountText = (paymentAmount || 0).toFixed(2);
    const paymentSpacing = ' '.repeat(Math.max(1, width - methodText.length - amountText.length));
    lines.push(`${methodText}${paymentSpacing}${amountText}`);
    
    lines.push('------------------------------------------------');
    lines.push('');
    
    // Customer Information Section for Tax Invoice
    if (taxInvoiceData.customerName) {
      lines.push('Customer Information:');
      lines.push(`Name: ${taxInvoiceData.customerName}`);
      if (taxInvoiceData.customerAddress) {
        // Split long addresses into multiple lines
        const addressLines = taxInvoiceData.customerAddress.match(/.{1,46}/g) || [taxInvoiceData.customerAddress];
        addressLines.forEach((line, index) => {
          lines.push(index === 0 ? `Address: ${line}` : `         ${line}`);
        });
      }
      if (taxInvoiceData.customerTaxId) {
        lines.push(`Tax ID: ${taxInvoiceData.customerTaxId}`);
      }
      lines.push('');
    }
    
    // Signature section
    lines.push('');
    lines.push(centerText('________________________', width));
    lines.push(centerText('Signature Cashier', width));
    lines.push('');
    
    // ABB reference with lines around it
    lines.push('------------------------------------------------');
    lines.push(`Issued to replace the TAX invoice (ABB)`);
    lines.push(`number: ${receiptNumber}`);
    lines.push('------------------------------------------------');
    lines.push('');
    
    // Footer - moved to the very end
    lines.push(centerText('You\'re tee-rific. Come back soon!', width));
    lines.push('');
    lines.push(centerText('LENGOLF', width));
    lines.push(centerText('@lengolf | www.len.golf', width));
    lines.push(centerText('Tel: 096-668-2335', width));
    
    return lines.join('\n');
  };

  // Helper function to center text
  const centerText = (text: string, width: number): string => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`focus:outline-none flex flex-col ${
        isMobile || isTablet
          ? "max-w-full max-h-full h-screen w-screen m-0 p-0 rounded-none"
          : "max-w-5xl max-h-[95vh] h-[95vh] w-[90vw] m-auto p-0 rounded-lg"
      } [&>button]:hidden`}>
        {/* Consistent Header Styling */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">Generate Tax Invoice</h2>
            </div>
            {existingTaxInvoice?.tax_invoice_issued && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-lg border border-green-200">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Previously Saved</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Customer Information Form */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">
                    Customer Name / Company Name *
                  </Label>
                  <Input
                    id="customerName"
                    value={taxInvoiceData.customerName}
                    onChange={(e) => setTaxInvoiceData(prev => ({
                      ...prev,
                      customerName: e.target.value
                    }))}
                    placeholder="Enter customer or company name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerTaxId">Tax ID *</Label>
                  <Input
                    id="customerTaxId"
                    value={taxInvoiceData.customerTaxId}
                    onChange={(e) => setTaxInvoiceData(prev => ({
                      ...prev,
                      customerTaxId: e.target.value
                    }))}
                    placeholder="0123456789012"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="customerAddress">Address *</Label>
                  <Textarea
                    id="customerAddress"
                    value={taxInvoiceData.customerAddress}
                    onChange={(e) => setTaxInvoiceData(prev => ({
                      ...prev,
                      customerAddress: e.target.value
                    }))}
                    placeholder="Enter customer address"
                    rows={3}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Invoice Preview */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Invoice Preview</h3>
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                {/* Professional Receipt Preview */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm text-gray-900 whitespace-pre-wrap overflow-auto max-h-96" style={{fontFamily: 'Courier New, monospace'}}>
                  {generateThermalPreview()}
                </div>
                <div className="border-t border-gray-200 pt-3 mt-4">
                  <p className="text-xs text-gray-500 text-center">
                    80mm thermal printer output preview (48 characters wide)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Fixed Action Buttons */}
        <div className="bg-background border-t px-6 py-4 flex-shrink-0">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveAndPreview}
              disabled={loading || isPrinting || !taxInvoiceData.customerName.trim() || !taxInvoiceData.customerTaxId.trim()}
              variant="outline"
              className="flex-1 h-12 font-semibold"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save & Preview
                </>
              )}
            </Button>
            <Button
              onClick={handleGenerateTaxInvoice}
              disabled={loading || isPrinting || !taxInvoiceData.customerName.trim() || !taxInvoiceData.customerTaxId.trim()}
              className="flex-1 h-12 font-semibold"
            >
              {isPrinting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {isBluetoothSupported && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'Connecting...' : 'Printing...'}
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  {isBluetoothSupported && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'Print via Bluetooth' : 'Print Tax Invoice'}
                  {bluetoothConnected && <span className="ml-2 text-xs">• Connected</span>}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
      
      {/* Success Animation - Floating Notification */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-sm">
            <CheckCircle className="h-6 w-6 flex-shrink-0" />
            <div>
              <div className="font-semibold">{successMessage}</div>
              <div className="text-sm opacity-90">Tax invoice data has been stored</div>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
};