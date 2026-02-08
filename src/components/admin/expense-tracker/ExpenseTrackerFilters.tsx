'use client';

import { useCallback } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ExpenseTrackerFilters as FilterState } from '@/types/expense-tracker';

interface ExpenseTrackerFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  accounts: { account_number: string; account_name: string }[];
}

export function ExpenseTrackerFilters({ filters, onChange, accounts }: ExpenseTrackerFiltersProps) {
  const handleMonthPrev = useCallback(() => {
    const [y, m] = filters.month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    onChange({ ...filters, month: newMonth });
  }, [filters, onChange]);

  const handleMonthNext = useCallback(() => {
    const [y, m] = filters.month.split('-').map(Number);
    const d = new Date(y, m, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    onChange({ ...filters, month: newMonth });
  }, [filters, onChange]);

  const handleMonthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filters, month: e.target.value });
    },
    [filters, onChange]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Month Navigation */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleMonthPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <input
          type="month"
          value={filters.month}
          onChange={handleMonthChange}
          className="h-8 px-2 text-sm border rounded-md bg-background"
        />
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleMonthNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Account Filter */}
      {accounts.length > 1 && (
        <Select
          value={filters.account}
          onValueChange={(value) => onChange({ ...filters, account: value })}
        >
          <SelectTrigger className="h-8 w-[200px] text-xs">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((acc) => (
              <SelectItem key={acc.account_number} value={acc.account_number}>
                {acc.account_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Transaction Type Filter */}
      <Select
        value={filters.transactionType}
        onValueChange={(value) => onChange({ ...filters, transactionType: value as FilterState['transactionType'] })}
      >
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="unset">No type set</SelectItem>
          <SelectItem value="credit_card">Card</SelectItem>
          <SelectItem value="ewallet">eWallet</SelectItem>
          <SelectItem value="qr_payment">QR / Transfer</SelectItem>
          <SelectItem value="cash_deposit">Cash Deposit</SelectItem>
          <SelectItem value="salary">Salary</SelectItem>
          <SelectItem value="sso">SSO</SelectItem>
          <SelectItem value="tax_payment">Tax Payment</SelectItem>
          <SelectItem value="internal_transfer">Internal Transfer</SelectItem>
          <SelectItem value="sale">Sale</SelectItem>
        </SelectContent>
      </Select>

      {/* VAT Type Filter */}
      <Select
        value={filters.vatType}
        onValueChange={(value) => onChange({ ...filters, vatType: value as FilterState['vatType'] })}
      >
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="All VAT" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All VAT</SelectItem>
          <SelectItem value="none">No VAT</SelectItem>
          <SelectItem value="pp30">PP30</SelectItem>
          <SelectItem value="pp36">PP36</SelectItem>
        </SelectContent>
      </Select>

      {/* WHT Type Filter */}
      <Select
        value={filters.whtType}
        onValueChange={(value) => onChange({ ...filters, whtType: value as FilterState['whtType'] })}
      >
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="All WHT" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All WHT</SelectItem>
          <SelectItem value="none">No WHT</SelectItem>
          <SelectItem value="pnd3">PND3</SelectItem>
          <SelectItem value="pnd53">PND53</SelectItem>
        </SelectContent>
      </Select>

      {/* Unannotated filter */}
      <div className="flex items-center gap-2 ml-auto">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Switch
          id="unannotated"
          checked={filters.showOnlyUnannotated}
          onCheckedChange={(checked) =>
            onChange({ ...filters, showOnlyUnannotated: checked })
          }
        />
        <Label htmlFor="unannotated" className="text-xs cursor-pointer">
          Unannotated only
        </Label>
      </div>
    </div>
  );
}
