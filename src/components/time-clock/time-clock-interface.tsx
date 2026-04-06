'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import {
  Clock,
  Camera,
  Delete,
  CheckCircle,
  AlertTriangle,
  Lock,
  LogIn,
  LogOut,
  AlertCircle,
} from 'lucide-react'

// ==========================================
// Types
// ==========================================

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
    staffId: number
    action: 'clock_in' | 'clock_out'
  } | null
  cameraStream: MediaStream | null
  photoData: string | null
  // Double-tap confirmation
  confirmationNeeded: {
    message: string
    pin: string
    photoData: string | null
  } | null
}

interface HistoryData {
  shifts: { clock_in: string; clock_out: string | null; hours: number | null }[]
  total_hours: number
  scheduled_shift: {
    start_time: string
    end_time: string
    location: string | null
    scheduled_hours: number | null
  } | null
  entries: { id: number; action: string; time: string }[]
}

type ViewMode = 'pin' | 'history'

// ==========================================
// History View Component
// ==========================================

function HistoryView({
  staffName,
  action,
  history,
  onDone,
  autoResetSeconds,
}: {
  staffName: string
  action: 'clock_in' | 'clock_out'
  history: HistoryData | null
  onDone: () => void
  autoResetSeconds: number
}) {
  const [countdown, setCountdown] = useState(autoResetSeconds)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (countdown <= 0) onDone()
  }, [countdown, onDone])

  const formatScheduleTime = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
    return m === 0 ? `${displayH} ${ampm}` : `${displayH}:${String(m).padStart(2, '0')} ${ampm}`
  }

  const isShortShift = history?.scheduled_shift?.scheduled_hours && history.total_hours > 0
    && history.total_hours < (history.scheduled_shift.scheduled_hours * 0.7)

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#265020] via-green-800 to-[#265020]">
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="max-w-sm w-full">
          {/* Success Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-3">
              {action === 'clock_in' ? (
                <LogIn className="h-8 w-8 text-green-200" />
              ) : (
                <LogOut className="h-8 w-8 text-green-200" />
              )}
            </div>
            <h2 className="text-xl font-bold text-white">
              {action === 'clock_in' ? 'Clocked In' : 'Clocked Out'}
            </h2>
            <p className="text-green-100 text-sm mt-1">{staffName}</p>
          </div>

          {/* Today's Shifts */}
          {history && (
            <div className="bg-white/10 rounded-xl p-4 mb-4 border border-white/20">
              <h3 className="text-sm font-semibold text-green-100 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Today&apos;s Hours
              </h3>

              {history.shifts.length > 0 ? (
                <div className="space-y-2">
                  {history.shifts.map((shift, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-white">
                        <span className="font-mono">{shift.clock_in}</span>
                        <span className="text-green-300">→</span>
                        <span className="font-mono">{shift.clock_out || '...'}</span>
                      </div>
                      {shift.hours !== null && (
                        <span className="text-green-200 text-xs">
                          {shift.hours.toFixed(1)}h
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-green-200/60 text-sm">No entries yet</p>
              )}

              {/* Total */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-sm text-green-100 font-medium">Total</span>
                <span className="text-white font-bold">
                  {history.total_hours.toFixed(1)} hrs
                </span>
              </div>

              {/* Scheduled shift comparison */}
              {history.scheduled_shift && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-green-200/70">
                    Scheduled: {formatScheduleTime(history.scheduled_shift.start_time)} – {formatScheduleTime(history.scheduled_shift.end_time)}
                    {history.scheduled_shift.scheduled_hours && ` (${history.scheduled_shift.scheduled_hours}h)`}
                  </span>
                </div>
              )}

              {/* Short shift warning */}
              {isShortShift && (
                <div className="mt-2 flex items-center gap-2 text-amber-200 text-xs bg-amber-500/20 rounded-lg p-2">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Hours look shorter than scheduled. If this is a mistake, please let admin know.</span>
                </div>
              )}
            </div>
          )}

          {/* Done Button */}
          <button
            onClick={onDone}
            className="w-full py-3 px-6 rounded-full bg-white/90 hover:bg-white text-[#265020] font-bold text-base hover:scale-105 active:scale-95 transition-all"
          >
            Done
          </button>
          <p className="text-center text-green-200/50 text-xs mt-2">
            Auto-closing in {countdown}s
          </p>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Confirmation Dialog Component
// ==========================================

function ConfirmationDialog({
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Quick Punch?</h3>
        </div>
        <p className="text-slate-600 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-lg bg-[#265020] text-white font-medium text-sm hover:bg-[#1d3d18] transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Yes, Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Main Component
// ==========================================

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
    photoData: null,
    confirmationNeeded: null,
  })

  const [viewMode, setViewMode] = useState<ViewMode>('pin')
  const [historyData, setHistoryData] = useState<HistoryData | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lockoutTimerRef = useRef<NodeJS.Timeout>()
  const cameraStreamRef = useRef<MediaStream | null>(null)

  // HYDRATION FIX
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

  const [currentTime, setCurrentTime] = useState('')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setCurrentTime(getCurrentTime())
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!isClient) {
        setIsClient(true)
        setCurrentTime(getCurrentTime())
      }
    }, 3000)
    return () => clearTimeout(fallbackTimer)
  }, [isClient])

  // Camera initialization
  useEffect(() => {
    initializeCamera()
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop())
        cameraStreamRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
    const handleVisibilityChange = () => {
      if (document.hidden && cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop())
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
  }, [])

  const initializeCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setState(prev => ({ ...prev, cameraStream: null, error: 'Camera not supported in this browser.' }))
        return
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop())
        cameraStreamRef.current = null
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' }
      })
      cameraStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setState(prev => ({ ...prev, cameraStream: stream, error: null }))
    } catch (error) {
      cameraStreamRef.current = null
      let errorMessage = 'Camera access denied. Please allow camera permissions and refresh the page.'
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') errorMessage = 'No camera found on this device.'
        else if (error.name === 'NotAllowedError') errorMessage = 'Camera access denied. Please allow camera permissions and refresh the page.'
        else if (error.name === 'NotReadableError') errorMessage = 'Camera is already in use by another application.'
      }
      setState(prev => ({ ...prev, cameraStream: null, error: errorMessage }))
    }
  }

  // Lockout countdown
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
      if (lockoutTimerRef.current) clearTimeout(lockoutTimerRef.current)
    }
  }, [state.lockoutInfo])

  const resetToPin = useCallback(() => {
    setState(prev => ({
      ...prev,
      pin: '',
      error: null,
      success: null,
      staffInfo: null,
      photoData: null,
      confirmationNeeded: null,
    }))
    setViewMode('pin')
    setHistoryData(null)
  }, [])

  const handlePinDigit = useCallback((digit: string) => {
    if (state.loading || state.lockoutInfo?.isLocked) return
    if (state.pin.length >= 6) return
    setState(prev => ({ ...prev, pin: prev.pin + digit, error: null }))
  }, [state.loading, state.lockoutInfo, state.pin.length])

  const handleBackspace = useCallback(() => {
    if (state.loading) return
    setState(prev => ({ ...prev, pin: prev.pin.slice(0, -1), error: null }))
  }, [state.loading])

  const handleClear = useCallback(() => {
    if (state.loading) return
    setState(prev => ({ ...prev, pin: '', error: null }))
  }, [state.loading])

  const capturePhoto = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null
    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext('2d')
    if (!context) return null
    const targetWidth = 240
    const targetHeight = 180
    canvas.width = targetWidth
    canvas.height = targetHeight
    context.drawImage(video, 0, 0, targetWidth, targetHeight)
    return canvas.toDataURL('image/jpeg', 0.3)
  }

  const fetchHistory = async (staffId: number) => {
    try {
      const res = await fetch(`/api/time-clock/history?staff_id=${staffId}`)
      const data = await res.json()
      if (data.success) {
        setHistoryData({
          shifts: data.shifts,
          total_hours: data.total_hours,
          scheduled_shift: data.scheduled_shift,
          entries: data.entries,
        })
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
    }
  }

  const handleClockInOut = async (confirmDoubleTap = false) => {
    const pin = confirmDoubleTap && state.confirmationNeeded ? state.confirmationNeeded.pin : state.pin

    if (!pin || pin.length !== 6) {
      setState(prev => ({ ...prev, error: 'PIN must be exactly 6 digits' }))
      return
    }

    const photoData = confirmDoubleTap && state.confirmationNeeded
      ? state.confirmationNeeded.photoData
      : capturePhoto()

    if (!photoData) {
      setState(prev => ({ ...prev, error: 'Failed to capture photo. Please ensure camera is working.' }))
      return
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null, confirmationNeeded: null }))

      const punchResponse = await fetch('/api/time-clock/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          photo_data: photoData,
          device_info: { timestamp: new Date().toISOString() },
          confirm_double_tap: confirmDoubleTap,
        }),
      })

      const punchData = await punchResponse.json()

      if (!punchResponse.ok) {
        // Double-tap confirmation needed
        if (punchData.needs_confirmation) {
          setState(prev => ({
            ...prev,
            loading: false,
            confirmationNeeded: {
              message: punchData.message,
              pin,
              photoData,
            },
          }))
          return
        }

        // Handle lockout
        if (punchData.is_locked || punchData.lock_expires_at) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: punchData.message,
            lockoutInfo: {
              isLocked: true,
              timeRemaining: punchData.lock_expires_at
                ? Math.max(0, Math.floor((new Date(punchData.lock_expires_at).getTime() - Date.now()) / 1000))
                : 0,
              attempts: 0
            }
          }))
        } else {
          setState(prev => ({ ...prev, loading: false, error: punchData.message || 'Clock in/out failed' }))
        }
        return
      }

      // Success — fetch history and show it
      setState(prev => ({
        ...prev,
        loading: false,
        staffInfo: {
          name: punchData.staff_name,
          staffId: punchData.staff_id,
          action: punchData.action,
        },
        pin: '',
        photoData,
      }))

      await fetchHistory(punchData.staff_id)
      setViewMode('history')

    } catch (error) {
      console.error('Clock in/out error:', error)
      setState(prev => ({ ...prev, loading: false, error: 'Network error. Please try again.' }))
    }
  }

  const formatLockoutTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // ==========================================
  // Render
  // ==========================================

  // Show history view after successful punch
  if (viewMode === 'history' && state.staffInfo) {
    return (
      <ErrorBoundary showTechnicalDetails={process.env.NODE_ENV === 'development'}>
        <HistoryView
          staffName={state.staffInfo.name}
          action={state.staffInfo.action}
          history={historyData}
          onDone={resetToPin}
          autoResetSeconds={60}
        />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary showTechnicalDetails={process.env.NODE_ENV === 'development'}>
      <>
        {/* Double-tap confirmation dialog */}
        {state.confirmationNeeded && (
          <ConfirmationDialog
            message={state.confirmationNeeded.message}
            onConfirm={() => handleClockInOut(true)}
            onCancel={() => setState(prev => ({ ...prev, confirmationNeeded: null }))}
            loading={state.loading}
          />
        )}

        <style jsx>{`
          @media (min-width: 686px) and (max-width: 991px) {
            .tablet-modal-container { max-width: 36rem !important; }
            .tablet-logo-outer { width: 6rem !important; height: 6rem !important; }
            .tablet-logo-inner { width: 5rem !important; height: 5rem !important; }
            .tablet-logo-icon { width: 2.5rem !important; height: 2.5rem !important; }
            .tablet-title { font-size: 1.875rem !important; }
            .tablet-subtitle { font-size: 1rem !important; }
            .tablet-pin-circle { width: 1.25rem !important; height: 1.25rem !important; }
            .tablet-pin-gap { gap: 0.75rem !important; }
            .tablet-keypad-container { max-width: 24rem !important; }
            .tablet-keypad-gap { gap: 1rem !important; margin-bottom: 1rem !important; }
            .tablet-keypad-button { width: 4rem !important; height: 4rem !important; font-size: 1.25rem !important; }
            .tablet-camera-container { max-width: 20rem !important; }
          }
          @media (max-width: 685px) {
            .mobile-modal-container { max-width: 20rem !important; }
            .mobile-logo-outer { width: 4rem !important; height: 4rem !important; }
            .mobile-logo-inner { width: 3.5rem !important; height: 3.5rem !important; }
            .mobile-logo-icon { width: 2rem !important; height: 2rem !important; }
            .mobile-title { font-size: 1.5rem !important; }
            .mobile-subtitle { font-size: 0.875rem !important; }
            .mobile-pin-circle { width: 1rem !important; height: 1rem !important; }
            .mobile-pin-gap { gap: 0.5rem !important; }
            .mobile-keypad-container { max-width: 18rem !important; }
            .mobile-keypad-gap { gap: 0.75rem !important; margin-bottom: 0.75rem !important; }
            .mobile-keypad-button { width: 3.5rem !important; height: 3.5rem !important; font-size: 1.125rem !important; }
            .mobile-camera-container { max-width: 16rem !important; }
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
              <p className="tablet-subtitle mobile-subtitle text-green-100 mb-4 sm:mb-6 md:mb-8 text-sm sm:text-base">{isClient ? currentTime : 'Loading...'}</p>

              {/* Camera Section */}
              <div className="mb-3 sm:mb-4 md:mb-6 flex flex-col items-center">
                <div className="relative tablet-camera-container mobile-camera-container w-full max-w-sm mx-auto">
                  <div className="aspect-video bg-white/10 rounded-lg overflow-hidden border-2 border-white/20 mb-2 sm:mb-3 md:mb-4">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
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
                    <AlertTriangle className="h-3 sm:h-4 w-3 sm:w-4 flex-shrink-0" />
                    {state.error}
                  </p>
                </div>
              )}

              {state.success && (
                <div className="mb-3 sm:mb-4 md:mb-6 bg-green-500/20 border border-green-300/30 rounded-lg p-2 sm:p-3">
                  <p className="text-green-100 text-xs sm:text-sm flex items-center gap-2">
                    <CheckCircle className="h-3 sm:h-4 w-3 sm:w-4 flex-shrink-0" />
                    {state.success}
                  </p>
                </div>
              )}

              {/* Lockout Info */}
              {state.lockoutInfo?.isLocked && (
                <div className="mb-3 sm:mb-4 md:mb-6 bg-red-500/20 border border-red-300/30 rounded-lg p-2 sm:p-3">
                  <p className="text-red-100 text-xs sm:text-sm flex items-center gap-2">
                    <Lock className="h-3 sm:h-4 w-3 sm:w-4 flex-shrink-0" />
                    Account locked due to failed attempts. Please wait {formatLockoutTime(state.lockoutInfo.timeRemaining)} before trying again.
                  </p>
                </div>
              )}

              {/* PIN Entry Section */}
              <div className="mb-3 sm:mb-4 md:mb-6">
                <div className="text-center">
                  <label className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 block text-green-100">Enter Your 6-Digit PIN</label>

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
                  {[[1, 2, 3], [4, 5, 6], [7, 8, 9]].map((row, i) => (
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
                  onClick={() => handleClockInOut(false)}
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
