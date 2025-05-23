import { NextResponse } from 'next/server';
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // No longer using user-context client
// import { cookies } from 'next/headers'; // No longer using cookies
// import { refacSupabase } from '@/lib/refac-supabase'; // Switching from this client
import { supabase } from '@/lib/supabase'; // Using this client now

interface AvailablePackage {
  id: string;
  customer_name: string;
  package_type_name: string;
  first_use_date: string;
  expiration_date: string;
  remaining_hours: number | null;
  package_type_id: number;
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Note: `supabase` is now directly imported from '@/lib/supabase' and used throughout this function.
  console.log('Attempting to record package usage (using client from @/lib/supabase) and upload signature...');
  try {
    const body = await request.json();
    const { packageId, employeeName, usedHours, usedDate, customerSignature } = body;

    if (!packageId || !employeeName || !usedHours || !usedDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // === TEMPORARILY COMMENTED OUT FOR TESTING (get_available_packages validation) ===
    /* // Remove this line to uncomment
    // Get all available packages
    const { data: allPackagesUntyped, error: rpcError } = await supabase
      .rpc('get_available_packages'); // Call RPC with no arguments

    if (rpcError) {
      console.error('Error calling get_available_packages RPC (using @/lib/supabase):', rpcError);
      return NextResponse.json(
        { error: 'Failed to retrieve available packages: ' + rpcError.message },
        { status: 500 }
      );
    }

    if (!allPackagesUntyped) { 
        console.error('get_available_packages RPC returned null or undefined (using @/lib/supabase).');
        return NextResponse.json(
            { error: 'Failed to retrieve package list: RPC returned no data.' },
            { status: 500 } 
        );
    }
    
    const allPackages = allPackagesUntyped as AvailablePackage[];
    const packageData = allPackages.find((p: AvailablePackage) => p.id === packageId);

    if (!packageData) {
      console.warn(`Package with ID ${packageId} not found in results from get_available_packages (using @/lib/supabase).`);
      return NextResponse.json(
        { error: `Package not found with ID: ${packageId}` },
        { status: 404 }
      );
    }
    
    // const pkg = packageData as AvailablePackage; // packageData is already the correct type and contains all necessary fields

    // For non-unlimited packages, check if there are enough hours remaining
    // Directly use packageData here as it's the specific package we're interested in.
    if (packageData.remaining_hours !== null) {
      if (usedHours > packageData.remaining_hours) {
        return NextResponse.json(
          { error: 'Not enough hours remaining in package' },
          { status: 400 }
        );
      }
    }
    */ // Remove this line to uncomment
    // === END OF TEMPORARILY COMMENTED OUT SECTION ===

    // const package_type_id_placeholder = 1; // This is no longer needed

    let customer_signature_path: string | null = null;

    // === DIAGNOSTIC STEP: Try to list buckets and get specific bucket details ===
    try {
      console.log("DIAGNOSTIC: Attempting to list all buckets (using @/lib/supabase client)...");
      const { data: allBuckets, error: listBucketsError } = await supabase.storage.listBuckets();
      if (listBucketsError) {
        console.error("DIAGNOSTIC: Error calling listBuckets() (using @/lib/supabase client):", listBucketsError);
      } else {
        console.log("DIAGNOSTIC: Successfully listed buckets (using @/lib/supabase client):", allBuckets.map(b => b.id + " (" + b.name + ")"));
        const signatureBucketExists = allBuckets.some(b => b.name === 'signature');
        console.log("DIAGNOSTIC: Does 'signature' bucket appear in the list? (using @/lib/supabase client)", signatureBucketExists);
      }

      console.log("DIAGNOSTIC: Attempting to get bucket details for 'signature' (using @/lib/supabase client)...");
      const { data: bucketDetails, error: bucketDetailsError } = await supabase.storage.getBucket('signature');
      if (bucketDetailsError) {
        console.error("DIAGNOSTIC: Error calling getBucket('signature') (using @/lib/supabase client):", bucketDetailsError);
      } else {
        console.log("DIAGNOSTIC: Successfully got details for bucket 'signature' (using @/lib/supabase client):", bucketDetails);
      }
    } catch (e) {
      console.error("DIAGNOSTIC: Exception during storage diagnostics (using @/lib/supabase client):", e);
    }
    // === END OF DIAGNOSTIC STEP ===

    if (customerSignature) {
      console.log('Customer signature provided, attempting upload (using @/lib/supabase client).');
      try {
        const base64Data = customerSignature.split(';base64,').pop();
        if (!base64Data) {
          throw new Error('Invalid base64 signature data');
        }
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = `signature_${Date.now()}_${packageId}.png`; 

        console.log(`Attempting to upload to bucket: 'signature', path: '${filePath}' (using @/lib/supabase client)`);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('signature')
          .upload(filePath, buffer, {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadError) {
          console.error('Error uploading signature (using @/lib/supabase client):', uploadError);
        } else if (uploadData) {
          customer_signature_path = uploadData.path;
          console.log('Signature uploaded successfully, path:', customer_signature_path, '(using @/lib/supabase client)');
        }
      } catch (sigError) {
        console.error('Error processing signature (using @/lib/supabase client):', sigError);
      }
    }

    console.log('Attempting to insert into package_usage with data:', {
      package_id: packageId,
      employee_name: employeeName,
      used_hours: usedHours,
      used_date: usedDate,
      customer_signature_path: customer_signature_path,
    });

    const { data: usageData, error: usageError } = await supabase
      .from('package_usage')
      .insert({
        package_id: packageId,
        employee_name: employeeName,
        used_hours: usedHours,
        used_date: usedDate,
        customer_signature_path: customer_signature_path,
      })
      .select()
      .single();

    if (usageError) {
      console.error('Error recording usage (using @/lib/supabase client):', usageError);
      return NextResponse.json(
        { error: 'Failed to record package usage' },
        { status: 500 }
      );
    }

    return NextResponse.json(usageData);
  } catch (error) {
    console.error('Error in POST /api/packages/usage (using @/lib/supabase client):', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}