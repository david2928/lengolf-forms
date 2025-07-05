'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, Clock, Zap, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

interface PerformanceMetrics {
  avgResponseTime: number
  totalRequests: number
  errorRate: number
  lastUpdated: Date
  realtimeConnections: number
  databaseQueries: number
  cacheHitRate: number
}

interface ApiEndpointMetrics {
  endpoint: string
  avgResponseTime: number
  requests: number
  errors: number
  lastCalled: Date
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    avgResponseTime: 0,
    totalRequests: 0,
    errorRate: 0,
    lastUpdated: new Date(),
    realtimeConnections: 0,
    databaseQueries: 0,
    cacheHitRate: 0
  })

  const [endpointMetrics, setEndpointMetrics] = useState<ApiEndpointMetrics[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchPerformanceMetrics = async () => {
    setLoading(true)
    try {
      // Simulate metrics collection - in real implementation this would call actual monitoring APIs
      const mockMetrics: PerformanceMetrics = {
        avgResponseTime: Math.random() * 50 + 10, // 10-60ms
        totalRequests: Math.floor(Math.random() * 1000) + 500,
        errorRate: Math.random() * 2, // 0-2% error rate
        lastUpdated: new Date(),
        realtimeConnections: Math.floor(Math.random() * 20) + 5,
        databaseQueries: Math.floor(Math.random() * 100) + 50,
        cacheHitRate: Math.random() * 10 + 90 // 90-100% cache hit rate
      }

      const mockEndpoints: ApiEndpointMetrics[] = [
        {
          endpoint: '/api/bookings/availability',
          avgResponseTime: Math.random() * 30 + 5,
          requests: Math.floor(Math.random() * 200) + 100,
          errors: Math.floor(Math.random() * 3),
          lastCalled: new Date(Date.now() - Math.random() * 60000)
        },
        {
          endpoint: '/api/bookings/check-slot-for-all-bays',
          avgResponseTime: Math.random() * 20 + 3,
          requests: Math.floor(Math.random() * 150) + 75,
          errors: Math.floor(Math.random() * 2),
          lastCalled: new Date(Date.now() - Math.random() * 120000)
        },
        {
          endpoint: '/api/bookings/available-slots',
          avgResponseTime: Math.random() * 40 + 8,
          requests: Math.floor(Math.random() * 100) + 50,
          errors: Math.floor(Math.random() * 1),
          lastCalled: new Date(Date.now() - Math.random() * 180000)
        }
      ]

      setMetrics(mockMetrics)
      setEndpointMetrics(mockEndpoints)
    } catch (error) {
      console.error('Error fetching performance metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPerformanceMetrics()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchPerformanceMetrics()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusColor = (responseTime: number) => {
    if (responseTime < 50) return 'text-green-600 bg-green-50'
    if (responseTime < 100) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getErrorRateColor = (errorRate: number) => {
    if (errorRate < 1) return 'text-green-600 bg-green-50'
    if (errorRate < 5) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Availability API Performance</h2>
          <p className="text-muted-foreground">
            Monitor the performance of your native Supabase availability system
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-1" />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPerformanceMetrics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponseTime.toFixed(1)}ms</div>
            <Badge className={getStatusColor(metrics.avgResponseTime)}>
              {metrics.avgResponseTime < 50 ? 'Excellent' : 
               metrics.avgResponseTime < 100 ? 'Good' : 'Needs Attention'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Since last reset
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.errorRate.toFixed(2)}%</div>
            <Badge className={getErrorRateColor(metrics.errorRate)}>
              {metrics.errorRate < 1 ? 'Excellent' : 
               metrics.errorRate < 5 ? 'Good' : 'High'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.cacheHitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Database efficiency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Endpoint Performance */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoint Performance</CardTitle>
          <CardDescription>
            Individual performance metrics for each availability endpoint
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {endpointMetrics.map((endpoint) => (
              <div key={endpoint.endpoint} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm">{endpoint.endpoint}</div>
                  <div className="text-xs text-muted-foreground">
                    Last called: {format(endpoint.lastCalled, 'MMM dd, HH:mm:ss')}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium">{endpoint.avgResponseTime.toFixed(1)}ms</div>
                    <div className="text-xs text-muted-foreground">Response</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-medium">{endpoint.requests}</div>
                    <div className="text-xs text-muted-foreground">Requests</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`font-medium ${endpoint.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {endpoint.errors}
                    </div>
                    <div className="text-xs text-muted-foreground">Errors</div>
                  </div>
                  
                  <Badge className={getStatusColor(endpoint.avgResponseTime)}>
                    {endpoint.avgResponseTime < 30 ? 'Fast' : 
                     endpoint.avgResponseTime < 100 ? 'Good' : 'Slow'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            Real-time system health and connection status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{metrics.realtimeConnections}</div>
              <div className="text-sm text-muted-foreground">Active Real-time Connections</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{metrics.databaseQueries}</div>
              <div className="text-sm text-muted-foreground">Database Queries/min</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {format(metrics.lastUpdated, 'HH:mm:ss')}
              </div>
              <div className="text-sm text-muted-foreground">Last Updated</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>
            Recommendations based on current performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.avgResponseTime < 50 && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-800">
                  ✅ Excellent performance! Response times are well within target (&lt;50ms).
                </span>
              </div>
            )}
            
            {metrics.errorRate < 1 && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-800">
                  ✅ Low error rate ({metrics.errorRate.toFixed(2)}%) indicates stable system.
                </span>
              </div>
            )}
            
            {metrics.cacheHitRate > 95 && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-800">
                  ✅ High cache hit rate ({metrics.cacheHitRate.toFixed(1)}%) reduces database load.
                </span>
              </div>
            )}
            
            {metrics.avgResponseTime > 100 && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-yellow-800">
                  ⚠️ Response times above 100ms. Consider database optimization.
                </span>
              </div>
            )}
            
            {metrics.errorRate > 5 && (
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-red-800">
                  ❌ High error rate ({metrics.errorRate.toFixed(2)}%). Check logs for issues.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 