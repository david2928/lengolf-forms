import React from 'react';
import { AdminDiscountList } from '@/components/admin/discounts/AdminDiscountList';

export default function DiscountsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Discount Management</h1>
        <a 
          href="/admin/discounts/create"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create Discount
        </a>
      </div>
      <AdminDiscountList />
    </div>
  );
}