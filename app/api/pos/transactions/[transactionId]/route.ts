import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { transactionService } from '@/services/TransactionService';

export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { transactionId } = params;
    
    const transaction = await transactionService.getTransaction(transactionId);
    
    if (!transaction) {
      return NextResponse.json({ 
        error: 'Transaction not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      transaction 
    });

  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { transactionId } = params;
    const { action, reason, staffPin } = await request.json();

    if (action === 'void') {
      if (!reason || !staffPin) {
        return NextResponse.json({
          error: 'Reason and staff PIN are required for voiding'
        }, { status: 400 });
      }

      const success = await transactionService.voidTransaction(transactionId, reason, staffPin);
      
      return NextResponse.json({
        success,
        message: 'Transaction voided successfully'
      });
    }

    return NextResponse.json({
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}