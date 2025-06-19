/**
 * Photo Storage Utility for Time Clock System
 * Based on existing signature storage patterns in package-usage
 */

import { refacSupabaseAdmin } from './refac-supabase';
import { PHOTO_CONFIG } from '@/types/staff';

export interface PhotoUploadResult {
  success: boolean;
  photoUrl?: string;
  error?: string;
}

export interface PhotoUploadRequest {
  photoData: string; // Base64 data URL
  staffId: number;
  action: 'clock_in' | 'clock_out';
  timestamp?: string | null;
}

/**
 * Upload time clock photo to Supabase storage
 * Following the same pattern as signature uploads
 */
export async function uploadTimeClockPhoto(request: PhotoUploadRequest): Promise<PhotoUploadResult> {
  try {
    const { photoData, staffId, action, timestamp } = request;
    
    // Validate photo data
    if (!photoData || !photoData.startsWith('data:image/')) {
      return {
        success: false,
        error: 'Invalid photo data format'
      };
    }

    // Extract base64 data (same pattern as signature upload)
    const base64Data = photoData.split(';base64,').pop();
    if (!base64Data) {
      return {
        success: false,
        error: 'Failed to extract base64 data from photo'
      };
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Validate file size
    if (buffer.length > PHOTO_CONFIG.MAX_FILE_SIZE) {
      return {
        success: false,
        error: `Photo size exceeds maximum allowed size (${PHOTO_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`
      };
    }

    // Generate unique filename with timestamp and identifiers
    const now = timestamp ? new Date(timestamp) : new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.getTime(); // Unix timestamp
    const filePath = `${dateStr}/timeclock_${timeStr}_${staffId}_${action}.jpg`;

    console.log(`Uploading time clock photo to bucket: '${PHOTO_CONFIG.STORAGE_BUCKET}', path: '${filePath}'`);

    // Upload to Supabase storage (same pattern as signature upload)
    const { data: uploadData, error: uploadError } = await refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: false, // Don't overwrite existing files
        cacheControl: '3600' // 1 hour cache
      });

    if (uploadError) {
      console.error('Error uploading time clock photo:', uploadError);
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`
      };
    }

    if (!uploadData?.path) {
      return {
        success: false,
        error: 'Upload succeeded but no path returned'
      };
    }

    console.log('Time clock photo uploaded successfully, path:', uploadData.path);
    
    return {
      success: true,
      photoUrl: uploadData.path
    };

  } catch (error) {
    console.error('Error in uploadTimeClockPhoto:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get signed URL for a time clock photo (simplified and more robust)
 */
export async function getTimeClockPhotoUrl(photoPath: string): Promise<string> {
  try {
    if (!photoPath) {
      console.warn('Empty photo path provided');
      return '';
    }

    console.log(`Getting photo URL for path: ${photoPath} from bucket: ${PHOTO_CONFIG.STORAGE_BUCKET}`);
    
    // Try to create a signed URL first (this is the most reliable method)
    const { data: signedData, error: signedError } = await refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .createSignedUrl(photoPath, 3600); // 1 hour expiry
    
    if (!signedError && signedData?.signedUrl) {
      console.log('Successfully created signed URL');
      return signedData.signedUrl;
    }
    
    // Log the error but don't fail completely
    console.warn('Signed URL creation failed:', signedError?.message);
    
    // Try public URL as fallback (might work if bucket is public)
    const { data: publicData } = refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .getPublicUrl(photoPath);
    
    if (publicData?.publicUrl) {
      console.log('Using public URL as fallback:', publicData.publicUrl);
      return publicData.publicUrl;
    }
    
    console.error('Both signed and public URL generation failed for path:', photoPath);
    return '';
    
  } catch (error) {
    console.error('Error getting photo URL:', error);
    return '';
  }
}

/**
 * Delete time clock photo from storage
 */
export async function deleteTimeClockPhoto(photoPath: string): Promise<boolean> {
  try {
    const { error } = await refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .remove([photoPath]);

    if (error) {
      console.error('Error deleting time clock photo:', error);
      return false;
    }

    console.log('Time clock photo deleted successfully:', photoPath);
    return true;
  } catch (error) {
    console.error('Error in deleteTimeClockPhoto:', error);
    return false;
  }
}

/**
 * List photos in a date range for cleanup
 */
export async function listTimeClockPhotos(
  startDate?: string, 
  endDate?: string, 
  limit: number = 1000
): Promise<string[]> {
  try {
    let prefix = '';
    if (startDate) {
      prefix = startDate; // YYYY-MM-DD format
    }

    const { data, error } = await refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .list(prefix, {
        limit,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Error listing time clock photos:', error);
      return [];
    }

    // Filter by date range if specified
    let filteredFiles = data || [];
    
    if (endDate) {
      filteredFiles = filteredFiles.filter(file => {
        // Extract date from filename (assuming YYYY-MM-DD/filename.jpg structure)
        const dateMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          const fileDate = dateMatch[1];
          return fileDate >= (startDate || '1900-01-01') && fileDate <= endDate;
        }
        return false;
      });
    }

    return filteredFiles.map(file => file.name);
  } catch (error) {
    console.error('Error in listTimeClockPhotos:', error);
    return [];
  }
}

/**
 * Cleanup old photos based on retention policy
 */
export async function cleanupOldPhotos(): Promise<{ deleted: number; errors: number }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - PHOTO_CONFIG.RETENTION_DAYS);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`Starting cleanup of time clock photos older than ${cutoffDateStr}`);

    // List photos older than cutoff date
    const oldPhotos = await listTimeClockPhotos('2020-01-01', cutoffDateStr);
    
    if (oldPhotos.length === 0) {
      console.log('No old photos to cleanup');
      return { deleted: 0, errors: 0 };
    }

    console.log(`Found ${oldPhotos.length} photos to cleanup`);

    // Delete photos in batches
    const batchSize = 100;
    let deleted = 0;
    let errors = 0;

    for (let i = 0; i < oldPhotos.length; i += batchSize) {
      const batch = oldPhotos.slice(i, i + batchSize);
      
      const { error } = await refacSupabaseAdmin.storage
        .from(PHOTO_CONFIG.STORAGE_BUCKET)
        .remove(batch);

      if (error) {
        console.error(`Error deleting batch ${i / batchSize + 1}:`, error);
        errors += batch.length;
      } else {
        deleted += batch.length;
        console.log(`Deleted batch ${i / batchSize + 1}: ${batch.length} photos`);
      }
    }

    console.log(`Cleanup completed: ${deleted} deleted, ${errors} errors`);
    return { deleted, errors };
  } catch (error) {
    console.error('Error in cleanupOldPhotos:', error);
    return { deleted: 0, errors: 1 };
  }
}

/**
 * Validate photo data format
 */
export function validatePhotoData(photoData: string): { valid: boolean; error?: string } {
  if (!photoData) {
    return { valid: false, error: 'Photo data is required' };
  }

  if (!photoData.startsWith('data:image/')) {
    return { valid: false, error: 'Invalid photo data format - must be a data URL' };
  }

  // Check if it's a supported format
  const formatMatch = photoData.match(/^data:image\/(jpeg|jpg|png|webp);base64,/);
  if (!formatMatch) {
    return { valid: false, error: 'Unsupported photo format. Must be JPEG, PNG, or WebP' };
  }

  // Check if base64 data exists
  const base64Data = photoData.split(';base64,').pop();
  if (!base64Data || base64Data.length === 0) {
    return { valid: false, error: 'No photo data found' };
  }

  return { valid: true };
}

/**
 * Diagnostic function to check storage bucket status
 */
export async function checkStorageBucket(): Promise<{
  bucketExists: boolean;
  canUpload: boolean;
  error?: string;
}> {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await refacSupabaseAdmin.storage.listBuckets();
    
    if (listError) {
      return {
        bucketExists: false,
        canUpload: false,
        error: `Cannot list buckets: ${listError.message}`
      };
    }

    const bucketExists = buckets?.some(b => b.name === PHOTO_CONFIG.STORAGE_BUCKET) || false;
    
    if (!bucketExists) {
      return {
        bucketExists: false,
        canUpload: false,
        error: `Bucket '${PHOTO_CONFIG.STORAGE_BUCKET}' does not exist`
      };
    }

    // Try to get bucket details
    const { error: bucketError } = await refacSupabaseAdmin.storage.getBucket(PHOTO_CONFIG.STORAGE_BUCKET);
    
    if (bucketError) {
      return {
        bucketExists: true,
        canUpload: false,
        error: `Cannot access bucket: ${bucketError.message}`
      };
    }

    return {
      bucketExists: true,
      canUpload: true
    };
  } catch (error) {
    return {
      bucketExists: false,
      canUpload: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 