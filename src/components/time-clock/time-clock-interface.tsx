'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { 
  Clock, 
  Camera, 
  Delete, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  User,
  LogIn,
  LogOut,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react'

interface TimeClockState {
  pin: string
  showPin: boolean
  loading: boolean
  error: string | null
  success: string | null
  lockoutInfo: {
    isLocked: boolean
    timeRemaining: number
    attempts: number
  } | null
  staffInfo: {
    name: string
    currentlyClocked: boolean
    action: 'clock_in' | 'clock_out'
  } | null
  cameraStream: MediaStream | null
  photoData: string | null
}

export function TimeClockInterface() {
  const [state, setState] = useState<TimeClockState>({
    pin: '',
    showPin: false,
    loading: false,
    error: null,
    success: null,
    lockoutInfo: null,
    staffInfo: null,
    cameraStream: null,
    photoData: null
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lockoutTimerRef = useRef<NodeJS.Timeout>()

  // HYDRATION FIX: Format time display without causing server/client mismatch
  const getCurrentTime = () => {
    return new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Bangkok',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // HYDRATION FIX: Start with empty time to prevent server/client mismatch
  const [currentTime, setCurrentTime] = useState('')
  const [isClient, setIsClient] = useState(false)

  // HYDRATION FIX: Only set time after component mounts on client
  useEffect(() => {
    setIsClient(true)
    setCurrentTime(getCurrentTime())
    
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Emergency fallback - force isClient to true after 3 seconds if hydration seems stuck
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!isClient) {
        setIsClient(true)
        setCurrentTime(getCurrentTime())
      }
    }, 3000)

    return () => clearTimeout(fallbackTimer)
  }, [isClient])

  // Ref to track current camera stream for cleanup
  const cameraStreamRef = useRef<MediaStream | null>(null)

  // Initialize camera when component mounts
  useEffect(() => {
    initializeCamera()
    return () => {
      // Cleanup camera on unmount
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => {
          track.stop()
        })
        cameraStreamRef.current = null
      }
    }
  }, []) // Empty dependency array - only run once on mount

  // Additional cleanup when navigating away from page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => {
          track.stop()
        })
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => {
          track.stop()
        })
        cameraStreamRef.current = null
        setState(prev => ({ ...prev, cameraStream: null }))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, []) // Empty dependency array - only run once on mount

  const initializeCamera = async () => {
    try {
      // Check if navigator.mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('initializeCamera: navigator.mediaDevices not available')
        setState(prev => ({
          ...prev,
          cameraStream: null,
          error: 'Camera not supported in this browser.'
        }))
        return
      }

      // Stop any existing stream first
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop())
        cameraStreamRef.current = null
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 320, 
          height: 240,
          facingMode: 'user' 
        } 
      })
      
      // Store in ref for cleanup
      cameraStreamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      setState(prev => ({ ...prev, cameraStream: stream, error: null }))
    } catch (error) {
      console.error('Camera initialization failed:', error)
      cameraStreamRef.current = null
      
      // Provide more specific error messages
      let errorMessage = 'Camera access denied. Please allow camera permissions and refresh the page.'
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.'
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera permissions and refresh the page.'
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.'
        }
      }
      
      setState(prev => ({
        ...prev,
        cameraStream: null,
        error: errorMessage
      }))
    }
  }

  // Function to stop camera stream
  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      cameraStreamRef.current = null
      setState(prev => ({ ...prev, cameraStream: null }))
    }
  }, [])

  // Handle lockout countdown
  useEffect(() => {
    if (state.lockoutInfo?.isLocked && state.lockoutInfo.timeRemaining > 0) {
      lockoutTimerRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          lockoutInfo: prev.lockoutInfo ? {
            ...prev.lockoutInfo,
            timeRemaining: prev.lockoutInfo.timeRemaining - 1
          } : null
        }))
      }, 1000)
    } else if (state.lockoutInfo?.isLocked && state.lockoutInfo.timeRemaining <= 0) {
      setState(prev => ({ ...prev, lockoutInfo: null }))
    }

    return () => {
      if (lockoutTimerRef.current) {
        clearTimeout(lockoutTimerRef.current)
      }
    }
  }, [state.lockoutInfo])

  const resetState = useCallback(() => {
    setState(prev => ({
      ...prev,
      pin: '',
      error: null,
      success: null,
      staffInfo: null,
      photoData: null
    }))
  }, [])

  const handlePinDigit = useCallback((digit: string) => {
    if (state.loading || state.lockoutInfo?.isLocked) return
    if (state.pin.length >= 6) return // Limit to 6 digits
    
    setState(prev => ({
      ...prev,
      pin: prev.pin + digit,
      error: null
    }))
  }, [state.loading, state.lockoutInfo, state.pin.length])

  const handleBackspace = useCallback(() => {
    if (state.loading) return
    
    setState(prev => ({
      ...prev,
      pin: prev.pin.slice(0, -1),
      error: null
    }))
  }, [state.loading])

  const handleClear = useCallback(() => {
    if (state.loading) return
    setState(prev => ({
      ...prev,
      pin: '',
      error: null
    }))
  }, [state.loading])

  const capturePhoto = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext('2d')
    
    if (!context) return null

    // Phase 4: Ultra-compressed photo settings for maximum performance
    const targetWidth = 240  // Reduced from 320
    const targetHeight = 180 // Reduced from 240 (maintains 4:3 aspect ratio)
    
    canvas.width = targetWidth
    canvas.height = targetHeight
    
    // Draw video to canvas with consistent sizing
    context.drawImage(video, 0, 0, targetWidth, targetHeight)
    
    // Phase 4: Further reduced quality (30% vs 50%) for smaller files
    // Still adequate for staff identification while significantly reducing file size
    return canvas.toDataURL('image/jpeg', 0.3)
  }

  const handleClockInOut = async () => {
    // First validate PIN
    if (!state.pin || state.pin.length !== 6) {
      setState(prev => ({
        ...prev,
        error: 'PIN must be exactly 6 digits'
      }))
      return
    }

    // Capture photo automatically with compression validation
    const photoData = capturePhoto()
    if (!photoData) {
      setState(prev => ({
        ...prev,
        error: 'Failed to capture photo. Please ensure camera is working.'
      }))
      return
    }

    // Phase 5.5: Skip photo size validation for maximum performance

    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      // Direct punch API call - eliminates redundant status check
      const punchResponse = await fetch('/api/time-clock/punch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin: state.pin,
          photo_data: photoData,
          // Phase 5.5: Minimal device info for performance
          device_info: {
            timestamp: new Date().toISOString()
          }
        }),
      })

      const punchData = await punchResponse.json()
      
      if (!punchResponse.ok) {
        // Handle lockout scenarios
        if (punchData.is_locked || punchData.lock_expires_at) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: punchData.message,
            lockoutInfo: {
              isLocked: true,
              timeRemaining: punchData.lock_expires_at ? 
                Math.max(0, Math.floor((new Date(punchData.lock_expires_at).getTime() - Date.now()) / 1000)) : 0,
              attempts: 0
            }
          }))
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
            error: punchData.message || 'Clock in/out failed'
          }))
        }
        return
      }

      // Success!
      setState(prev => ({
        ...prev,
        loading: false,
        success: `${punchData.staff_name} successfully ${punchData.action === 'clock_in' ? 'clocked in' : 'clocked out'} at ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Bangkok' })}`,
        pin: '',
        photoData: photoData
      }))

      // Reset after 3 seconds
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          success: null,
          photoData: null
        }))
      }, 3000)

    } catch (error) {
      console.error('Clock in/out error:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Network error. Please try again.'
      }))
    }
  }

  const formatLockoutTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }


  return (
    <ErrorBoundary showTechnicalDetails={process.env.NODE_ENV === 'development'}>
      <>
        <style jsx>{`
          @media (min-width: 686px) and (max-width: 991px) {
            .tablet-modal-container {
              max-width: 36rem !important;
            }
            .tablet-logo-outer {
              width: 6rem !important;
              height: 6rem !important;
            }
            .tablet-logo-inner {
              width: 5rem !important;
              height: 5rem !important;
            }
            .tablet-logo-icon {
              width: 2.5rem !important;
              height: 2.5rem !important;
            }
            .tablet-title {
              font-size: 1.875rem !important;
            }
            .tablet-subtitle {
              font-size: 1rem !important;
            }
            .tablet-pin-circle {
              width: 1.25rem !important;
              height: 1.25rem !important;
            }
            .tablet-pin-gap {
              gap: 0.75rem !important;
            }
            .tablet-keypad-container {
              max-width: 24rem !important;
            }
            .tablet-keypad-gap {
              gap: 1rem !important;
              margin-bottom: 1rem !important;
            }
            .tablet-keypad-button {
              width: 4rem !important;
              height: 4rem !important;
              font-size: 1.25rem !important;
            }
            .tablet-camera-container {
              max-width: 20rem !important;
            }
          }
          
          @media (max-width: 685px) {
            .mobile-modal-container {
              max-width: 20rem !important;
            }
            .mobile-logo-outer {
              width: 4rem !important;
              height: 4rem !important;
            }
            .mobile-logo-inner {
              width: 3.5rem !important;
              height: 3.5rem !important;
            }
            .mobile-logo-icon {
              width: 2rem !important;
              height: 2rem !important;
            }
            .mobile-title {
              font-size: 1.5rem !important;
            }
            .mobile-subtitle {
              font-size: 0.875rem !important;
            }
            .mobile-pin-circle {
              width: 1rem !important;
              height: 1rem !important;
            }
            .mobile-pin-gap {
              gap: 0.5rem !important;
            }
            .mobile-keypad-container {
              max-width: 18rem !important;
            }
            .mobile-keypad-gap {
              gap: 0.75rem !important;
              margin-bottom: 0.75rem !important;
            }
            .mobile-keypad-button {
              width: 3.5rem !important;
              height: 3.5rem !important;
              font-size: 1.125rem !important;
            }
            .mobile-camera-container {
              max-width: 16rem !important;
            }
          }
        `}</style>
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#265020] via-green-800 to-[#265020]">
          <div className="h-full flex items-center justify-center p-2 sm:p-4">
            <div className="tablet-modal-container mobile-modal-container max-w-md w-full text-center">
              {/* Logo */}
              <div className="tablet-logo-outer mobile-logo-outer inline-flex items-center justify-center w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 rounded-full bg-white shadow-2xl mb-3 sm:mb-4 md:mb-6">
                <div className="tablet-logo-inner mobile-logo-inner w-14 sm:w-16 md:w-20 h-14 sm:h-16 md:h-20 rounded-full bg-gradient-to-br from-[#265020] to-green-700 flex items-center justify-center">
                  <Clock className="tablet-logo-icon mobile-logo-icon h-8 sm:h-10 md:h-12 w-8 sm:w-10 md:w-12 text-white" />
                </div>
              </div>
              
              <h1 className="tablet-title mobile-title text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Staff Time Clock</h1>
              {/* HYDRATION FIX: Only show time after client-side render */}
              <p className="tablet-subtitle mobile-subtitle text-green-100 mb-4 sm:mb-6 md:mb-8 text-sm sm:text-base">{isClient ? currentTime : 'Loading...'}</p>

              {/* Camera Section */}
              <div className="mb-3 sm:mb-4 md:mb-6 flex flex-col items-center">
                <div className="relative tablet-camera-container mobile-camera-container w-full max-w-sm mx-auto">
                  <div className="aspect-video bg-white/10 rounded-lg overflow-hidden border-2 border-white/20 mb-2 sm:mb-3 md:mb-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas
                      ref={canvasRef}
                      className="hidden"
                    />
                    {!state.cameraStream && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                        <Camera className="h-8 sm:h-10 md:h-12 w-8 sm:w-10 md:w-12 text-white/40" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-green-100">Position your face in the frame</p>
                  <p className="text-xs text-green-200/80">Make sure you&apos;re well lit and looking at the camera</p>
                </div>
              </div>

              {/* Error/Success Messages */}
              {state.error && (
                <div className="mb-3 sm:mb-4 md:mb-6 bg-red-500/20 border border-red-300/30 rounded-lg p-2 sm:p-3">
                  <p className="text-red-100 text-xs sm:text-sm flex items-center gap-2">
                    <AlertTriangle className="h-3 sm:h-4 w-3 sm:w-4" />
                    {state.error}
                  </p>
                </div>
              )}

              {state.success && (
                <div className="mb-3 sm:mb-4 md:mb-6 bg-green-500/20 border border-green-300/30 rounded-lg p-2 sm:p-3">
                  <p className="text-green-100 text-xs sm:text-sm flex items-center gap-2">
                    <CheckCircle className="h-3 sm:h-4 w-3 sm:w-4" />
                    {state.success}
                  </p>
                </div>
              )}

              {/* Lockout Info */}
              {state.lockoutInfo?.isLocked && (
                <div className="mb-3 sm:mb-4 md:mb-6 bg-red-500/20 border border-red-300/30 rounded-lg p-2 sm:p-3">
                  <p className="text-red-100 text-xs sm:text-sm flex items-center gap-2">
                    <Lock className="h-3 sm:h-4 w-3 sm:w-4" />
                    Account locked due to failed attempts. Please wait {formatLockoutTime(state.lockoutInfo.timeRemaining)} before trying again.
                  </p>
                </div>
              )}

              {/* PIN Entry Section */}
              <div className="mb-3 sm:mb-4 md:mb-6">
                <div className="text-center">
                  <label className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 block text-green-100">Enter Your 6-Digit PIN</label>
                  
                  {/* Custom PIN Display with 6 circles like POS */}
                  <div className="tablet-pin-gap mobile-pin-gap flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 md:mb-8">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={`tablet-pin-circle mobile-pin-circle w-3 sm:w-4 h-3 sm:h-4 rounded-full border-2 transition-all ${
                          i < state.pin.length ? 'bg-white border-white' : 'border-white/40'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Keypad */}
                <div className="tablet-keypad-container mobile-keypad-container max-w-xs mx-auto">
                  {/* Rows 1-3 */}
                  {[
                    [1, 2, 3],
                    [4, 5, 6], 
                    [7, 8, 9]
                  ].map((row, i) => (
                    <div key={i} className="tablet-keypad-gap mobile-keypad-gap flex gap-3 sm:gap-4 mb-3 sm:mb-4 justify-center">
                      {row.map(digit => (
                        <button
                          key={digit}
                          onClick={() => handlePinDigit(digit.toString())}
                          disabled={state.loading || !!state.lockoutInfo?.isLocked}
                          className="tablet-keypad-button mobile-keypad-button w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 rounded-full bg-white/90 hover:bg-white text-[#265020] text-lg sm:text-xl font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {digit}
                        </button>
                      ))}
                    </div>
                  ))}
                  
                  {/* Row 4: Clear, 0, Backspace */}
                  <div className="tablet-keypad-gap mobile-keypad-gap flex gap-3 sm:gap-4 mb-3 sm:mb-4 justify-center">
                    <button
                      onClick={handleClear}
                      disabled={state.loading || !!state.lockoutInfo?.isLocked}
                      className="tablet-keypad-button mobile-keypad-button w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => handlePinDigit('0')}
                      disabled={state.loading || !!state.lockoutInfo?.isLocked}
                      className="tablet-keypad-button mobile-keypad-button w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 rounded-full bg-white/90 hover:bg-white text-[#265020] text-lg sm:text-xl font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      0
                    </button>
                    <button
                      onClick={handleBackspace}
                      disabled={state.loading || !!state.lockoutInfo?.isLocked}
                      className="tablet-keypad-button mobile-keypad-button w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                      <Delete className="h-4 sm:h-5 w-4 sm:w-5" />
                    </button>
                  </div>
                </div>

                {/* Clock In/Out Button */}
                <button
                  onClick={handleClockInOut}
                  disabled={state.loading || !state.pin || state.pin.length !== 6 || !!state.lockoutInfo?.isLocked}
                  className="w-full mt-3 sm:mt-4 md:mt-6 py-2 sm:py-3 px-4 sm:px-6 rounded-full bg-white/90 hover:bg-white text-[#265020] font-bold text-sm sm:text-base md:text-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 sm:h-5 w-4 sm:w-5 border-2 border-[#265020] border-t-transparent"></div>
                      <span className="text-xs sm:text-sm md:text-base">Processing...</span>
                    </div>
                  ) : (
                    'Clock In / Clock Out'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    </ErrorBoundary>
  )
} 