import { gpx } from '@tmcw/togeojson'
import { Feature, LineString, Position } from 'geojson'
import { useCallback, useState } from 'react'
import { GpxPoint, GpxTrack, ParsedGpx } from '@/types/gpx'

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function parseGpxFile(xmlString: string): ParsedGpx | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    const geojsonData = gpx(doc)

    const lineFeature = geojsonData.features.find(
      (f): f is Feature<LineString> => f.geometry.type === 'LineString'
    )

    if (!lineFeature) return null

    const coordinates = lineFeature.geometry.coordinates
    const points: GpxPoint[] = coordinates.map((coord: Position) => ({
      lon: coord[0],
      lat: coord[1],
      ele: coord[2],
    }))

    let totalDistance = 0
    let elevationGain = 0
    let elevationLoss = 0
    let minEle = Infinity
    let maxEle = -Infinity

    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      if (point.ele !== undefined) {
        minEle = Math.min(minEle, point.ele)
        maxEle = Math.max(maxEle, point.ele)
      }

      if (i > 0) {
        const prev = points[i - 1]
        totalDistance += calculateDistance(prev.lat, prev.lon, point.lat, point.lon)

        if (prev.ele !== undefined && point.ele !== undefined) {
          const eleDiff = point.ele - prev.ele
          if (eleDiff > 0) elevationGain += eleDiff
          else elevationLoss += Math.abs(eleDiff)
        }
      }
    }

    const track: GpxTrack = {
      name: lineFeature.properties?.name || undefined,
      points,
      totalDistance,
      elevationGain,
      elevationLoss,
      minElevation: minEle === Infinity ? 0 : minEle,
      maxElevation: maxEle === -Infinity ? 0 : maxEle,
    }

    const lats = points.map(p => p.lat)
    const lons = points.map(p => p.lon)

    return {
      name: geojsonData.features[0]?.properties?.name,
      tracks: [track],
      geojson: lineFeature,
      bounds: {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLon: Math.min(...lons),
        maxLon: Math.max(...lons),
      },
    }
  } catch (error) {
    console.error('Error parsing GPX:', error)
    return null
  }
}

// 緩存預計算的累積距離
const distanceCacheMap = new WeakMap<GpxTrack, number[]>()

function getOrCreateDistanceCache(track: GpxTrack): number[] {
  let cache = distanceCacheMap.get(track)
  if (cache) return cache

  // 預計算每個點的累積距離
  cache = new Array(track.points.length)
  cache[0] = 0
  for (let i = 1; i < track.points.length; i++) {
    const prev = track.points[i - 1]
    const curr = track.points[i]
    cache[i] = cache[i - 1] + calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon)
  }
  distanceCacheMap.set(track, cache)
  return cache
}

export function getPointAtDistance(track: GpxTrack, targetDistance: number): { point: GpxPoint; index: number } {
  const distances = getOrCreateDistanceCache(track)

  // 二分查找目標距離所在的區段
  let left = 0
  let right = distances.length - 1

  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    if (distances[mid] < targetDistance) {
      left = mid + 1
    } else {
      right = mid
    }
  }

  const i = left
  if (i === 0) {
    return { point: track.points[0], index: 0 }
  }

  const prev = track.points[i - 1]
  const curr = track.points[i]
  const segmentDistance = distances[i] - distances[i - 1]

  if (segmentDistance === 0) {
    return { point: curr, index: i }
  }

  const ratio = (targetDistance - distances[i - 1]) / segmentDistance

  return {
    point: {
      lat: prev.lat + (curr.lat - prev.lat) * ratio,
      lon: prev.lon + (curr.lon - prev.lon) * ratio,
      ele: prev.ele !== undefined && curr.ele !== undefined
        ? prev.ele + (curr.ele - prev.ele) * ratio
        : curr.ele,
    },
    index: i,
  }
}

export function useGpxParser() {
  const [parsedGpx, setParsedGpx] = useState<ParsedGpx | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseFile = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      const text = await file.text()
      const result = parseGpxFile(text)

      if (result) {
        setParsedGpx(result)
      } else {
        setError('無法解析 GPX 文件')
      }
    } catch (err) {
      setError('讀取文件時發生錯誤')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setParsedGpx(null)
    setError(null)
  }, [])

  return { parsedGpx, isLoading, error, parseFile, reset }
}
