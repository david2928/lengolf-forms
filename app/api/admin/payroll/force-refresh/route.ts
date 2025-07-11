import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Clear all Node.js require cache for payroll modules
    const payrollModules = Object.keys(require.cache).filter(key => 
      key.includes('payroll') || key.includes('lib')
    );
    
    payrollModules.forEach(key => {
      delete require.cache[key];
    });
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    console.log('🔄 Forced refresh of payroll modules');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Payroll modules refreshed',
      cleared_modules: payrollModules.length
    });
    
  } catch (error) {
    console.error('Error forcing refresh:', error);
    return NextResponse.json(
      { error: 'Failed to force refresh' },
      { status: 500 }
    );
  }
} 