'use client';

import { useState, useCallback, useEffect } from 'react';
import { Building2, Copy, Check, Save } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Vendor } from '@/types/expense-tracker';

interface VendorDetailPopoverProps {
  vendor: Vendor;
  onUpdate: (vendor: Vendor) => void;
}

export function VendorDetailPopover({ vendor, onUpdate }: VendorDetailPopoverProps) {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState(vendor.company_name || '');
  const [address, setAddress] = useState(vendor.address || '');
  const [taxId, setTaxId] = useState(vendor.tax_id || '');
  const [isCompany, setIsCompany] = useState(vendor.is_company);
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Sync state when vendor prop changes (e.g. after invoice extraction updates vendor)
  useEffect(() => {
    setCompanyName(vendor.company_name || '');
    setAddress(vendor.address || '');
    setTaxId(vendor.tax_id || '');
    setIsCompany(vendor.is_company);
  }, [vendor.company_name, vendor.address, vendor.tax_id, vendor.is_company]);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch { /* ignore */ }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/expense-tracker/vendors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: vendor.id,
          company_name: companyName || null,
          address: address || null,
          tax_id: taxId || null,
          is_company: isCompany,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.vendor);
      }
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }, [vendor.id, companyName, address, taxId, isCompany, onUpdate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          title="Vendor details"
        >
          <Building2 className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px]" align="start">
        <div className="space-y-3">
          <div className="font-medium text-sm">{vendor.name}</div>

          <div className="space-y-1.5">
            <Label className="text-xs">Legal / Company Name</Label>
            <div className="flex gap-1">
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Official company name..."
                className="text-xs h-8"
              />
              {companyName && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(companyName, 'companyName')}
                  className="shrink-0 h-8 w-8 flex items-center justify-center rounded hover:bg-muted"
                  title="Copy company name"
                >
                  {copiedField === 'companyName' ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Address</Label>
            <div className="flex gap-1">
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Vendor address..."
                className="text-xs min-h-[60px] resize-none"
                rows={3}
              />
              {address && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(address, 'address')}
                  className="shrink-0 h-8 w-8 flex items-center justify-center rounded hover:bg-muted"
                  title="Copy address"
                >
                  {copiedField === 'address' ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tax ID</Label>
            <div className="flex gap-1">
              <Input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="Tax ID..."
                className="text-xs h-8"
              />
              {taxId && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(taxId, 'taxId')}
                  className="shrink-0 h-8 w-8 flex items-center justify-center rounded hover:bg-muted"
                  title="Copy Tax ID"
                >
                  {copiedField === 'taxId' ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isCompany"
              checked={isCompany}
              onChange={(e) => setIsCompany(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isCompany" className="text-xs cursor-pointer">
              Company (PND 53 instead of PND 3)
            </Label>
          </div>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="w-full h-8 text-xs"
          >
            <Save className="mr-1 h-3 w-3" />
            {saving ? 'Saving...' : 'Save Vendor Details'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
