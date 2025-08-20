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
 * Gets the display package name for a booking, preferring the real package name over the stored name
 * @param packageId - The package ID from the booking
 * @param storedPackageName - The package_name stored in the booking
 * @returns Promise<string | null> - The best package name to display
 */
export async function getDisplayPackageName(
  packageId: string | null, 
  storedPackageName: string | null
): Promise<string | null> {
  // If we have a package ID, fetch the real name
  if (packageId) {
    const realPackageName = await getPackageNameById(packageId);
    if (realPackageName) {
      return realPackageName;
    }
  }

  // Fallback to stored name, but clean up "Will buy " prefix
  if (storedPackageName) {
    return storedPackageName.startsWith('Will buy ') 
      ? storedPackageName.replace('Will buy ', '')
      : storedPackageName;
  }

  return null;
}