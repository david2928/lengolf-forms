'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SuppliersTab } from '@/components/admin/invoices/suppliers-tab'
import { CreateInvoiceTab } from '@/components/admin/invoices/create-invoice-tab'
import { InvoiceHistoryTab } from '@/components/admin/invoices/invoice-history-tab'
import { SettingsTab } from '@/components/admin/invoices/settings-tab'
import { FileText, Users, Plus, History, Settings } from 'lucide-react'

export default function InvoiceManagementPage() {
  const [activeTab, setActiveTab] = useState('create')

  return (
    <div className="container max-w-7xl py-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Invoice Management</h1>
          <p className="text-muted-foreground">
            Generate and manage invoices for LENGOLF suppliers and services
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Invoice
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Invoice History
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Invoice</CardTitle>
              <CardDescription>
                Generate a professional invoice for suppliers or service providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateInvoiceTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Management</CardTitle>
              <CardDescription>
                Manage supplier information and default invoice settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SuppliersTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>
                View and manage previously generated invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceHistoryTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Settings</CardTitle>
              <CardDescription>
                Configure default values and company information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 