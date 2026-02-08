import React from 'react';
import { AdminDiscountForm } from '@/components/admin/discounts/AdminDiscountForm';

export default async function EditDiscountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <a href="/admin/discounts" className="text-blue-600 hover:text-blue-800 text-sm">
          &larr; Back to Discounts
        </a>
        <h1 className="text-xl sm:text-2xl font-bold mt-2">Edit Discount</h1>
      </div>
      <AdminDiscountForm discountId={id} />
    </div>
  );
}