'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, X, RotateCcw, CameraOff } from 'lucide-react'

interface CameraCaptureProps {
  onCapture: (photoData: string) => void
  onCancel: () => void
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    startCamera()
    return () => {
      // Cleanup camera on component unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop()
        })
        streamRef.current = null
      }
    }
  }, []) // Empty dependency array - only run once on mount

  // Additional cleanup for page navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
        setStream(null)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, []) // Empty dependency array - only run once on mount

  const startCamera = async () => {
    try {
      setError(null)
      setLoading(true)
      
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user'
        },
        audio: false
      })
      
      // Store in both state and ref
      streamRef.current = mediaStream
      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setLoading(false)
    } catch (err) {
      console.error('Camera access error:', err)
      setLoading(false)
      streamRef.current = null
      setStream(null)
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera permissions and try again.')
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.')
        } else {
          setError('Camera not available. Please try again later.')
        }
      } else {
        setError('Camera not available. Please try again later.')
      }
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Use smaller, consistent resolution for photos
    const targetWidth = 320
    const targetHeight = 240

    canvas.width = targetWidth
    canvas.height = targetHeight

    // Draw video to canvas with consistent sizing
    context.drawImage(video, 0, 0, targetWidth, targetHeight)

    // Lower quality for smaller file sizes (50% quality is adequate for identification)
    const photoData = canvas.toDataURL('image/jpeg', 0.5)
    setCapturedPhoto(photoData)
  }

  const confirmPhoto = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto)
    }
  }

  const retakePhoto = () => {
    setCapturedPhoto(null)
  }

  const skipPhoto = () => {
    onCapture('') // Empty string indicates no photo
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <CameraOff className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <div className="flex gap-2">
          <Button onClick={startCamera} variant="outline" className="flex-1">
            <Camera className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={skipPhoto} variant="outline" className="flex-1">
            Skip Photo
          </Button>
          <Button onClick={onCancel} variant="outline">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden">
        {loading && (
          <div className="aspect-video flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">Loading camera...</p>
            </div>
          </div>
        )}
        
        {!capturedPhoto ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full aspect-video object-cover ${loading ? 'hidden' : ''}`}
            onLoadedMetadata={() => setLoading(false)}
          />
        ) : (
          <img
            src={capturedPhoto}
            alt="Captured photo"
            className="w-full aspect-video object-cover"
          />
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex gap-2">
        {!capturedPhoto ? (
          <>
            <Button onClick={onCancel} variant="outline">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={capturePhoto} className="flex-1" disabled={loading}>
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <Button onClick={skipPhoto} variant="outline">
              Skip
            </Button>
          </>
        ) : (
          <>
            <Button onClick={retakePhoto} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button onClick={confirmPhoto} className="flex-1">
              <Camera className="h-4 w-4 mr-2" />
              Use Photo
            </Button>
          </>
        )}
      </div>
    </div>
  )
} 