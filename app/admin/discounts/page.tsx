import React from 'react';
import { AdminDiscountList } from '@/components/admin/discounts/AdminDiscountList';

export default function DiscountsPage() {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Discount Management</h1>
        <a
          href="/admin/discounts/create"
          className="bg-blue-600 text-white px-4 py-2.5 rounded hover:bg-blue-700 text-center text-sm sm:text-base"
        >
          Create Discount
        </a>
      </div>
      <AdminDiscountList />
    </div>
  );
}