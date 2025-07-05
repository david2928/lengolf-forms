export interface USOpenScore {
  id?: number
  employee: string
  date: string
  customer_id: number
  stableford_score: number
  stroke_score: number
  stableford_screenshot_url: string
  stroke_screenshot_url: string
  created_at?: string
  updated_at?: string
}

export interface USOpenFormData {
  employee: string
  date: Date | undefined
  customerId: string
  stablefordScore: string
  strokeScore: string
  stablefordScreenshot: File | null
  strokeScreenshot: File | null
}

export interface USOpenSubmission {
  employee: string
  date: string
  customer_id: number
  stableford_score: number
  stroke_score: number
  stableford_screenshot_url: string
  stroke_screenshot_url: string
} 