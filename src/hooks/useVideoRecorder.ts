import { useRef, useState, useCallback } from 'react'
import { Muxer, ArrayBufferTarget } from 'webm-muxer'
import { CanvasOverlayRenderer, OverlayRenderOptions } from '@/lib/CanvasOverlayRenderer'
import { GpxTrack } from '@/types/gpx'
import type { Map as MapboxMap } from 'mapbox-gl'

interface RecordingOptions {
  fps: number
  duration: number
  width: number
  height: number
  aspectRatio: string
  mapInstance: MapboxMap
  overlayOptions: Omit<OverlayRenderOptions, 'width' | 'height' | 'currentDistance' | 'currentElevation'>
  track: GpxTrack
  storyMode: boolean
  storyZoom: number
  storyPitch: number
  onProgress?: (progress: number) => void
}

interface UseVideoRecorderReturn {
  isRecording: boolean
  recordingProgress: number
  startRecording: (options: RecordingOptions) => Promise<Blob | null>
  cancelRecording: () => void
}

// Simple MP4 muxer using mp4-muxer library pattern
// For now, we'll output WebM which has better browser support
// Can upgrade to MP4 with mp4-muxer or similar library later

export function useVideoRecorder(): UseVideoRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingProgress, setRecordingProgress] = useState(0)
  const cancelledRef = useRef(false)
  const encoderRef = useRef<VideoEncoder | null>(null)

  const startRecording = useCallback(async (options: RecordingOptions): Promise<Blob | null> => {
    cancelledRef.current = false
    setIsRecording(true)
    setRecordingProgress(0)

    const totalFrames = Math.ceil(options.fps * options.duration)
    const frameDuration = 1000000 / options.fps // microseconds

    // Check for WebCodecs support
    const hasWebCodecs = typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'

    if (hasWebCodecs) {
      return recordWithWebCodecs(
        options,
        totalFrames,
        frameDuration,
        cancelledRef,
        setRecordingProgress,
        setIsRecording,
        encoderRef
      )
    } else {
      // Fallback to MediaRecorder
      return recordWithMediaRecorder(
        options,
        totalFrames,
        cancelledRef,
        setRecordingProgress,
        setIsRecording
      )
    }
  }, [])

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true
    if (encoderRef.current) {
      try {
        encoderRef.current.close()
      } catch { /* ignore */ }
      encoderRef.current = null
    }
    setIsRecording(false)
    setRecordingProgress(0)
  }, [])

  return {
    isRecording,
    recordingProgress,
    startRecording,
    cancelRecording,
  }
}

// Helper to wait for map to be idle (tiles loaded)
function waitForMapIdle(map: MapboxMap, timeout = 5000): Promise<void> {
  return new Promise((resolve) => {
    // If already idle, resolve immediately
    if (!map.isMoving() && map.areTilesLoaded()) {
      resolve()
      return
    }

    const timer = setTimeout(() => {
      map.off('idle', onIdle)
      resolve()
    }, timeout)

    const onIdle = () => {
      clearTimeout(timer)
      map.off('idle', onIdle)
      resolve()
    }

    map.once('idle', onIdle)
  })
}

// Calculate distance between two points using Haversine formula (returns km)
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

// Calculate bearing between two points
function calculateBearing(from: [number, number], to: [number, number]): number {
  const lon1 = from[0] * Math.PI / 180
  const lon2 = to[0] * Math.PI / 180
  const lat1 = from[1] * Math.PI / 180
  const lat2 = to[1] * Math.PI / 180
  const dLon = lon2 - lon1
  const x = Math.sin(dLon) * Math.cos(lat2)
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360
}

// Get point at distance along track
function getPointAtDistance(track: GpxTrack, targetDistance: number): { point: { lon: number; lat: number }; index: number } | null {
  const points = track.points
  if (points.length === 0) return null

  let accumulatedDistance = 0
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const segmentDist = calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon)

    if (accumulatedDistance + segmentDist >= targetDistance) {
      // Interpolate position
      const ratio = segmentDist > 0 ? (targetDistance - accumulatedDistance) / segmentDist : 0
      return {
        point: {
          lon: prev.lon + (curr.lon - prev.lon) * ratio,
          lat: prev.lat + (curr.lat - prev.lat) * ratio,
        },
        index: i,
      }
    }
    accumulatedDistance += segmentDist
  }

  // Return last point
  const last = points[points.length - 1]
  return { point: { lon: last.lon, lat: last.lat }, index: points.length - 1 }
}

