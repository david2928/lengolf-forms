/**
 * Customer Transactions API
 * Fetches transaction history for a specific customer
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customerId = id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get customer phone number first
    const { data: customer } = await refacSupabaseAdmin
      .from('customers')
      .select('contact_number')
      .eq('id', customerId)
      .single();

    if (!customer?.contact_number) {
      return NextResponse.json({
        transactions: [],
        pagination: { total: 0, limit, offset, hasMore: false },
        summary: { totalTransactions: 0, totalSpent: 0, averageTransaction: 0 }
      });
    }

    // Aggregate transactions by receipt_number
    const { data: rawTransactions, error } = await refacSupabaseAdmin
      .schema('pos')
      .from('lengolf_sales')
      .select(`
        receipt_number,
        date,
        payment_method,
        staff_name,
        sales_net,
        product_name,
        item_cnt,
        created_at
      `)
      .or(`customer_id.eq.${customerId},customer_phone_number.eq.${customer.contact_number}`)
      .eq('is_voided', false)
      .order('date', { ascending: false })
      .order('sales_timestamp', { ascending: false });

    if (error) throw error;

    // Group by receipt_number and aggregate
    const receiptMap = new Map();
    
    (rawTransactions || []).forEach((item: any) => {
      const receiptKey = item.receipt_number;
      
      if (!receiptMap.has(receiptKey)) {
        receiptMap.set(receiptKey, {
          receipt_number: item.receipt_number,
          date: item.date,
          payment_method: item.payment_method,
          staff_name: item.staff_name,
          total_amount: 0,
          items: [],
          item_count: 0
        });
      }
      
      const receipt = receiptMap.get(receiptKey);
      receipt.total_amount += item.sales_net || 0;
      receipt.items.push({
        name: item.product_name,
        quantity: item.item_cnt || 1,
        amount: item.sales_net || 0
      });
      receipt.item_count += item.item_cnt || 1;
    });

    // Convert to array and sort
    const aggregatedTransactions = Array.from(receiptMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply pagination
    const total = aggregatedTransactions.length;
    const transactions = aggregatedTransactions.slice(offset, offset + limit);
    const count = total;

    // Format transactions for frontend
    const formattedTransactions = transactions.map((transaction: any) => ({
      id: transaction.receipt_number, // Use receipt_number as ID since it's unique per transaction
      date: transaction.date,
      receipt_number: transaction.receipt_number,
      sales_net: transaction.total_amount,
      items: `${transaction.item_count} items`,
      item_count: transaction.item_count,
      payment_method: transaction.payment_method || '-',
      staff: transaction.staff_name || '-'
    }));

    // Calculate summary statistics from aggregated data
    const totalSpent = aggregatedTransactions.reduce((sum: any, t: any) => sum + t.total_amount, 0);
    const averageTransaction = aggregatedTransactions.length ? totalSpent / aggregatedTransactions.length : 0;

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        total: total,
        limit,
        offset,
        hasMore: total > offset + limit
      },
      summary: {
        totalTransactions: total,
        totalSpent: Math.round(totalSpent * 100) / 100,
        averageTransaction: Math.round(averageTransaction * 100) / 100
      }
    });

  } catch (error: any) {
    console.error('Error fetching customer transactions:', error);
    return NextResponse.json(
      { error: "Failed to fetch transactions", details: error.message },
      { status: 500 }
    );
  }
}