import React from 'react';
import { AdminDiscountForm } from '@/components/admin/discounts/AdminDiscountForm';

export default function EditDiscountPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Discount</h1>
        <a href="/admin/discounts" className="text-blue-600 hover:text-blue-800">
          ← Back to Discounts
        </a>
      </div>
      <AdminDiscountForm discountId={params.id} />
    </div>
  );
}