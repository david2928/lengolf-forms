'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { CalendarIcon, Upload, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

import { EmployeeSelector } from '@/components/booking-form/employee-selector'
import { CustomerSearch } from '@/components/package-form/customer-search'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCustomers } from '@/hooks/use-customers'

interface USOpenFormData {
  employee: string
  date: Date | undefined
  customerId: string
  stablefordScore: string
  strokeScore: string
  stablefordScreenshot: File | null
  strokeScreenshot: File | null
}

interface USOpenSubmission {
  employee: string
  date: string
  customer_id: number
  stableford_score: number
  stroke_score: number
  stableford_screenshot_url: string
  stroke_screenshot_url: string
}

interface SimpleCustomer {
  id: number
  customer_name: string
  contact_number: string | null
}

// Image compression utility
const compressImage = (file: File, maxSizeKB: number = 500): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img
      const maxDimension = 1920 // Maximum width or height
      
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width
        width = maxDimension
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height
        height = maxDimension
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      
      const compress = (quality: number) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const sizeKB = blob.size / 1024
            if (sizeKB <= maxSizeKB || quality <= 0.1) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              // Reduce quality and try again
              compress(quality - 0.1)
            }
          }
        }, 'image/jpeg', quality)
      }

      compress(0.8) // Start with 80% quality
    }

    img.src = URL.createObjectURL(file)
  })
}

