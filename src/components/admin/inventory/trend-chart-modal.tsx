'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AdminInventoryProductWithStatus, ProductTrendData } from '@/types/inventory'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertCircle, Calendar } from 'lucide-react'

interface TrendChartModalProps {
  product: AdminInventoryProductWithStatus
  isOpen: boolean
  onClose: () => void
}

export function TrendChartModal({ product, isOpen, onClose }: TrendChartModalProps) {
  const [trendData, setTrendData] = useState<ProductTrendData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCashProduct = product.name.toLowerCase().includes('cash')
  
  const formatCashAmount = (amount: number) => {
    return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDisplayAmount = (amount: number) => {
    if (isCashProduct) {
      return formatCashAmount(amount)
    }
    return `${amount} ${product.unit || ''}`
  }

  const fetchTrendData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/inventory/trends/${product.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch trend data: ${errorText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setTrendData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch trend data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trend data')
    } finally {
      setIsLoading(false)
    }
  }, [product.id])

  useEffect(() => {
    if (isOpen && product.id) {
      fetchTrendData()
    }
  }, [isOpen, product.id, fetchTrendData])

  const getTrendDirection = () => {
    if (!trendData?.trend_data || trendData.trend_data.length < 2) return 'stable'
    
    const data = trendData.trend_data
    const firstValue = data[0].value
    const lastValue = data[data.length - 1].value
    
    if (lastValue > firstValue * 1.1) return 'up'
    if (lastValue < firstValue * 0.9) return 'down'
    return 'stable'
  }

  const getTrendIcon = () => {
    const direction = getTrendDirection()
    switch (direction) {
      case 'up':
        return { icon: TrendingUp, color: 'text-green-600', label: 'Increasing' }
      case 'down':
        return { icon: TrendingDown, color: 'text-red-600', label: 'Decreasing' }
      default:
        return { icon: Minus, color: 'text-gray-600', label: 'Stable' }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatTooltipDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-md">
          <p className="font-medium">{formatTooltipDate(label)}</p>
          <p className="text-sm text-muted-foreground">
            Submitted by: {data.staff}
          </p>
          <p className="text-sm">
            <span className="font-medium">{formatDisplayAmount(payload[0].value)}</span>
          </p>
        </div>
      )
    }
    return null
  }

  const trendIcon = getTrendIcon()
  const TrendIconComponent = trendIcon.icon

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            14-Day Usage Trend: {product.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Stock & Trend Info */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">
                {isCashProduct ? 'Current Cash Amount' : 'Current Stock Level'}
              </p>
              <p className="text-2xl font-bold">
                {formatDisplayAmount(product.current_stock || 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Trend Direction</p>
              <div className="flex items-center gap-2 mt-1">
                <TrendIconComponent className={`h-5 w-5 ${trendIcon.color}`} />
                <span className={`font-medium ${trendIcon.color}`}>
                  {trendIcon.label}
                </span>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="border rounded-lg p-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : !trendData?.trend_data || trendData.trend_data.length === 0 ? (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  No trend data available for the last 14 days. Trend charts are only available for products with numerical submissions.
                </AlertDescription>
              </Alert>
            ) : (
              <div>
                <h4 className="font-medium mb-4">
                  Usage Over Last 14 Days ({trendData.trend_data.length} submissions)
                </h4>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <LineChart data={trendData.trend_data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDate}
                        fontSize={12}
                      />
                      <YAxis 
                        fontSize={12}
                        label={{ 
                          value: isCashProduct ? 'Amount (THB)' : (product.unit || 'Quantity'), 
                          angle: -90, 
                          position: 'insideLeft' 
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Retry Button for Errors */}
          {error && (
            <div className="flex justify-center">
              <Button onClick={fetchTrendData} disabled={isLoading}>
                Try Again
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 