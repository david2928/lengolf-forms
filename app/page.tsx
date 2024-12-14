'use client'

import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Clock } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">LENGOLF Forms System</h1>
          <p className="text-muted-foreground mt-2">
            Select a form to get started
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
          <Card className="cursor-pointer transition-all hover:shadow-lg" 
                onClick={() => router.push('/create-package')}>
            <CardHeader className="text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-primary" />
              <CardTitle>Create Package</CardTitle>
              <CardDescription>
                Create new packages for customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary">
                Create Package
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-all hover:shadow-lg"
                onClick={() => router.push('/update-package')}>
            <CardHeader className="text-center">
              <Clock className="w-12 h-12 mx-auto mb-2 text-primary" />
              <CardTitle>Update Package Usage</CardTitle>
              <CardDescription>
                Record package usage for customers
              </CardDescription>
            </CardHeader>
            <CardContent>
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