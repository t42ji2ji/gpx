import { useRef, useState, useCallback } from 'react'

interface ScreenRecordingOptions {
  duration: number
  onStart: () => void
  onProgress: (progress: number) => void
  onComplete: () => void
}

interface UseScreenRecorderReturn {
  isRecording: boolean
  recordingProgress: number
  startRecording: (options: ScreenRecordingOptions) => Promise<Blob | null>
  cancelRecording: () => void
}

export function useScreenRecorder(): UseScreenRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingProgress, setRecordingProgress] = useState(0)
  const cancelledRef = useRef(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const progressIntervalRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async (options: ScreenRecordingOptions): Promise<Blob | null> => {
    const { duration, onStart, onProgress, onComplete } = options

    cancelledRef.current = false
    setIsRecording(true)
    setRecordingProgress(0)

    // Use Screen Capture API - let user select the area to record
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window',
          frameRate: 30,
        },
        audio: false,
        // @ts-expect-error preferCurrentTab is a valid option in Chrome
        preferCurrentTab: true,
      })
      streamRef.current = stream
    } catch (err) {
      console.error('Screen capture cancelled or failed:', err)
      setIsRecording(false)
      return null
    }

    // Setup MediaRecorder
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
    mediaRecorderRef.current = mediaRecorder

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    const recordingPromise = new Promise<Blob | null>((resolve) => {
      mediaRecorder.onstop = () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        if (cancelledRef.current) {
          resolve(null)
        } else {
          resolve(new Blob(chunks, { type: selectedMimeType }))
        }
      }
    })

    // Start recording
    mediaRecorder.start(100) // Collect data every 100ms

    // Start the animation playback
    onStart()

    // Track progress
    const startTime = Date.now()
    const durationMs = duration * 1000

    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      setRecordingProgress(progress)
      onProgress(progress)

      if (progress >= 1) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        // Give a small delay for the last frame, then stop
        setTimeout(() => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop()
          }
          // Stop all tracks to end screen sharing
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }
          setIsRecording(false)
          setRecordingProgress(1)
          onComplete()
        }, 200)
      }
    }, 50)

    // Handle user stopping the screen share manually
    stream.getVideoTracks()[0].onended = () => {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setIsRecording(false)
    }

    return recordingPromise
  }, [])

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    // Stop all tracks to end screen sharing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
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
