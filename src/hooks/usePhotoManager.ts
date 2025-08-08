import { useState, useCallback } from 'react'

// Hook for managing photo URL loading and caching
export const usePhotoManager = () => {
  const [photoUrls, setPhotoUrls] = useState(new Map<string, string>())
  const [loadingPhotos, setLoadingPhotos] = useState(new Set<string>())

  // Load individual photo URL
  const loadPhotoUrl = useCallback(async (photoPath: string): Promise<string | null> => {
    // Return cached URL if available
    if (photoUrls.has(photoPath)) {
      return photoUrls.get(photoPath) || null
    }

    // Don't start loading if already in progress
    if (loadingPhotos.has(photoPath)) {
      return null
    }

    try {
      setLoadingPhotos(prev => new Set(prev).add(photoPath))
      
      const response = await fetch(`/api/time-clock/photos/url?path=${encodeURIComponent(photoPath)}`)
      if (!response.ok) {
        throw new Error('Failed to get photo URL')
      }
      
      const data = await response.json()
      if (data.url) {
        setPhotoUrls(prev => new Map(prev).set(photoPath, data.url))
        return data.url
      }
      
      return null
    } catch (error) {
      console.error('Error loading photo URL:', error)
      return null
    } finally {
      setLoadingPhotos(prev => {
        const newSet = new Set(prev)
        newSet.delete(photoPath)
        return newSet
      })
    }
  }, [photoUrls, loadingPhotos])

  // Batch load multiple photo URLs (for future optimization)
  const loadPhotoBatch = useCallback(async (photoPaths: string[]): Promise<Map<string, string>> => {
    const uncachedPaths = photoPaths.filter(path => !photoUrls.has(path))
    
    if (uncachedPaths.length === 0) {
      const resultMap = new Map<string, string>()
      photoPaths.forEach(path => {
        const url = photoUrls.get(path)
        if (url) resultMap.set(path, url)
      })
      return resultMap
    }

    try {
      // TODO: Implement batch photo URL loading API endpoint
      // For now, load individually
      const urlPromises = uncachedPaths.map(async (path) => {
        const url = await loadPhotoUrl(path)
        return [path, url] as const
      })

      const results = await Promise.all(urlPromises)
      const newUrls = new Map<string, string>()
      
      results.forEach(([path, url]) => {
        if (url) newUrls.set(path, url)
      })

      return newUrls
    } catch (error) {
      console.error('Error batch loading photo URLs:', error)
      return new Map()
    }
  }, [photoUrls, loadPhotoUrl])

  // Clear photo cache
  const clearPhotoCache = useCallback(() => {
    setPhotoUrls(new Map())
    setLoadingPhotos(new Set())
  }, [])

  // Get cached photo URL without loading
  const getCachedPhotoUrl = useCallback((photoPath: string): string | null => {
    return photoUrls.get(photoPath) || null
  }, [photoUrls])

  // Check if photo is currently loading
  const isPhotoLoading = useCallback((photoPath: string): boolean => {
    return loadingPhotos.has(photoPath)
  }, [loadingPhotos])

  return {
    photoUrls,
    loadingPhotos,
    loadPhotoUrl,
    loadPhotoBatch,
    clearPhotoCache,
    getCachedPhotoUrl,
    isPhotoLoading
  }
}