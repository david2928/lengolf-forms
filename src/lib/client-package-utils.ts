/**
 * Client-side utility to fetch package names via API
 */

/**
 * Fetches the display package name for a booking from the API
 * @param packageId - The package ID from the booking  
 * @param storedPackageName - The package_name stored in the booking
 * @returns Promise<string | null> - The best package name to display
 */
export async function getDisplayPackageName(
  packageId: string | null, 
  storedPackageName: string | null
): Promise<string | null> {
  try {
    const params = new URLSearchParams();
    if (packageId) params.append('packageId', packageId);
    if (storedPackageName) params.append('storedPackageName', storedPackageName);
    
    if (params.toString() === '') {
      return null;
    }

    const response = await fetch(`/api/packages/name?${params.toString()}`);
    
    if (!response.ok) {
      console.error('Error fetching package name from API:', response.statusText);
      // Fallback to cleaning up the stored name
      return storedPackageName?.startsWith('Will buy ') 
        ? storedPackageName.replace('Will buy ', '')
        : storedPackageName;
    }

    const data = await response.json();
    return data.packageName || null;
  } catch (error) {
    console.error('Error in client-side getDisplayPackageName:', error);
    // Fallback to cleaning up the stored name
    return storedPackageName?.startsWith('Will buy ') 
      ? storedPackageName.replace('Will buy ', '')
      : storedPackageName;
  }
}