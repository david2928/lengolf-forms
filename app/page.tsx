'use client'

import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Clock } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  return (
    <div className="container mx-auto py-6 md:py-10">
      <div className="flex flex-col items-center gap-6 md:gap-8">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold">LENGOLF Forms System</h1>
          <p className="text-muted-foreground mt-2">
            Select a form to get started
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6 w-full max-w-4xl">
          <Card className="cursor-pointer transition-all hover:shadow-lg" 
                onClick={() => router.push('/create-package')}>
            <CardHeader className="text-center space-y-2 md:space-y-3 py-4 md:py-6">
              <FileSpreadsheet className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-1 md:mb-2 text-primary" />
              <CardTitle className="text-lg md:text-xl">Create Package</CardTitle>
              <CardDescription className="text-sm">
                Create new packages for customers
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4 md:pb-6">
              <Button className="w-full" variant="secondary">
                Create Package
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-all hover:shadow-lg"
                onClick={() => router.push('/update-package')}>
            <CardHeader className="text-center space-y-2 md:space-y-3 py-4 md:py-6">
              <Clock className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-1 md:mb-2 text-primary" />
              <CardTitle className="text-lg md:text-xl">Update Package Usage</CardTitle>
              <CardDescription className="text-sm">
                Record package usage for customers
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4 md:pb-6">
              <Button className="w-full" variant="secondary">
                Update Package
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}