export function USOpenForm() {
  const router = useRouter()
  const { customers = [], isLoading: loadingCustomers } = useCustomers()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [stablefordFile, setStablefordFile] = useState<File | null>(null)
  const [strokeFile, setStrokeFile] = useState<File | null>(null)
  const [isCompressing, setIsCompressing] = useState({ stableford: false, stroke: false })

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<USOpenFormData>({
    defaultValues: {
      employee: '',
      date: undefined,
      customerId: '',
      stablefordScore: '',
      strokeScore: '',
      stablefordScreenshot: null,
      strokeScreenshot: null
    }
  })

  const watchedEmployee = watch('employee')
  const watchedDate = watch('date')

  // Map customers to the format expected by CustomerSearch component
  const mappedCustomers: SimpleCustomer[] = customers.map((customer) => ({
    id: parseInt(customer.id),
    customer_name: customer.customer_name,
    contact_number: customer.contact_number
  }))

  const getSelectedCustomerDisplay = () => {
    if (!selectedCustomerId) return 'Select customer'
    const customer = mappedCustomers.find((c: SimpleCustomer) => c.id.toString() === selectedCustomerId)
    if (!customer) return 'Select customer'
    return customer.contact_number 
      ? `${customer.customer_name} (${customer.contact_number})`
      : customer.customer_name
  }

  const handleCustomerSelection = (customer: SimpleCustomer) => {
    setSelectedCustomerId(customer.id.toString())
    setValue('customerId', customer.id.toString())
  }

  const handleFileUpload = async (file: File, scoreType: 'stableford' | 'stroke'): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('scoreType', scoreType)

    const response = await fetch('/api/special-events/us-open/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to upload screenshot')
    }

    const data = await response.json()
    return data.url
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'stableford' | 'stroke') => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      })
      return
    }

    // Check initial file size
    const fileSizeKB = file.size / 1024
    let processedFile = file

    if (fileSizeKB > 500) {
      try {
        setIsCompressing(prev => ({ ...prev, [type]: true }))
        processedFile = await compressImage(file, 500)
        const newSizeKB = processedFile.size / 1024
        
        toast({
          title: "Image Compressed",
          description: `File size reduced from ${fileSizeKB.toFixed(0)}KB to ${newSizeKB.toFixed(0)}KB`,
        })
      } catch (error) {
        toast({
          title: "Compression Error",
          description: "Failed to compress image. Please try a smaller file.",
          variant: "destructive"
        })
        return
      } finally {
        setIsCompressing(prev => ({ ...prev, [type]: false }))
      }
    }

    if (type === 'stableford') {
      setStablefordFile(processedFile)
    } else {
      setStrokeFile(processedFile)
    }
  }

  const onSubmit = async (data: USOpenFormData) => {
    try {
      setIsSubmitting(true)

      if (!data.employee) {
        toast({
          title: "Error",
          description: "Please select an employee",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }

      if (!data.date) {
        toast({
          title: "Error",
          description: "Please select a date",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }

      if (!selectedCustomerId) {
        toast({
          title: "Error", 
          description: "Please select a customer",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }

      if (!stablefordFile || !strokeFile) {
        toast({
          title: "Error",
          description: "Please upload both screenshot files",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }

      // Upload screenshots
      const [stablefordUrl, strokeUrl] = await Promise.all([
        handleFileUpload(stablefordFile, 'stableford'),
        handleFileUpload(strokeFile, 'stroke')
      ])

      // Submit form data
      const submission: USOpenSubmission = {
        employee: data.employee,
        date: format(data.date, 'yyyy-MM-dd'),
        customer_id: parseInt(selectedCustomerId),
        stableford_score: parseInt(data.stablefordScore),
        stroke_score: parseInt(data.strokeScore),
        stableford_screenshot_url: stablefordUrl,
        stroke_screenshot_url: strokeUrl
      }

      const response = await fetch('/api/special-events/us-open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submission)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to submit US Open scores')
      }

      toast({
        title: "Success",
        description: "US Open scores submitted successfully!"
      })

      // Reset form
      reset()
      setSelectedCustomerId('')
      setStablefordFile(null)
      setStrokeFile(null)
      
      // Redirect to main page
      router.push('/')

    } catch (error) {
      console.error('Error submitting US Open scores:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit scores",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      {mappedCustomers.length === 0 && !loadingCustomers && (
        <div className="mb-6 p-4 bg-red-50 border border-red-400 text-red-700 rounded-lg">
          <p>⚠️ No customers available. Please refresh customer data from the main menu.</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Employee Selection */}
        <div>
          <EmployeeSelector
            value={watchedEmployee}
            onChange={(value) => setValue('employee', value)}
            error={errors.employee?.message}
          />
        </div>

        {/* Date Selection */}
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !watchedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {watchedDate ? format(watchedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={watchedDate}
                onSelect={(date) => setValue('date', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.date && (
            <p className="text-sm text-red-500">{errors.date.message}</p>
          )}
        </div>

        {/* Customer Selection */}
        <div className="space-y-2">
          <Label>Customer Name</Label>
          {loadingCustomers ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading customers...</span>
            </div>
          ) : (
            <CustomerSearch
              customers={mappedCustomers}
              selectedCustomerId={selectedCustomerId}
              showCustomerDialog={showCustomerDialog}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onCustomerSelect={handleCustomerSelection}
              onDialogOpenChange={setShowCustomerDialog}
              getSelectedCustomerDisplay={getSelectedCustomerDisplay}
            />
          )}
          {errors.customerId && (
            <p className="text-sm text-red-500">{errors.customerId.message}</p>
          )}
        </div>

        {/* Scores Section */}
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
              <span>🎯</span>
              <span>Golf Scores</span>
            </h3>
            
            <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="stablefordScore">Stableford Score</Label>
                <Input
                  id="stablefordScore"
                  type="number"
                  placeholder="Enter Stableford score"
                  {...register('stablefordScore', {
                    required: 'Stableford score is required',
                    min: { value: 0, message: 'Score must be positive' }
                  })}
                />
                {errors.stablefordScore && (
                  <p className="text-sm text-red-500">{errors.stablefordScore.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="strokeScore">Stroke Score</Label>
                <Input
                  id="strokeScore"
                  type="number"
                  placeholder="Enter Stroke score"
                  {...register('strokeScore', {
                    required: 'Stroke score is required',
                    min: { value: 0, message: 'Score must be positive' }
                  })}
                />
                {errors.strokeScore && (
                  <p className="text-sm text-red-500">{errors.strokeScore.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* File Uploads Section */}
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
              <span>📸</span>
              <span>Score Screenshots</span>
            </h3>
            
            <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="stablefordScreenshot">Screenshot Stableford</Label>
                <div className="space-y-2">
                  <Input
                    id="stablefordScreenshot"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'stableford')}
                  />
                  {isCompressing.stableford && (
                    <p className="text-sm text-blue-600 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Compressing image...
                    </p>
                  )}
                  {stablefordFile && !isCompressing.stableford && (
                    <p className="text-sm text-green-600 flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      <span>File selected:</span>
                      <span className="truncate">{stablefordFile.name}</span>
                      <span className="text-xs">({(stablefordFile.size / 1024).toFixed(0)}KB)</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="strokeScreenshot">Screenshot Stroke</Label>
                <div className="space-y-2">
                  <Input
                    id="strokeScreenshot"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'stroke')}
                  />
                  {isCompressing.stroke && (
                    <p className="text-sm text-blue-600 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Compressing image...
                    </p>
                  )}
                  {strokeFile && !isCompressing.stroke && (
                    <p className="text-sm text-green-600 flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      <span>File selected:</span>
                      <span className="truncate">{strokeFile.name}</span>
                      <span className="text-xs">({(strokeFile.size / 1024).toFixed(0)}KB)</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t">
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || isCompressing.stableford || isCompressing.stroke}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit US Open Scores'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
} 