// WebCodecs-based recording (fastest, ~10x faster than html2canvas)
async function recordWithWebCodecs(
  options: RecordingOptions,
  totalFrames: number,
  frameDuration: number,
  cancelledRef: React.MutableRefObject<boolean>,
  setRecordingProgress: (p: number) => void,
  setIsRecording: (r: boolean) => void,
  encoderRef: React.MutableRefObject<VideoEncoder | null>
): Promise<Blob | null> {
  const { width, height, mapInstance, overlayOptions, track, onProgress, fps, storyMode, storyZoom, storyPitch } = options

  // Create offscreen canvas for compositing
  const compositeCanvas = new OffscreenCanvas(width, height)
  const ctx = compositeCanvas.getContext('2d', { alpha: false })
  if (!ctx) {
    console.error('Failed to get 2d context')
    setIsRecording(false)
    return null
  }

  const overlayRenderer = new CanvasOverlayRenderer(ctx as unknown as CanvasRenderingContext2D)

  // Setup WebM muxer
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: 'V_VP9',
      width,
      height,
      frameRate: fps,
    },
  })

  // Configure video encoder
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta)
    },
    error: (e) => {
      console.error('VideoEncoder error:', e)
    },
  })
  encoderRef.current = encoder

  const config: VideoEncoderConfig = {
    codec: 'vp09.00.10.08', // VP9 for WebM
    width,
    height,
    bitrate: 8_000_000, // 8 Mbps
    framerate: fps,
  }

  // Check if codec is supported
  const support = await VideoEncoder.isConfigSupported(config)
  if (!support.supported) {
    // Fallback to VP8
    config.codec = 'vp8'
    const vp8Support = await VideoEncoder.isConfigSupported(config)
    if (!vp8Support.supported) {
      console.error('No supported video codec')
      setIsRecording(false)
      return recordWithMediaRecorder(
        options,
        totalFrames,
        cancelledRef,
        setRecordingProgress,
        setIsRecording
      )
    }
  }

  encoder.configure(config)

  const totalDistance = track.totalDistance
  const mapCanvas = mapInstance.getCanvas()
  let lastBearing = 0

  // Record frames
  for (let frame = 0; frame < totalFrames; frame++) {
    if (cancelledRef.current) {
      encoder.close()
      setIsRecording(false)
      return null
    }

    const progress = frame / totalFrames
    setRecordingProgress(progress)
    onProgress?.(progress)

    // Calculate current distance and elevation
    const currentDistance = totalDistance * progress
    const currentElevation = getElevationAtProgress(track, progress)

    // Update map camera position for story mode
    if (storyMode) {
      const pointData = getPointAtDistance(track, currentDistance)
      if (pointData) {
        const currentPos: [number, number] = [pointData.point.lon, pointData.point.lat]

        // Calculate bearing to next point
        const nextDistance = Math.min(currentDistance + 0.1, totalDistance)
        const nextPointData = getPointAtDistance(track, nextDistance)
        if (nextPointData) {
          const nextPos: [number, number] = [nextPointData.point.lon, nextPointData.point.lat]
          const newBearing = calculateBearing(currentPos, nextPos)

          // Smooth bearing
          let bearingDiff = newBearing - lastBearing
          if (bearingDiff > 180) bearingDiff -= 360
          if (bearingDiff < -180) bearingDiff += 360
          lastBearing = lastBearing + bearingDiff * 0.15
          lastBearing = ((lastBearing % 360) + 360) % 360
        }

        // Jump to position (no animation during recording)
        mapInstance.jumpTo({
          center: currentPos,
          zoom: storyZoom,
          pitch: storyPitch,
          bearing: lastBearing,
        })
      }
    }

    // Wait for map tiles to load
    await waitForMapIdle(mapInstance, 500)

    // Draw map canvas to composite canvas (scale to output size)
    ctx.drawImage(mapCanvas, 0, 0, width, height)

    // Draw overlays
    overlayRenderer.render({
      ...overlayOptions,
      width,
      height,
      currentDistance,
      currentElevation,
    })

    // Create VideoFrame from canvas (GPU-level, no pixel reading!)
    const videoFrame = new VideoFrame(compositeCanvas, {
      timestamp: frame * frameDuration,
      duration: frameDuration,
    })

    // Encode frame
    encoder.encode(videoFrame, { keyFrame: frame % 30 === 0 })
    videoFrame.close()

    // Small delay to ensure map renders
    await new Promise(r => setTimeout(r, 16))
  }

  // Flush encoder and finalize muxer
  await encoder.flush()
  encoder.close()
  encoderRef.current = null
  muxer.finalize()

  setIsRecording(false)
  setRecordingProgress(1)

  // Get the final WebM blob
  const { buffer } = muxer.target as ArrayBufferTarget
  return new Blob([buffer], { type: 'video/webm' })
}

