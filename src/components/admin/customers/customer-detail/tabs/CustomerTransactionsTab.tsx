/**
 * Customer Transactions Tab
 * Displays transaction history with mobile/desktop responsive views
 * TODO: Full implementation in next phase
 */

import React from 'react';
import { ResponsiveDataView } from '../shared/ResponsiveDataView';
import { CustomerTabError } from '../shared/CustomerDetailError';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatCurrency } from '../utils/customerFormatters';
import type { TransactionRecord } from '../utils/customerTypes';

interface CustomerTransactionsTabProps {
  customerId: string;
  data: TransactionRecord[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/**
 * Transaction card for mobile view
 */
const TransactionCard: React.FC<{ transaction: TransactionRecord }> = ({ transaction }) => (
  <Card>
    <CardContent className="p-4">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium">Receipt #{transaction.receipt_number}</p>
            <p className="text-sm text-muted-foreground">{formatDate(transaction.date)}</p>
          </div>
          <p className="font-semibold text-green-600">
            {formatCurrency(transaction.sales_net)}
          </p>
        </div>
        
        {transaction.items && (
          <p className="text-sm text-muted-foreground">
            {transaction.items}
          </p>
        )}
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Items: {transaction.item_count || 0}</span>
          {transaction.payment_method && (
            <Badge variant="outline" className="text-xs">
              {transaction.payment_method}
            </Badge>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * Transactions table for desktop view
 */
const TransactionsTable: React.FC<{ transactions: TransactionRecord[] }> = ({ transactions }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Date</TableHead>
        <TableHead>Receipt #</TableHead>
        <TableHead>Items</TableHead>
        <TableHead>Amount</TableHead>
        <TableHead>Payment Method</TableHead>
        <TableHead>Staff</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {transactions.map((transaction) => (
        <TableRow key={transaction.id}>
          <TableCell>{formatDate(transaction.date)}</TableCell>
          <TableCell className="font-mono text-sm">{transaction.receipt_number}</TableCell>
          <TableCell>
            <div>
              {transaction.items && (
                <p className="text-sm">{transaction.items}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {transaction.item_count || 0} items
              </p>
            </div>
          </TableCell>
          <TableCell className="font-semibold text-green-600">
            {formatCurrency(transaction.sales_net)}
          </TableCell>
          <TableCell>
            {transaction.payment_method && (
              <Badge variant="outline">{transaction.payment_method}</Badge>
            )}
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {transaction.staff || 'N/A'}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

/**
 * Customer Transactions Tab Component
 */
export const CustomerTransactionsTab: React.FC<CustomerTransactionsTabProps> = ({
  customerId,
  data,
  loading,
  error,
  onRefresh
}) => {
  if (error) {
    return (
      <CustomerTabError 
        error={error} 
        onRetry={onRefresh}
        tabName="transactions"
      />
    );
  }

  return (
    <ResponsiveDataView
      data={data}
      loading={loading}
      renderCard={(transaction) => <TransactionCard transaction={transaction} />}
      renderTable={() => <TransactionsTable transactions={data} />}
      emptyState="No transactions found for this customer"
      onRefresh={onRefresh}
      onRetry={onRefresh}
    />
  );
};