'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, RefreshCw } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface Settings {
  default_wht_rate: string
  lengolf_name: string
  lengolf_address_line1: string
  lengolf_address_line2: string
  lengolf_tax_id: string
  bank_name: string
  bank_account_number: string
}

export function SettingsTab() {
  const [settings, setSettings] = useState<Settings>({
    default_wht_rate: '3.00',
    lengolf_name: 'LENGOLF CO. LTD.',
    lengolf_address_line1: '540 Mercury Tower, 4th Floor, Unit 407 Ploenchit Road',
    lengolf_address_line2: 'Lumpini, Pathumwan, Bangkok 10330',
    lengolf_tax_id: '105566207013',
    bank_name: '',
    bank_account_number: ''
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/invoices/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load settings',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/invoices/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Settings saved successfully',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.message || 'Failed to save settings',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    fetchSettings()
    toast({
      title: 'Settings Reset',
      description: 'Settings have been reset to saved values',
    })
  }

  const updateSetting = (key: keyof Settings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
        Loading settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lengolf_name">Company Name</Label>
              <Input
                id="lengolf_name"
                value={settings.lengolf_name}
                onChange={(e) => updateSetting('lengolf_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lengolf_tax_id">Tax ID</Label>
              <Input
                id="lengolf_tax_id"
                value={settings.lengolf_tax_id}
                onChange={(e) => updateSetting('lengolf_tax_id', e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lengolf_address_line1">Address Line 1</Label>
            <Input
              id="lengolf_address_line1"
              value={settings.lengolf_address_line1}
              onChange={(e) => updateSetting('lengolf_address_line1', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lengolf_address_line2">Address Line 2</Label>
            <Input
              id="lengolf_address_line2"
              value={settings.lengolf_address_line2}
              onChange={(e) => updateSetting('lengolf_address_line2', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tax Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default_wht_rate">Default WHT Tax Rate (%)</Label>
            <Input
              id="default_wht_rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={settings.default_wht_rate}
              onChange={(e) => updateSetting('default_wht_rate', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              This rate will be used as the default for new invoices. Withholding Tax (WHT) is deducted from the subtotal.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Banking Information */}
      <Card>
        <CardHeader>
          <CardTitle>Banking Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                value={settings.bank_name}
                onChange={(e) => updateSetting('bank_name', e.target.value)}
                placeholder="e.g., Siam Commercial Bank"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_account_number">Account Number</Label>
              <Input
                id="bank_account_number"
                value={settings.bank_account_number}
                onChange={(e) => updateSetting('bank_account_number', e.target.value)}
                placeholder="e.g., 123-456-7890"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Banking information will be displayed on invoices if provided.
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={handleReset} disabled={isSaving}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 