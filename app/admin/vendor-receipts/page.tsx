'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReceiptsTab } from '@/components/admin/vendor-receipts/ReceiptsTab'
import { VendorsTab } from '@/components/admin/vendor-receipts/VendorsTab'
import { Receipt, Users } from 'lucide-react'

export default function AdminVendorReceiptsPage() {
  const [activeTab, setActiveTab] = useState('receipts')

  return (
    <div className="container max-w-7xl py-6">
      <div className="flex items-center gap-3 mb-6">
        <Receipt className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground">
            View uploaded vendor receipts and manage vendors
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Receipts
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Vendors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receipts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Receipt History</CardTitle>
              <CardDescription>
                All uploaded vendor receipts with filters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReceiptsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Directory</CardTitle>
              <CardDescription>
                Manage vendor information and categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VendorsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
