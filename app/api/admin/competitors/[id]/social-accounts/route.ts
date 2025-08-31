import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { getRefacSupabaseClient } from '@/lib/refac-supabase';

// PUT /api/admin/competitors/[id]/social-accounts - Update social accounts
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const competitorId = parseInt(id);
    if (isNaN(competitorId)) {
      return NextResponse.json({ error: 'Invalid competitor ID' }, { status: 400 });
    }

    const body = await request.json();
    const { social_accounts } = body;

    if (!Array.isArray(social_accounts)) {
      return NextResponse.json({ error: 'social_accounts must be an array' }, { status: 400 });
    }

    const supabase = getRefacSupabaseClient();

    // Start transaction-like operations
    // 1. Get existing social accounts
    const { data: existingAccounts, error: fetchError } = await supabase
      .schema('marketing')
      .from('competitor_social_accounts')
      .select('*')
      .eq('competitor_id', competitorId);

    if (fetchError) {
      console.error('Error fetching existing accounts:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch existing accounts' }, { status: 500 });
    }

    // 2. Determine which accounts to insert, update, or delete
    const existingAccountIds = existingAccounts?.map((acc: any) => acc.id) || [];
    const submittedAccountIds = social_accounts.filter(acc => acc.id).map(acc => acc.id);
    
    // Accounts to delete (existed before but not in submission)
    const accountsToDelete = existingAccountIds.filter((id: any) => !submittedAccountIds.includes(id));
    
    // Accounts to insert (no ID)
    const accountsToInsert = social_accounts.filter(acc => !acc.id).map(acc => ({
      competitor_id: competitorId,
      platform: acc.platform,
      account_handle: acc.account_handle,
      account_url: acc.account_url
    }));
    
    // Accounts to update (has ID)
    const accountsToUpdate = social_accounts.filter(acc => acc.id);

    // 3. Execute operations
    
    // Delete removed accounts
    if (accountsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .schema('marketing')
        .from('competitor_social_accounts')
        .delete()
        .in('id', accountsToDelete);

      if (deleteError) {
        console.error('Error deleting accounts:', deleteError);
        return NextResponse.json({ error: 'Failed to delete accounts' }, { status: 500 });
      }
    }

    // Insert new accounts
    if (accountsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .schema('marketing')
        .from('competitor_social_accounts')
        .insert(accountsToInsert);

      if (insertError) {
        console.error('Error inserting accounts:', insertError);
        return NextResponse.json({ error: 'Failed to insert accounts' }, { status: 500 });
      }
    }

    // Update existing accounts
    for (const account of accountsToUpdate) {
      const { error: updateError } = await supabase
        .schema('marketing')
        .from('competitor_social_accounts')
        .update({
          platform: account.platform,
          account_handle: account.account_handle,
          account_url: account.account_url
        })
        .eq('id', account.id);

      if (updateError) {
        console.error('Error updating account:', updateError);
        return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      message: 'Social accounts updated successfully',
      deleted: accountsToDelete.length,
      inserted: accountsToInsert.length,
      updated: accountsToUpdate.length
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/competitors/[id]/social-accounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}