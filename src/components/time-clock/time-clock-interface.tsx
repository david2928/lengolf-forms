'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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

  // Ref to track current camera stream for cleanup
  const cameraStreamRef = useRef<MediaStream | null>(null)

  // Initialize camera when component mounts
  useEffect(() => {
    initializeCamera()
    return () => {
      // Cleanup camera on unmount
      if (cameraStreamRef.current) {
        console.log('Cleaning up camera stream on unmount')
        cameraStreamRef.current.getTracks().forEach(track => {
          track.stop()
          console.log('Stopped camera track:', track.kind)
        })
        cameraStreamRef.current = null
      }
    }
  }, []) // Empty dependency array - only run once on mount

  // Additional cleanup when navigating away from page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (cameraStreamRef.current) {
        console.log('Cleaning up camera stream on page unload')
        cameraStreamRef.current.getTracks().forEach(track => {
          track.stop()
        })
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && cameraStreamRef.current) {
        console.log('Page hidden, stopping camera stream')
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
      // Stop any existing stream first
      if (cameraStreamRef.current) {
        console.log('Stopping existing camera stream before initializing new one')
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
      
      console.log('Camera initialized successfully')
      setState(prev => ({ ...prev, cameraStream: stream, error: null }))
    } catch (error) {
      console.error('Camera initialization failed:', error)
      cameraStreamRef.current = null
      setState(prev => ({
        ...prev,
        cameraStream: null,
        error: 'Camera access denied. Please allow camera permissions and refresh the page.'
      }))
    }
  }

  // Function to stop camera stream
  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      console.log('Stopping camera stream manually')
      cameraStreamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('Stopped camera track:', track.kind)
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

    // Use smaller, consistent resolution for photos
    const targetWidth = 320
    const targetHeight = 240
    
    canvas.width = targetWidth
    canvas.height = targetHeight
    
    // Draw video to canvas with consistent sizing
    context.drawImage(video, 0, 0, targetWidth, targetHeight)
    
    // Lower quality for smaller file sizes (50% quality is adequate for identification)
    return canvas.toDataURL('image/jpeg', 0.5)
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

    // Capture photo automatically
    const photoData = capturePhoto()
    if (!photoData) {
      setState(prev => ({
        ...prev,
        error: 'Failed to capture photo. Please ensure camera is working.'
      }))
      return
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      // First verify PIN to get staff info
      const statusResponse = await fetch(`/api/time-clock/status/${state.pin}`)
      const statusData = await statusResponse.json()

      if (!statusResponse.ok) {
        if (statusData.lockoutInfo) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: statusData.message,
            lockoutInfo: {
              isLocked: statusData.lockoutInfo.isLocked,
              timeRemaining: statusData.lockoutInfo.timeRemaining,
              attempts: statusData.lockoutInfo.attempts
            }
          }))
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
            error: statusData.message || 'Invalid PIN'
          }))
        }
        return
      }

      // Now perform the punch with photo
      const punchResponse = await fetch('/api/time-clock/punch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin: state.pin,
          photo_data: photoData,
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screen: {
              width: screen.width,
              height: screen.height
            },
            timestamp: new Date().toISOString()
          }
        }),
      })

      const punchData = await punchResponse.json()
      
      if (!punchResponse.ok) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: punchData.message || 'Clock in/out failed'
        }))
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

  const renderNumericKeypad = () => {
    const digits = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['Clear', '0', '⌫']
    ]

    return (
      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-4">
        {digits.flat().map((value, index) => {
          const isSpecial = value === 'Clear' || value === '⌫'
          const disabled = state.loading || !!state.lockoutInfo?.isLocked
          
          return (
            <Button
              key={index}
              onClick={() => {
                if (value === '⌫') {
                  handleBackspace()
                } else if (value === 'Clear') {
                  handleClear()
                } else {
                  handlePinDigit(value)
                }
              }}
              disabled={disabled}
              variant={isSpecial ? "outline" : "default"}
              size="lg"
              className={`
                h-14 text-lg font-semibold
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                hover:scale-105 active:scale-95 transition-transform
              `}
            >
              {value === '⌫' ? (
                <Delete className="h-5 w-5" />
              ) : (
                value
              )}
            </Button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center bg-primary text-primary-foreground rounded-t-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-6 w-6" />
            <CardTitle className="text-xl">Staff Time Clock</CardTitle>
          </div>
          {/* HYDRATION FIX: Only show time after client-side render */}
          <p className="text-sm opacity-90">{isClient ? currentTime : 'Loading...'}</p>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Camera Section */}
          <div className="space-y-4">
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
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
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                  <Camera className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Position your face in the frame</p>
              <p className="text-xs text-muted-foreground">Make sure you&apos;re well lit and looking at the camera</p>
            </div>
          </div>

          {/* Error/Success Messages */}
          {state.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state.success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          )}

          {/* Lockout Info */}
          {state.lockoutInfo?.isLocked && (
            <Alert variant="destructive">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Account locked due to failed attempts. Please wait {formatLockoutTime(state.lockoutInfo.timeRemaining)} before trying again.
              </AlertDescription>
            </Alert>
          )}

          {/* PIN Entry Section */}
          <div className="space-y-4">
            <div className="text-center">
              <label className="text-sm font-medium mb-3 block">Enter Your 6-Digit PIN</label>
              
              {/* Custom PIN Display with 6 separate boxes */}
              <div className="flex items-center justify-center gap-2 mb-6 ml-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className={`
                      w-8 h-10 border-2 rounded-md flex items-center justify-center
                      text-lg font-mono font-bold
                      transition-all duration-200
                      ${index < state.pin.length 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-gray-300 bg-gray-50'
                      }
                      ${state.lockoutInfo?.isLocked ? 'opacity-50' : ''}
                    `}
                  >
                    {index < state.pin.length ? (
                      state.showPin ? state.pin[index] : '●'
                    ) : (
                      <div className="w-4 h-0.5 bg-gray-400 rounded"></div>
                    )}
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, showPin: !prev.showPin }))}
                  disabled={state.loading}
                  className="ml-2"
                >
                  {state.showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Numeric Keypad */}
            {renderNumericKeypad()}

            {/* Clock In/Out Button */}
            <Button
              onClick={handleClockInOut}
              disabled={state.loading || !state.pin || state.pin.length !== 6 || !!state.lockoutInfo?.isLocked}
              className="w-full"
              size="lg"
            >
              {state.loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Clock In / Clock Out'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 