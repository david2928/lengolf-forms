import { Metadata } from 'next'
import { USOpenForm } from '@/components/us-open-form'

export const metadata: Metadata = {
  title: 'US Open Score Submission | LENGOLF',
  description: 'Submit US Open golf scores',
}

export default function USOpenPage() {
  return (
    <div className="w-full py-6">
      <div className="px-4 sm:px-0 text-center mb-8">
        <h1 className="text-2xl font-bold">US Open Score Submission</h1>
        <p className="text-muted-foreground">
          Submit golf scores and screenshots for the US Open tournament
        </p>
      </div>
      
      <USOpenForm />
    </div>
  )
} 