// MediaRecorder fallback (slower but more compatible)
async function recordWithMediaRecorder(
  options: RecordingOptions,
  totalFrames: number,
  cancelledRef: React.MutableRefObject<boolean>,
  setRecordingProgress: (p: number) => void,
  setIsRecording: (r: boolean) => void
): Promise<Blob | null> {
  const { width, height, fps, mapInstance, overlayOptions, track, onProgress, storyMode, storyZoom, storyPitch } = options

  // Create composite canvas
  const compositeCanvas = document.createElement('canvas')
  compositeCanvas.width = width
  compositeCanvas.height = height
  const ctx = compositeCanvas.getContext('2d', { alpha: false })
  if (!ctx) {
    setIsRecording(false)
    return null
  }

  const overlayRenderer = new CanvasOverlayRenderer(ctx)

  // Setup MediaRecorder
  const stream = compositeCanvas.captureStream(fps)
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]

  let selectedMimeType = ''
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      selectedMimeType = mimeType
      break
    }
  }

  if (!selectedMimeType) {
    console.error('No supported mime type')
    setIsRecording(false)
    return null
  }

  const chunks: Blob[] = []
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: selectedMimeType,
    videoBitsPerSecond: 8_000_000,
  })

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const recordingPromise = new Promise<Blob | null>((resolve) => {
    mediaRecorder.onstop = () => {
      if (cancelledRef.current) {
        resolve(null)
      } else {
        resolve(new Blob(chunks, { type: selectedMimeType }))
      }
    }
  })

  mediaRecorder.start()

  const totalDistance = track.totalDistance
  const mapCanvas = mapInstance.getCanvas()
  let lastBearing = 0

  for (let frame = 0; frame < totalFrames; frame++) {
    if (cancelledRef.current) {
      mediaRecorder.stop()
      setIsRecording(false)
      return null
    }

    const progress = frame / totalFrames
    setRecordingProgress(progress)
    onProgress?.(progress)

    const currentDistance = totalDistance * progress
    const currentElevation = getElevationAtProgress(track, progress)

    // Update map camera position for story mode
    if (storyMode) {
      const pointData = getPointAtDistance(track, currentDistance)
      if (pointData) {
        const currentPos: [number, number] = [pointData.point.lon, pointData.point.lat]

        // Calculate bearing to next point
        const nextDistance = Math.min(currentDistance + 0.1, totalDistance)
        const nextPointData = getPointAtDistance(track, nextDistance)
        if (nextPointData) {
          const nextPos: [number, number] = [nextPointData.point.lon, nextPointData.point.lat]
          const newBearing = calculateBearing(currentPos, nextPos)

          // Smooth bearing
          let bearingDiff = newBearing - lastBearing
          if (bearingDiff > 180) bearingDiff -= 360
          if (bearingDiff < -180) bearingDiff += 360
          lastBearing = lastBearing + bearingDiff * 0.15
          lastBearing = ((lastBearing % 360) + 360) % 360
        }

        mapInstance.jumpTo({
          center: currentPos,
          zoom: storyZoom,
          pitch: storyPitch,
          bearing: lastBearing,
        })
      }
    }

    // Wait for map tiles to load
    await waitForMapIdle(mapInstance, 500)

    // Draw map
    ctx.drawImage(mapCanvas, 0, 0, width, height)

    // Draw overlays
    overlayRenderer.render({
      ...overlayOptions,
      width,
      height,
      currentDistance,
      currentElevation,
    })

    await new Promise(r => setTimeout(r, 50))
  }

  mediaRecorder.stop()
  setIsRecording(false)
  setRecordingProgress(1)

  return recordingPromise
}

// Helper to get elevation at a progress point
function getElevationAtProgress(track: GpxTrack, progress: number): number {
  const points = track.points
  const index = Math.floor(progress * (points.length - 1))
  return points[Math.min(index, points.length - 1)]?.ele || 0
}


// Helper to download blob as file
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
