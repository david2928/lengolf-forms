"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Eye, User, CreditCard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TransactionSummary } from "@/types/transactions";

// Helper function to format date and time (treat DB timestamp as already BKK time)
const formatThaiDateTime = (dateTimeString: string) => {
  if (!dateTimeString) return 'Invalid Date';
  
  try {
    // The database timestamp is already in BKK timezone but marked as UTC
    // Remove the timezone info and parse as local time
    const cleanDateTime = dateTimeString.replace(/(\+00:00|Z)$/, '');
    const date = new Date(cleanDateTime);
    
    // Format as DD/MM/YYYY HH:MM:SS
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

export function createTransactionColumns(
  onTransactionClick: (receiptNumber: string) => void
): ColumnDef<TransactionSummary>[] {
  return [
    {
      accessorKey: "sales_timestamp",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-gray-700 hover:text-gray-900 text-xs"
        >
          Date & Time
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const formattedDateTime = formatThaiDateTime(row.getValue("sales_timestamp"));
        return (
          <div className="min-w-[100px] cursor-pointer" onClick={() => onTransactionClick(row.original.receipt_number)}>
            <div className="text-sm text-gray-900">{formattedDateTime}</div>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "receipt_number",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-gray-700 hover:text-gray-900 text-xs"
        >
          Receipt No.
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div 
          className="font-mono text-xs text-gray-900 cursor-pointer hover:text-blue-600" 
          onClick={() => onTransactionClick(row.original.receipt_number)}
        >
          {row.getValue("receipt_number")}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "customer_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-gray-700 hover:text-gray-900 text-xs"
        >
          Customer
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div 
          className="text-sm text-gray-900 cursor-pointer"
          onClick={() => onTransactionClick(row.original.receipt_number)}
        >
          {row.getValue("customer_name") || "Walk-in"}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "staff_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-gray-700 hover:text-gray-900 text-xs"
        >
          Staff
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const staffName = row.getValue("staff_name") as string;
        
        // Different indicators for different staff members
        const getStaffIndicator = (name: string) => {
          if (!name) return null;
          
          // Create consistent color/indicator based on staff name
          const staffColors: { [key: string]: string } = {
            'dolly': 'bg-pink-400',
            'net': 'bg-blue-400', 
            'may': 'bg-green-400',
            'winnie': 'bg-purple-400',
            'bank': 'bg-yellow-400',
            'chris': 'bg-red-400',
            'david': 'bg-indigo-400'
          };
          
          const key = name.toLowerCase();
          const colorClass = staffColors[key] || 'bg-gray-400';
          
          return <div className={`w-2 h-2 rounded-full ${colorClass} mr-2`} />;
        };
        
        return (
          <div 
            className="flex items-center text-sm text-gray-900 cursor-pointer"
            onClick={() => onTransactionClick(row.original.receipt_number)}
          >
            {staffName ? (
              <>
                {getStaffIndicator(staffName)}
                <span>{staffName}</span>
              </>
            ) : (
              <span className="text-gray-400">N/A</span>
            )}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "payment_method",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-gray-700 hover:text-gray-900 text-xs"
        >
          Payment Method
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const paymentMethod = row.getValue("payment_method") as string;
        const getPaymentIcon = () => {
          if (!paymentMethod) return null;
          
          // Different icon colors based on payment method
          if (paymentMethod.toLowerCase().includes('cash')) {
            return <div className="w-2 h-2 rounded-full bg-green-400 mr-2" />;
          } else if (paymentMethod.toLowerCase().includes('card') || paymentMethod.toLowerCase().includes('visa') || paymentMethod.toLowerCase().includes('mastercard')) {
            return <CreditCard className="h-3 w-3 text-blue-400 mr-1.5" />;
          } else if (paymentMethod.toLowerCase().includes('promptpay')) {
            return <div className="w-2 h-2 rounded-full bg-purple-400 mr-2" />;
          } else {
            return <div className="w-2 h-2 rounded-full bg-gray-400 mr-2" />;
          }
        };
        
        return (
          <div 
            className="flex items-center text-sm text-gray-700 cursor-pointer"
            onClick={() => onTransactionClick(row.original.receipt_number)}
          >
            {paymentMethod ? (
              <>
                {getPaymentIcon()}
                <span>{paymentMethod}</span>
              </>
            ) : (
              <span className="text-gray-400">N/A</span>
            )}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "item_count",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-gray-700 hover:text-gray-900 text-xs"
        >
          Items
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div 
          className="text-center text-sm text-gray-900 cursor-pointer"
          onClick={() => onTransactionClick(row.original.receipt_number)}
        >
          {row.getValue("item_count")}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "sim_usage_count",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-gray-700 hover:text-gray-900 text-xs"
        >
          SIM Usage
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div 
          className="text-center text-sm text-gray-900 cursor-pointer"
          onClick={() => onTransactionClick(row.original.receipt_number)}
        >
          {row.getValue("sim_usage_count")}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium text-gray-700 hover:text-gray-900 text-xs"
        >
          Total Amount
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("total_amount"));
        return (
          <div 
            className="text-right text-sm font-medium text-gray-900 cursor-pointer"
            onClick={() => onTransactionClick(row.original.receipt_number)}
          >
            ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const transaction = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-6 w-6 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem
                onClick={() => onTransactionClick(transaction.receipt_number)}
                className="text-xs"
              >
                <Eye className="mr-2 h-3 w-3" />
                View Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
} 