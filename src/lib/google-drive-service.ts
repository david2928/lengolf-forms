import { google, type drive_v3 } from 'googleapis'
import { Readable } from 'stream'

const SCOPES = ['https://www.googleapis.com/auth/drive.file']

// Cache Drive service across warm invocations to reuse auth tokens
let cachedDriveService: drive_v3.Drive | null = null

// Cache folder IDs to avoid repeated lookups (key: "parentId/folderName")
const folderIdCache = new Map<string, string>()

function getDriveService() {
  if (cachedDriveService) return cachedDriveService

  // Use dedicated Drive service account (lengolf-operations) which has storage quota
  // Falls back to default service account if Drive-specific vars aren't set
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = (process.env.GOOGLE_DRIVE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n')

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: SCOPES,
  })

  cachedDriveService = google.drive({ version: 'v3', auth })
  return cachedDriveService
}

/**
 * Find a subfolder by name within a parent, or create it if it doesn't exist.
 */
async function findOrCreateFolder(
  drive: drive_v3.Drive,
  parentId: string,
  folderName: string
): Promise<string> {
  const cacheKey = `${parentId}/${folderName}`
  const cached = folderIdCache.get(cacheKey)
  if (cached) return cached

  const query = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const response = await drive.files.list({
    q: query,
    spaces: 'drive',
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  const folders = response.data.files || []
  if (folders.length > 0 && folders[0].id) {
    folderIdCache.set(cacheKey, folders[0].id)
    return folders[0].id
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  })

  if (!folder.data.id) {
    throw new Error(`Failed to create folder '${folderName}'`)
  }

  folderIdCache.set(cacheKey, folder.data.id)
  return folder.data.id
}

/**
 * Get a viewable Google Drive link for a file.
 */
export function getViewableLink(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`
}

/**
 * Extract a file ID from a Google Drive URL.
 */
export function extractFileIdFromUrl(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

interface UploadResult {
  fileId: string
  fileUrl: string
  fileName: string
}

/**
 * Upload a file buffer to Google Drive under the receipts folder.
 * Organizes into {ROOT}/YYYY/MM/{filename}
 */
export async function uploadReceiptToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  receiptDate?: Date
): Promise<UploadResult> {
  const rootFolderId = process.env.GOOGLE_DRIVE_RECEIPTS_FOLDER_ID
  if (!rootFolderId) {
    throw new Error('GOOGLE_DRIVE_RECEIPTS_FOLDER_ID environment variable is not set')
  }

  const drive = getDriveService()

  const date = receiptDate || new Date()
  const year = date.getFullYear().toString()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')

  const yearFolderId = await findOrCreateFolder(drive, rootFolderId, year)
  const monthFolderId = await findOrCreateFolder(drive, yearFolderId, month)

  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [monthFolderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name',
    supportsAllDrives: true,
  })

  if (!file.data.id) {
    throw new Error('Upload succeeded but no file ID returned')
  }

  return {
    fileId: file.data.id,
    fileUrl: getViewableLink(file.data.id),
    fileName: file.data.name || fileName,
  }
}

// Expense tracker document folder IDs
const EXPENSE_VAT_FOLDER_ID = '1P26lgV5zf4qPZaTqyxb64IBCoBAcBoWQ'
const EXPENSE_WHT_FOLDER_ID = '1u6xYq8F9iIh3rX0Xvus5HYivDWpudha3'

/**
 * Upload an expense document (invoice/receipt) to Google Drive.
 * Routes to VAT or WHT folder based on document type.
 * Naming convention: YYYYMMDD_VENDOR_NAME.ext
 */
export async function uploadExpenseDocument(
  buffer: Buffer,
  mimeType: string,
  options: {
    paymentDate: string // YYYY-MM-DD
    vendorName: string
    documentType: 'vat' | 'wht'
    originalFileName?: string
  }
): Promise<UploadResult> {
  const drive = getDriveService()

  const folderId = options.documentType === 'wht'
    ? EXPENSE_WHT_FOLDER_ID
    : EXPENSE_VAT_FOLDER_ID

  // Build filename: YYYYMMDD_VENDOR_NAME.ext
  const dateStr = options.paymentDate.replace(/-/g, '')
  const cleanVendor = options.vendorName.replace(/[^a-zA-Z0-9\u0E00-\u0E7F _-]/g, '').replace(/\s+/g, '_')
  const ext = options.originalFileName?.match(/\.([a-zA-Z0-9]+)$/)?.[1] || (mimeType === 'application/pdf' ? 'pdf' : 'jpg')
  const fileName = `${dateStr}_${cleanVendor}.${ext}`

  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name',
    supportsAllDrives: true,
  })

  if (!file.data.id) {
    throw new Error('Upload succeeded but no file ID returned')
  }

  return {
    fileId: file.data.id,
    fileUrl: getViewableLink(file.data.id),
    fileName: file.data.name || fileName,
  }
}

/**
 * Download a file from Google Drive by its file ID.
 * Returns the file buffer and mime type.
 */
export async function downloadFileFromDrive(fileId: string): Promise<{ buffer: Buffer; mimeType: string; name: string }> {
  const drive = getDriveService()

  // Get file metadata first
  const meta = await drive.files.get({
    fileId,
    fields: 'name, mimeType',
    supportsAllDrives: true,
  })

  const mimeType = meta.data.mimeType || 'application/octet-stream'
  const name = meta.data.name || 'file'

  // Download file content
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  )

  const buffer = Buffer.from(response.data as ArrayBuffer)
  return { buffer, mimeType, name }
}

/**
 * Delete a file from Google Drive by its file ID.
 */
/**
 * Upload a cash transaction receipt to Google Drive.
 * Flat folder structure. Naming: YYYYMMDD_spending_type_xxxx.ext
 */
export async function uploadCashTransactionReceipt(
  buffer: Buffer,
  mimeType: string,
  options: {
    transactionDate: string // YYYY-MM-DD
    spendingType: string
    originalFileName?: string
  }
): Promise<UploadResult> {
  const folderId = process.env.GOOGLE_DRIVE_CASH_TRANSACTIONS_FOLDER_ID
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_CASH_TRANSACTIONS_FOLDER_ID environment variable is not set')
  }

  const drive = getDriveService()

  // Build filename: YYYYMMDD_spending_type_xxxx.ext
  const dateStr = options.transactionDate.replace(/-/g, '')
  const cleanType = options.spendingType
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/\s+/g, '_')
  const suffix = Math.random().toString(36).substring(2, 6)
  const ext = options.originalFileName?.match(/\.([a-zA-Z0-9]+)$/)?.[1] || (mimeType === 'application/pdf' ? 'pdf' : 'jpg')
  const fileName = `${dateStr}_${cleanType}_${suffix}.${ext}`

  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name',
    supportsAllDrives: true,
  })

  if (!file.data.id) {
    throw new Error('Upload succeeded but no file ID returned')
  }

  return {
    fileId: file.data.id,
    fileUrl: getViewableLink(file.data.id),
    fileName: file.data.name || fileName,
  }
}

export async function deleteFileFromDrive(fileId: string): Promise<boolean> {
  try {
    const drive = getDriveService()
    await drive.files.delete({ fileId, supportsAllDrives: true })
    return true
  } catch (error: any) {
    if (error?.code === 404) {
      return true // Already deleted
    }
    console.error('Error deleting file from Drive:', error)
    return false
  }
}
