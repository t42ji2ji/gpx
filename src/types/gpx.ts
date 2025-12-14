import { Feature, LineString, Position } from 'geojson'

export interface GpxPoint {
  lat: number
  lon: number
  ele?: number
  time?: Date
}

export interface GpxTrack {
  name?: string
  points: GpxPoint[]
  totalDistance: number
  elevationGain: number
  elevationLoss: number
  minElevation: number
  maxElevation: number
}

export interface ParsedGpx {
  name?: string
  tracks: GpxTrack[]
  geojson: Feature<LineString>
  bounds: {
    minLat: number
    maxLat: number
    minLon: number
    maxLon: number
  }
}

export interface VideoSettings {
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3'
  duration: number
  fps: number
  storyMode: boolean
  storyZoom: number
  storyPitch: number
}

export interface MapStyle {
  id: string
  name: string
  url: string
}

export type PinStyle = 'dot' | 'pin' | 'arrow' | 'bike' | 'hiker' | 'car'

export const PIN_STYLES: { id: PinStyle; name: string; icon: string }[] = [
  { id: 'dot', name: '圓點', icon: '●' },
  { id: 'pin', name: '圖釘', icon: '📍' },
  { id: 'arrow', name: '箭頭', icon: '➤' },
  { id: 'bike', name: '自行車', icon: '🚴' },
  { id: 'hiker', name: '登山', icon: '🥾' },
  { id: 'car', name: '汽車', icon: '🚗' },
]

export interface RouteStyle {
  color: string
  width: number
  opacity: number
  gradientType: 'none' | 'elevation' | 'speed'
  pinStyle: PinStyle
}

export type OverlayTheme = 'dark' | 'light' | 'shadow' | 'glass'

export interface OverlaySettings {
  showDistance: boolean
  showElevation: boolean
  showTitle: boolean
  showSpeed: boolean
  showTime: boolean
  showCompass: boolean
  title: string
  titleSize: number
  theme: OverlayTheme
}

export const OVERLAY_THEMES: { id: OverlayTheme; name: string }[] = [
  { id: 'dark', name: '深色背景' },
  { id: 'light', name: '淺色背景' },
  { id: 'shadow', name: '文字陰影' },
  { id: 'glass', name: '毛玻璃' },
]

export interface AnimationState {
  isPlaying: boolean
  progress: number
  currentDistance: number
  currentElevation: number
  currentSpeed: number
  currentPosition: Position
}

export const ASPECT_RATIOS = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:3': { width: 1440, height: 1080 },
} as const

export const MAP_STYLES: MapStyle[] = [
  { id: 'streets', name: '街道圖', url: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'satellite', name: '衛星圖', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { id: 'outdoors', name: '地形圖', url: 'mapbox://styles/mapbox/outdoors-v12' },
  { id: 'dark', name: '暗色主題', url: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'light', name: '亮色主題', url: 'mapbox://styles/mapbox/light-v11' },
]
