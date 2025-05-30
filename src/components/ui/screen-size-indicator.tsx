'use client'

import { useState } from 'react'
import { useScreenSize } from '@/hooks/use-screen-size'
import { Monitor, Tablet, Smartphone, Eye, EyeOff, Edit3 } from 'lucide-react'
import { Button } from './button'

export function ScreenSizeIndicator() {
  const screenSize = useScreenSize()
  const [isVisible, setIsVisible] = useState(false)

  const getDeviceIcon = () => {
    switch (screenSize.deviceType) {
      case 'mobile':
        return <Smartphone className="h-3 w-3" />
      case 'tablet':
        return <Tablet className="h-3 w-3" />
      case 'desktop':
        return <Monitor className="h-3 w-3" />
      default:
        return <Monitor className="h-3 w-3" />
    }
  }

  const getDeviceColor = () => {
    switch (screenSize.deviceType) {
      case 'mobile':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'tablet':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'desktop':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Calculate optimal signature height based on current screen size
  const getOptimalSignatureHeight = () => {
    const { width, height, deviceType } = screenSize
    
    if (deviceType === 'mobile') {
      return Math.min(height * 0.25, 250) // 25% of screen height, max 250px
    } else if (deviceType === 'tablet') {
      return Math.min(height * 0.35, 450) // 35% of screen height, max 450px
    } else {
      return Math.min(height * 0.3, 400) // 30% of screen height, max 400px
    }
  }

  const getSignatureRecommendation = () => {
    const { width, height, deviceType, isLandscape } = screenSize
    const optimalHeight = getOptimalSignatureHeight()
    
    let recommendation = ''
    if (deviceType === 'mobile') {
      recommendation = isLandscape 
        ? 'Mobile landscape: Good for signatures, expand to full width'
        : 'Mobile portrait: Consider expand mode for better signing'
    } else if (deviceType === 'tablet') {
      recommendation = 'Tablet: Ideal for signatures, use 35-40% screen height'
    } else {
      recommendation = 'Desktop: Good signing area, standard height works well'
    }
    
    return { recommendation, optimalHeight: Math.round(optimalHeight) }
  }

  const { recommendation, optimalHeight } = getSignatureRecommendation()

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(!isVisible)}
        className="h-8 w-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200 shadow-sm"
        title={isVisible ? "Hide screen info" : "Show screen info"}
      >
        {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </Button>

      {/* Info panel */}
      {isVisible && (
        <div className={`absolute bottom-10 right-0 p-3 rounded-lg border shadow-lg text-xs font-mono transition-all duration-200 min-w-[280px] ${getDeviceColor()}`}>
          <div className="flex items-center gap-2 mb-2">
            {getDeviceIcon()}
            <span className="font-semibold capitalize">{screenSize.deviceType}</span>
            {screenSize.isLandscape && (
              <span className="text-xs opacity-75">(Landscape)</span>
            )}
          </div>
          
          <div className="space-y-1 mb-3">
            <div>W: {screenSize.width}px</div>
            <div>H: {screenSize.height}px</div>
            <div className="text-xs opacity-75">
              Ratio: {(screenSize.width / screenSize.height).toFixed(2)}
            </div>
          </div>

          {/* Signature optimization section */}
          <div className="border-t pt-2 mt-2 border-current border-opacity-20">
            <div className="flex items-center gap-1 mb-1">
              <Edit3 className="h-3 w-3" />
              <span className="font-semibold text-xs">Signature Optimization</span>
            </div>
            <div className="text-xs space-y-1">
              <div>Optimal height: {optimalHeight}px</div>
              <div className="text-xs opacity-90 leading-tight">
                {recommendation}
              </div>
            </div>
          </div>

          {/* Development note */}
          <div className="border-t pt-2 mt-2 border-current border-opacity-20">
            <div className="text-xs opacity-75 italic">
              Dev tool - Remove before production
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 