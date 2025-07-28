import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffPin, recordTimeEntry, extractDeviceInfo, updateTimeEntryPhotoUrl } from '@/lib/staff-utils';
import { uploadTimeClockPhoto, validatePhotoData } from '@/lib/photo-storage';
import { TimeClockPunchRequest, TimeClockPunchResponse } from '@/types/staff';
import { DateTime } from 'luxon';
import { timeClockRateLimit } from '@/lib/rate-limiter';
import { logger, logApi, logError, logUserAction } from '@/lib/logger';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * Process photo upload asynchronously in the background
 * This allows the time entry to complete immediately while photo upload happens separately
 */
async function processPhotoAsync(
  photoData: string,
  staffId: number,
  action: 'clock_in' | 'clock_out',
  timestamp: string,
  entryId: number
): Promise<void> {
  console.log(`[PHOTO_DEBUG] Starting async photo processing for entry ${entryId}, staff ${staffId}, action ${action}`);
  
  try {
    const uploadResult = await uploadTimeClockPhoto({
      photoData,
      staffId,
      action,
      timestamp
    });

    console.log(`[PHOTO_DEBUG] Upload result for entry ${entryId}:`, {
      success: uploadResult.success,
      hasPhotoUrl: !!uploadResult.photoUrl,
      photoUrlLength: uploadResult.photoUrl?.length || 0,
      error: uploadResult.error
    });

    if (uploadResult.success && uploadResult.photoUrl) {
      // Update the time entry record with the photo URL
      try {
        console.log(`[PHOTO_DEBUG] Updating database for entry ${entryId} with URL: ${uploadResult.photoUrl.substring(0, 100)}...`);
        await updateTimeEntryPhotoUrl(entryId, uploadResult.photoUrl);
        console.log(`[PHOTO_DEBUG] Database update successful for entry ${entryId}`);
      } catch (dbError) {
        console.error(`[PHOTO_DEBUG] Database update failed for entry ${entryId}:`, dbError);
      }
    } else {
      console.error(`[PHOTO_DEBUG] Photo upload failed for entry ${entryId}:`, uploadResult.error);
    }
  } catch (error) {
    console.error(`[PHOTO_DEBUG] Critical error in photo processing for entry ${entryId}:`, error);
  }
}

/**
 * POST /api/time-clock/punch - Handle PIN input and determine clock in/out
 * Public endpoint - no authentication required (PIN-based security)
 */
