'use client'

import { useCallback } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { Upload, X, FileText, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ALLOWED_RECEIPT_TYPES, MAX_RECEIPT_FILE_SIZE } from '@/types/vendor-receipts'

interface ReceiptFileUploadProps {
  file: File | null
  onFileChange: (file: File | null) => void
  error?: string
  onError: (error: string) => void
}

export function ReceiptFileUpload({ file, onFileChange, error, onError }: ReceiptFileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles
          .map((r) => r.errors.map((e) => e.message).join(', '))
          .join('; ')
        onError(`File rejected: ${errors}`)
        return
      }
      if (acceptedFiles.length > 0) {
        onError('')
        onFileChange(acceptedFiles[0])
      }
    },
    [onFileChange, onError]
  )

  const acceptMap: Record<string, string[]> = {}
  ALLOWED_RECEIPT_TYPES.forEach((type) => {
    if (type === 'image/jpeg') acceptMap[type] = ['.jpg', '.jpeg']
    else if (type === 'image/png') acceptMap[type] = ['.png']
    else if (type === 'image/webp') acceptMap[type] = ['.webp']
    else if (type === 'image/heic') acceptMap[type] = ['.heic']
    else if (type === 'application/pdf') acceptMap[type] = ['.pdf']
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptMap,
    maxSize: MAX_RECEIPT_FILE_SIZE,
    maxFiles: 1,
    multiple: false,
  })

  if (file) {
    const isImage = file.type.startsWith('image/')
    const sizeKB = (file.size / 1024).toFixed(0)

    return (
      <div className="flex items-center gap-3 rounded-lg border p-3 bg-green-50 border-green-200">
        {isImage ? (
          <ImageIcon className="h-5 w-5 text-green-600 shrink-0" />
        ) : (
          <FileText className="h-5 w-5 text-green-600 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{sizeKB} KB</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onFileChange(null)}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${error ? 'border-red-300' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <Upload
            className={`h-8 w-8 mx-auto ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`}
          />
          <p className="text-sm font-medium text-gray-900">
            {isDragActive ? 'Drop the file here' : 'Drop receipt here'}
          </p>
          <p className="text-xs text-gray-500">
            or <span className="text-blue-600 font-medium">click to browse</span> &middot; Images
            or PDF &middot; Max 10MB
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  )
}
