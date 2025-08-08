import React, { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Eye, Loader2, Camera } from 'lucide-react'
import { format } from 'date-fns'
import { TimeEntry } from '../context/TimeClockProvider'
import { useTimeClockContext } from '../context/TimeClockProvider'

interface PhotoDialogProps {
  entry: TimeEntry
}

export const PhotoDialog: React.FC<PhotoDialogProps> = ({ entry }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const { loadPhotoUrl, getCachedPhotoUrl } = useTimeClockContext()

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open)
    
    if (open && entry.photo_url && !photoUrl) {
      // Check if we have cached URL first
      const cachedUrl = getCachedPhotoUrl(entry.photo_url)
      if (cachedUrl) {
        setPhotoUrl(cachedUrl)
        return
      }

      setIsLoading(true)
      setError(null)
      
      try {
        const url = await loadPhotoUrl(entry.photo_url)
        if (url) {
          setPhotoUrl(url)
        } else {
          setError('Failed to load photo URL')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(`Error loading photo: ${errorMessage}`)
        console.error('Error loading photo:', err)
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 px-3 hover:bg-blue-50 text-blue-600 border-blue-200"
          title="View Time Entry Photo"
        >
          <Eye className="h-3 w-3 mr-1" />
          View Photo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Time Clock Photo</DialogTitle>
          <DialogDescription>
            {entry.staff_name} - {entry.action === 'clock_in' ? 'Clock In' : 'Clock Out'} 
            on {format(new Date(entry.timestamp), 'MMM dd, yyyy at h:mm a')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          {isLoading ? (
            <div className="text-center p-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <div className="text-muted-foreground">Loading photo...</div>
            </div>
          ) : error ? (
            <div className="text-center p-8 border rounded-lg bg-gray-50">
              <div className="text-gray-500 mb-2">
                <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Failed to load photo
              </div>
              <div className="text-xs text-gray-400 mb-2">{error}</div>
              <div className="text-xs text-gray-400 font-mono">
                Path: {entry.photo_url}
              </div>
            </div>
          ) : photoUrl ? (
            <Image 
              src={photoUrl} 
              alt="Time clock photo"
              width={400}
              height={400}
              className="max-w-full h-auto rounded-lg border"
              style={{ maxHeight: '400px' }}
              onError={() => {
                setError('Image failed to load')
              }}
            />
          ) : (
            <div className="text-center p-8 border rounded-lg bg-gray-50">
              <div className="text-gray-500 mb-2">
                <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No photo available
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}