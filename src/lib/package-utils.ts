import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Fetches the actual package name from the database using package_id via RPC
 * @param packageId - The UUID of the package
 * @returns Promise<string | null> - The actual package name or null if not found
 */
export async function getPackageNameById(packageId: string): Promise<string | null> {
  if (!packageId) return null;

  try {
    const { data: packageName, error } = await refacSupabaseAdmin
      .rpc('get_package_name_by_id', { 
        p_package_id: packageId 
      });

    if (error) {
      console.error('Error fetching package name via RPC:', error);
      return null;
    }

    return packageName || null;
  } catch (error) {
    console.error('Error in getPackageNameById:', error);
    return null;
  }
}

/**
 * Gets the display package name for a booking, ONLY if there's a valid package_id
 * @param packageId - The package ID from the booking
 * @param storedPackageName - The package_name stored in the booking (ignored)
 * @returns Promise<string | null> - The package name if packageId exists, null otherwise
 */
export async function getDisplayPackageName(
  packageId: string | null, 
  storedPackageName: string | null
): Promise<string | null> {
  // Only show package if we have a valid package ID
  if (packageId) {
    const realPackageName = await getPackageNameById(packageId);
    return realPackageName;
  }

  // No package_id means no package should be displayed
  return null;
}