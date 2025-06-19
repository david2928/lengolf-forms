import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffPin, recordTimeEntry, extractDeviceInfo } from '@/lib/staff-utils';
import { uploadTimeClockPhoto, validatePhotoData } from '@/lib/photo-storage';
import { TimeClockPunchRequest, TimeClockPunchResponse } from '@/types/staff';
import { DateTime } from 'luxon';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * POST /api/time-clock/punch - Handle PIN input and determine clock in/out
 * Public endpoint - no authentication required (PIN-based security)
 */
export async function POST(request: NextRequest) {
  try {
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
    const pinVerification = await verifyStaffPin(pin);
    
    if (!pinVerification.success) {
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
    
    // Prepare photo information
    let photoUrl: string | undefined;
    let photoCaptured = false;
    let cameraError: string | undefined;

    // Handle photo data if provided
    if (photo_data) {
      try {
        // Validate photo data format
        const validation = validatePhotoData(photo_data);
        if (!validation.valid) {
          console.warn('Invalid photo data:', validation.error);
          cameraError = validation.error ?? 'Invalid photo format';
          photoCaptured = false;
          photoUrl = undefined;
        } else {
          // Upload photo to Supabase storage (following signature upload pattern)
          const uploadResult = await uploadTimeClockPhoto({
            photoData: photo_data,
            staffId: pinVerification.staff_id!,
            action: action as 'clock_in' | 'clock_out',
            timestamp: currentTime.toISO()
          });

          if (uploadResult.success && uploadResult.photoUrl) {
            photoUrl = uploadResult.photoUrl;
            photoCaptured = true;
            console.log('Photo uploaded successfully:', photoUrl);
          } else {
            console.error('Photo upload failed:', uploadResult.error);
            cameraError = uploadResult.error ?? 'Photo upload failed';
            photoCaptured = false;
            photoUrl = undefined;
          }
        }
      } catch (error) {
        console.error('Photo processing error:', error);
        cameraError = 'Photo processing failed';
        photoCaptured = false;
        photoUrl = undefined;
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

      // Generate success message
      const welcomeMessage = action === 'clock_in' 
        ? `Welcome ${pinVerification.staff_name}! Clocked in at ${timeString}. Have a great shift!`
        : `Goodbye ${pinVerification.staff_name}! Clocked out at ${timeString}. Thanks for your hard work!`;

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
      console.error('Error recording time entry:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Error recording time entry. Please try again.'
        } as TimeClockPunchResponse,
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in POST /api/time-clock/punch:', error);
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