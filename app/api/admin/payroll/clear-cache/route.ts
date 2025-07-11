import { NextRequest, NextResponse } from 'next/server';
import { invalidatePayrollCache } from '@/lib/payroll-performance';

export async function POST(request: NextRequest) {
  try {
    const { month } = await request.json();
    
    if (month) {
      // Clear cache for specific month
      invalidatePayrollCache.forMonth(month);
      console.log(`Cleared payroll cache for month: ${month}`);
      
      return NextResponse.json({ 
        success: true, 
        message: `Cache cleared for month: ${month}` 
      });
    } else {
      // Clear all payroll cache
      invalidatePayrollCache.all();
      console.log('Cleared all payroll cache');
      
      return NextResponse.json({ 
        success: true, 
        message: 'All payroll cache cleared' 
      });
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to clear cache' 
    }, { status: 500 });
  }
} 