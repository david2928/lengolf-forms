'use client'

import { Button } from "@/components/ui/button"
import { RefreshCw, FileText, Clock, CalendarRange } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function Home() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  async function refreshCustomers() {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/crm/update-customers', {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to refresh customers')
      }
    } catch (error) {
      console.error('Error refreshing customers:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="container max-w-6xl py-6 space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">LENGOLF Forms System</h1>
        <p className="text-muted-foreground">Select a form to get started</p>
      </div>

      {/* Update Customer Data */}
      <Button
        variant="outline"
        className="w-full py-8 h-auto"
        onClick={refreshCustomers}
        disabled={isRefreshing}
      >
        <RefreshCw className={`mr-2 h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        <div className="flex flex-col items-start">
          <span className="text-lg font-semibold">Update Customer Data</span>
          <span className="text-sm text-muted-foreground">Click to refresh customer list</span>
        </div>
      </Button>

      {/* Forms Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Create Package */}
        <div className="flex flex-col space-y-4 p-6 border rounded-lg">
          <FileText className="h-12 w-12 mx-auto" />
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold">Create Package</h2>
            <p className="text-sm text-muted-foreground">Create new packages for customers</p>
          </div>
          <Link href="/create-package" className="mt-auto">
            <Button className="w-full" variant="secondary">Create Package</Button>
          </Link>
        </div>

        {/* Update Package Usage */}
        <div className="flex flex-col space-y-4 p-6 border rounded-lg">
          <Clock className="h-12 w-12 mx-auto" />
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold">Update Package Usage</h2>
            <p className="text-sm text-muted-foreground">Record package usage for customers</p>
          </div>
          <Link href="/update-package" className="mt-auto">
            <Button className="w-full" variant="secondary">Update Package</Button>
          </Link>
        </div>

        {/* Create Booking */}
        <div className="flex flex-col space-y-4 p-6 border rounded-lg">
          <CalendarRange className="h-12 w-12 mx-auto" />
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold">Create Booking</h2>
            <p className="text-sm text-muted-foreground">Book bays and manage appointments</p>
          </div>
          <Link href="/create-booking" className="mt-auto">
            <Button className="w-full" variant="secondary">Create Booking</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}