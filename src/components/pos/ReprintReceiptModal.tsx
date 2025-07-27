'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Search, AlertCircle } from 'lucide-react';

interface ReprintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReprintReceiptModal: React.FC<ReprintReceiptModalProps> = ({
  isOpen,
  onClose
}) => {
  const [searchType, setSearchType] = useState<'receipt' | 'transaction'>('receipt');
  const [searchValue, setSearchValue] = useState('');
  const [format, setFormat] = useState<'html' | 'thermal80'>('html');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReprint = async () => {
    if (!searchValue.trim()) {
      setError('Please enter a receipt number or transaction ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requestBody = {
        [searchType === 'receipt' ? 'receiptNumber' : 'transactionId']: searchValue.trim(),
        format,
        language: 'en',
        width: '80mm'
      };

      console.log('🔄 Reprinting with:', requestBody);

      const response = await fetch('/api/pos/reprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reprint receipt');
      }

      if (format === 'html') {
        // Open HTML in new window and auto-print
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank', 'width=800,height=600');
        
        if (printWindow) {
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
              window.URL.revokeObjectURL(url);
            }, 1000);
          };
        } else {
          throw new Error('Failed to open print window - popup blocker may be active');
        }
      } else {
        // Download thermal file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reprint-${searchValue}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        alert('Receipt file downloaded! Open it to print to your thermal printer.');
      }

      // Close modal on success
      onClose();

    } catch (error) {
      console.error('❌ Reprint error:', error);
      setError(error instanceof Error ? error.message : 'Failed to reprint receipt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchValue('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Reprint Receipt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Type */}
          <div>
            <Label htmlFor="searchType">Search by</Label>
            <Select value={searchType} onValueChange={(value: 'receipt' | 'transaction') => setSearchType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receipt">Receipt Number</SelectItem>
                <SelectItem value="transaction">Transaction ID</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Input */}
          <div>
            <Label htmlFor="searchValue">
              {searchType === 'receipt' ? 'Receipt Number' : 'Transaction ID'}
            </Label>
            <Input
              id="searchValue"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={searchType === 'receipt' ? 'e.g. R20250126-001' : 'e.g. 131f10ea-b7a3-470b-a712-b6e845b4b339'}
              className="font-mono"
            />
          </div>

          {/* Format Selection */}
          <div>
            <Label htmlFor="format">Print Format</Label>
            <Select value={format} onValueChange={(value: 'html' | 'thermal80') => setFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="html">HTML (Auto-Print)</SelectItem>
                <SelectItem value="thermal80">80mm Thermal (Download)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleReprint}
              disabled={isLoading || !searchValue.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Printing...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-2" />
                  Reprint Receipt
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};