export async function POST(request: NextRequest) {
  const startTime = performance.now();
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    // PHASE 5 SECURITY: Apply rate limiting before processing
    const rateLimitResult = timeClockRateLimit(request);
    
    if (!rateLimitResult.allowed) {
      const responseTime = performance.now() - startTime;
      
      logger.warn('Rate limit exceeded for time clock punch', 'SECURITY', {
        identifier: rateLimitResult.identifier,
        blockExpires: rateLimitResult.blockExpires,
        resetTime: rateLimitResult.resetTime,
        userAgent
      });
      
      
      return NextResponse.json(
        {
          success: false,
          message: 'Too many attempts. Please try again later.',
          retry_after: rateLimitResult.blockExpires ? 
            Math.ceil((rateLimitResult.blockExpires - Date.now()) / 1000) : 
            Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        } as TimeClockPunchResponse,
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetTime / 1000))
          }
        }
      );
    }

    // Parse request body
    const body: TimeClockPunchRequest = await request.json();
    const { pin, photo_data, device_info } = body;

    // Validate required fields
    if (!pin) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'PIN is required' 
        } as TimeClockPunchResponse,
        { status: 400 }
      );
    }

    // Verify PIN and get staff information
    const pinStartTime = performance.now();
    const pinVerification = await verifyStaffPin(pin);
    const pinDuration = performance.now() - pinStartTime;
    
    
    if (!pinVerification.success) {
      const responseTime = performance.now() - startTime;
      
      logger.warn('Time clock PIN verification failed', 'AUTH', {
        reason: pinVerification.message,
        isLocked: pinVerification.is_locked,
        userAgent
      });
      
      
      return NextResponse.json(
        {
          success: false,
          message: pinVerification.message,
          is_locked: pinVerification.is_locked,
          lock_expires_at: pinVerification.lock_expires_at
        } as TimeClockPunchResponse,
        { status: 401 }
      );
    }

    // Determine action based on current status
    const action = pinVerification.currently_clocked_in ? 'clock_out' : 'clock_in';
    const currentTime = DateTime.now().setZone('Asia/Bangkok');
    const timeString = currentTime.toFormat('h:mm a');
    
    // Prepare photo information for async processing
    let photoUrl: string | undefined;
    let photoCaptured = false;
    let cameraError: string | undefined;

    // Pre-validate photo data without processing
    if (photo_data) {
      const validation = validatePhotoData(photo_data);
      if (!validation.valid) {
        console.warn('Invalid photo data:', validation.error);
        cameraError = validation.error ?? 'Invalid photo format';
        photoCaptured = false;
        photoUrl = undefined;
      } else {
        // Photo validation passed - will process asynchronously
        photoCaptured = true;
        cameraError = undefined;
        photoUrl = undefined; // Will be set after async upload
      }
    } else {
      // Photo not provided - this is acceptable per requirements
      photoCaptured = false;
      cameraError = 'No photo provided';
    }

    // Extract device information
    const deviceInfo = device_info || extractDeviceInfo(request.headers);

    // Record time entry
    try {
      const timeEntry = await recordTimeEntry(
        pinVerification.staff_id!,
        action as 'clock_in' | 'clock_out',
        photoUrl,
        photoCaptured,
        cameraError,
        deviceInfo
      );

      // PHASE 5 SECURITY: Record successful authentication (reduces rate limit count)
      rateLimitResult.recordSuccess();
      
      const responseTime = performance.now() - startTime;

      // Log successful time clock action
      logUserAction(`Time clock ${action}`, String(pinVerification.staff_id), {
        staffName: pinVerification.staff_name,
        photoCaptured,
        responseTime: `${responseTime.toFixed(0)}ms`
      });
      

      // Generate success message
      const welcomeMessage = action === 'clock_in' 
        ? `Welcome ${pinVerification.staff_name}! Clocked in at ${timeString}. Have a great shift!`
        : `Goodbye ${pinVerification.staff_name}! Clocked out at ${timeString}. Thanks for your hard work!`;

      // Start async photo processing (don't await - let it run in background)
      if (photo_data && photoCaptured) {
        console.log(`[PHOTO_DEBUG] Starting background photo processing for entry ${timeEntry.entry_id}, photoCaptured: ${photoCaptured}, photo_data length: ${photo_data.length}`);
        processPhotoAsync(
          photo_data,
          pinVerification.staff_id!,
          action as 'clock_in' | 'clock_out',
          currentTime.toISO() || new Date().toISOString(),
          timeEntry.entry_id
        ).catch((error: unknown) => {
          console.error('[PHOTO_DEBUG] Background photo processing promise rejected:', error);
          // Photo failure doesn't affect time entry success
        });
      } else {
        console.log(`[PHOTO_DEBUG] Skipping photo processing - photo_data: ${!!photo_data}, photoCaptured: ${photoCaptured}`);
      }

      return NextResponse.json({
        success: true,
        staff_id: pinVerification.staff_id,
        staff_name: pinVerification.staff_name,
        action: action,
        timestamp: currentTime.toISO(),
        message: welcomeMessage,
        currently_clocked_in: action === 'clock_in',
        photo_captured: photoCaptured,
        entry_id: timeEntry.entry_id
      } as TimeClockPunchResponse);

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      logError('Error recording time entry', error as Error, 'DATABASE', {
        staffId: pinVerification.staff_id,
        action,
        responseTime: `${responseTime.toFixed(0)}ms`
      });
      
      
      return NextResponse.json(
        {
          success: false,
          message: 'Error recording time entry. Please try again.'
        } as TimeClockPunchResponse,
        { status: 500 }
      );
    }

  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    logError('Error in time clock punch API', error as Error, 'API', {
      endpoint: '/api/time-clock/punch',
      method: 'POST',
      responseTime: `${responseTime.toFixed(0)}ms`
    });
    
    
    return NextResponse.json(
      {
        success: false,
        message: 'System error. Please try again.'
      } as TimeClockPunchResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/time-clock/punch - Get current system status (health check)
 * Public endpoint for system status
 */
export async function GET() {
  try {
    const currentTime = DateTime.now().setZone('Asia/Bangkok');
    
    return NextResponse.json({
      status: 'operational',
      message: 'Time clock system is ready',
      server_time: currentTime.toISO(),
      server_time_display: currentTime.toFormat('MMM dd, yyyy h:mm a'),
      timezone: 'Asia/Bangkok'
    });
  } catch (error) {
    console.error('Error in GET /api/time-clock/punch:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'System error' 
      },
      { status: 500 }
    );
  }
} 