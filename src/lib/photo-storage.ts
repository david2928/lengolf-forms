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
    console.log(`[PHOTO_DEBUG] uploadTimeClockPhoto called - staffId: ${staffId}, action: ${action}, dataLength: ${photoData?.length || 0}`);
    
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

    // Return the file path like it used to work before
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
 * Get signed URL for a time clock photo (PHASE 4 FIX: Streamlined and more reliable)
 */
export async function getTimeClockPhotoUrl(photoPath: string): Promise<string> {
  try {
    if (!photoPath) {
      return '';
    }

    // PHASE 4 FIX: Direct signed URL generation without complex checks
    const { data: signedData, error: signedError } = await refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .createSignedUrl(photoPath, 3600); // 1 hour expiry
    
    if (!signedError && signedData?.signedUrl) {
      return signedData.signedUrl;
    }
    
    // Log specific error for debugging
    console.error(`Photo URL generation: FAILED for ${photoPath}`, {
      error: signedError?.message,
      code: signedError?.name,
      bucket: PHOTO_CONFIG.STORAGE_BUCKET
    });
    
    // PHASE 4 FIX: Try public URL as fallback only if specifically configured
    const { data: publicData } = refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .getPublicUrl(photoPath);
    
    if (publicData?.publicUrl) {
      return publicData.publicUrl;
    }
    
    console.error(`Photo URL generation: COMPLETE FAILURE for ${photoPath} - No URL generated`);
    return '';
    
  } catch (error) {
    console.error(`Photo URL generation: CRITICAL ERROR for ${photoPath}:`, error);
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
      filteredFiles = filteredFiles.filter((file: any) => {
        // Extract date from filename (assuming YYYY-MM-DD/filename.jpg structure)
        const dateMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          const fileDate = dateMatch[1];
          return fileDate >= (startDate || '1900-01-01') && fileDate <= endDate;
        }
        return false;
      });
    }

    return filteredFiles.map((file: any) => file.name);
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

    // List photos older than cutoff date
    const oldPhotos = await listTimeClockPhotos('2020-01-01', cutoffDateStr);
    
    if (oldPhotos.length === 0) {
      return { deleted: 0, errors: 0 };
    }

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
      }
    }

    return { deleted, errors };
  } catch (error) {
    console.error('Error in cleanupOldPhotos:', error);
    return { deleted: 0, errors: 1 };
  }
}

/**
 * PHASE 4 FIX: Enhanced photo validation with detailed error reporting
 */
export function validatePhotoData(photoData: string): { valid: boolean; error?: string; details?: any } {
  if (!photoData) {
    return { 
      valid: false, 
      error: 'Photo data is required',
      details: { provided: false, length: 0 }
    };
  }

  if (!photoData.startsWith('data:image/')) {
    return { 
      valid: false, 
      error: 'Invalid photo data format - must be a data URL',
      details: { 
        provided: true, 
        length: photoData.length,
        starts_with: photoData.substring(0, 20)
      }
    };
  }

  // Check if it's a supported format
  const formatMatch = photoData.match(/^data:image\/(jpeg|jpg|png|webp);base64,/);
  if (!formatMatch) {
    return { 
      valid: false, 
      error: 'Unsupported photo format. Must be JPEG, PNG, or WebP',
      details: {
        provided: true,
        length: photoData.length,
        detected_format: photoData.match(/^data:image\/([^;]+)/)?.[1] || 'unknown'
      }
    };
  }

  // Check if base64 data exists
  const base64Data = photoData.split(';base64,').pop();
  if (!base64Data || base64Data.length === 0) {
    return { 
      valid: false, 
      error: 'No photo data found',
      details: {
        provided: true,
        format_valid: true,
        base64_length: base64Data?.length || 0
      }
    };
  }

  // PHASE 4 FIX: Validate base64 data size
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > PHOTO_CONFIG.MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `Photo size exceeds maximum allowed size (${PHOTO_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`,
        details: {
          provided: true,
          format_valid: true,
          actual_size: buffer.length,
          max_size: PHOTO_CONFIG.MAX_FILE_SIZE,
          size_mb: (buffer.length / 1024 / 1024).toFixed(2)
        }
      };
    }
    
    return { 
      valid: true,
      details: {
        provided: true,
        format_valid: true,
        format: formatMatch[1],
        size_bytes: buffer.length,
        size_kb: (buffer.length / 1024).toFixed(1)
      }
    };
  } catch (error) {
    return { 
      valid: false, 
      error: 'Invalid base64 data',
      details: {
        provided: true,
        format_valid: true,
        base64_error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * PHASE 4 FIX: Storage bucket health check
 */
export async function checkStorageBucketHealth(): Promise<{
  healthy: boolean;
  bucket_exists: boolean;
  can_list: boolean;
  can_upload: boolean;
  error?: string;
  details?: any;
}> {
  try {
    // Test 1: Check if bucket exists by listing contents
    const { data: listData, error: listError } = await refacSupabaseAdmin.storage
      .from(PHOTO_CONFIG.STORAGE_BUCKET)
      .list('', { limit: 1 });
    
    const canList = !listError;
    const bucketExists = canList;
    
    // Test 2: Test upload capability with tiny test file
    let canUpload = false;
    let uploadError = null;
    
    try {
      const testData = Buffer.from('test', 'utf8');
      const testPath = `health-check/test-${Date.now()}.txt`;
      
      const { error: uploadErr } = await refacSupabaseAdmin.storage
        .from(PHOTO_CONFIG.STORAGE_BUCKET)
        .upload(testPath, testData, {
          contentType: 'text/plain',
          upsert: true
        });
      
      if (!uploadErr) {
        canUpload = true;
        // Clean up test file
        await refacSupabaseAdmin.storage
          .from(PHOTO_CONFIG.STORAGE_BUCKET)
          .remove([testPath]);
      } else {
        uploadError = uploadErr.message;
      }
    } catch (err) {
      uploadError = err instanceof Error ? err.message : 'Unknown upload error';
    }
    
    const healthy = bucketExists && canList && canUpload;
    
    return {
      healthy,
      bucket_exists: bucketExists,
      can_list: canList,
      can_upload: canUpload,
      details: {
        list_error: listError?.message,
        upload_error: uploadError,
        bucket_name: PHOTO_CONFIG.STORAGE_BUCKET,
        max_file_size: PHOTO_CONFIG.MAX_FILE_SIZE,
        retention_days: PHOTO_CONFIG.RETENTION_DAYS
      }
    };
  } catch (error) {
    console.error('Phase 4: Storage health check failed:', error);
    return {
      healthy: false,
      bucket_exists: false,
      can_list: false,
      can_upload: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        bucket_name: PHOTO_CONFIG.STORAGE_BUCKET,
        critical_error: true
      }
    };
  }
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

    const bucketExists = buckets?.some((b: any) => b.name === PHOTO_CONFIG.STORAGE_BUCKET) || false;
    
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