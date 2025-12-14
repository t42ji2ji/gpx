import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import MapView, { MapViewHandle } from '@/components/map/MapView'
import ElevationChart from '@/components/overlay/ElevationChart'
import TitleOverlay from '@/components/overlay/TitleOverlay'
import Compass from '@/components/overlay/Compass'
import CompletionSummary from '@/components/overlay/CompletionSummary'
import VideoSettings from '@/components/controls/VideoSettings'
import MapStylePicker from '@/components/controls/MapStylePicker'
import RouteStylePicker from '@/components/controls/RouteStylePicker'
import OverlaySettingsPanel from '@/components/controls/OverlaySettings'
import { useGpxParser, getPointAtDistance } from '@/hooks/useGpxParser'
import { 
  VideoSettings as VideoSettingsType, 
  RouteStyle, 
  OverlaySettings,
  ASPECT_RATIOS,
  ParsedGpx 
} from '@/types/gpx'
import { ArrowLeft, Play, Pause, RotateCcw, ChevronDown, ChevronUp, Settings, X } from 'lucide-react'
import { Feature, LineString } from 'geojson'

interface EditorProps {
  initialGpx?: ParsedGpx
}

export default function Editor({ initialGpx }: EditorProps) {
  const navigate = useNavigate()
  const { parsedGpx, parseFile } = useGpxParser()
  const gpxData = initialGpx || parsedGpx
  const mapRef = useRef<MapViewHandle>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()

  // Detect mobile on initial render
  const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768

  const [videoSettings, setVideoSettings] = useState<VideoSettingsType>({
    aspectRatio: isMobileDevice ? '9:16' : '16:9',
    duration: 20,
    fps: 30,
    storyMode: true,
    storyZoom: 14,
    storyPitch: 55,
  })

  const [mapStyle, setMapStyle] = useState('outdoors')

  // Map style to overlay theme mapping
  const mapStyleToTheme: Record<string, OverlaySettings['theme']> = {
    dark: 'shadow',
    light: 'light',
    streets: 'dark',
    satellite: 'glass',
    outdoors: 'light',
  }

  const handleMapStyleChange = useCallback((style: string) => {
    setMapStyle(style)
    setOverlaySettings(prev => ({ ...prev, theme: mapStyleToTheme[style] || 'light' }))
  }, [])

  const [routeStyle, setRouteStyle] = useState<RouteStyle>({
    color: '#3b82f6',
    width: 4,
    opacity: 1,
    gradientType: 'none',
    pinStyle: 'dot',
  })

  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>({
    showDistance: true,
    showElevation: true,
    showTitle: true,
    showSpeed: false,
    showTime: false,
    showCompass: false,
    title: '',
    titleSize: 16,
    theme: 'dark',
  })

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showCompletion, setShowCompletion] = useState(false)

  const [expandedPanels, setExpandedPanels] = useState({
    video: true,
    map: false,
    route: false,
    overlay: false,
  })
  const [showMobileSettings, setShowMobileSettings] = useState(false)

  const togglePanel = (panel: keyof typeof expandedPanels) => {
    setExpandedPanels(prev => ({ ...prev, [panel]: !prev[panel] }))
  }

  const track = gpxData?.tracks[0]
  const totalDistance = track?.totalDistance || 0
  const currentDistance = totalDistance * progress
  const currentPointData = track ? getPointAtDistance(track, currentDistance) : null
  const currentPosition: [number, number] | null = currentPointData 
    ? [currentPointData.point.lon, currentPointData.point.lat] 
    : null

  // Get next position for bearing calculation in story mode
  const nextDistance = Math.min(currentDistance + 0.1, totalDistance)
  const nextPointData = track ? getPointAtDistance(track, nextDistance) : null
  const nextPosition: [number, number] | null = nextPointData
    ? [nextPointData.point.lon, nextPointData.point.lat]
    : null

  const animatedGeojson = useMemo<Feature<LineString> | null>(() => {
    if (!gpxData?.geojson || !currentPointData) return null
    return {
      ...gpxData.geojson,
      geometry: {
        type: 'LineString',
        coordinates: gpxData.geojson.geometry.coordinates.slice(0, currentPointData.index + 1),
      },
    }
  }, [gpxData?.geojson, currentPointData?.index])

  useEffect(() => {
    if (gpxData?.name && !overlaySettings.title) {
      setOverlaySettings(prev => ({ ...prev, title: gpxData.name || '' }))
    }
    // Auto-set video duration based on route distance
    if (gpxData?.tracks[0]) {
      const distance = gpxData.tracks[0].totalDistance
      // ~2 seconds per km, min 10s, max 60s
      const autoDuration = Math.min(60, Math.max(10, Math.round(distance * 2)))
      setVideoSettings(prev => ({ ...prev, duration: autoDuration }))
    }
  }, [gpxData])

  const animate = useCallback(() => {
    if (!isPlaying) return

    setProgress(prev => {
      const increment = 1 / (videoSettings.duration * 60)
      const newProgress = prev + increment
      if (newProgress >= 1) {
        setIsPlaying(false)
          setTimeout(() => setShowCompletion(true), 400)
        return 1
      }
      return newProgress
    })

    animationRef.current = requestAnimationFrame(animate)
  }, [isPlaying, videoSettings.duration, videoSettings.storyMode])

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate)
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, animate])

  // Reset map view when completion screen shows
  useEffect(() => {
    if (showCompletion && gpxData?.bounds && mapRef.current) {
      const map = mapRef.current.getMapRef()?.getMap()
      if (map) {
        map.easeTo({
          pitch: 0,
          bearing: 0,
          duration: 1000,
        })
        setTimeout(() => {
          mapRef.current?.getMapRef()?.fitBounds(
            [[gpxData.bounds.minLon, gpxData.bounds.minLat], [gpxData.bounds.maxLon, gpxData.bounds.maxLat]],
            { padding: 50, duration: 1000 }
          )
        }, 500)
      }
    }
  }, [showCompletion, gpxData?.bounds])

  const handlePlayPause = () => {
    if (progress >= 1) {
      setProgress(0)
      setShowCompletion(false)
    }
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setProgress(0)
    setShowCompletion(false)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await parseFile(file)
    }
  }

  const aspectRatio = ASPECT_RATIOS[videoSettings.aspectRatio]
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = windowSize.width < 768
  const previewScale = isMobile
    ? Math.min(
        (windowSize.width - 32) / aspectRatio.width,
        (windowSize.height - 160) / aspectRatio.height // 留空間給播放控制
      )
    : Math.min(
        (windowSize.width - 320 - 64) / aspectRatio.width,
        (windowSize.height * 0.7) / aspectRatio.height
      )

  // Resize map when aspect ratio or window size changes
  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.getMapRef()?.resize()
    }, 100)
    return () => clearTimeout(timer)
  }, [videoSettings.aspectRatio, windowSize])

  // Settings panel content (shared between desktop sidebar and mobile modal)
  const settingsContent = (
    <div className="space-y-2">


  {/* Map Style Panel */}
      <div className="border rounded-lg">
        <button
          onClick={() => togglePanel('map')}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold text-sm">地圖樣式</span>
          {expandedPanels.map ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expandedPanels.map && (
          <div className="px-3 pb-3">
            <MapStylePicker selected={mapStyle} onChange={handleMapStyleChange} />
          </div>
        )}
      </div>


      {/* Video Settings Panel */}
      <div className="border rounded-lg">
        <button
          onClick={() => togglePanel('video')}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold text-sm">地圖視角/影片設定</span>
          {expandedPanels.video ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expandedPanels.video && (
          <div className="px-3 pb-3">
            <VideoSettings settings={videoSettings} onChange={setVideoSettings} />
          </div>
        )}
      </div>

    
      {/* Route Style Panel */}
      <div className="border rounded-lg">
        <button
          onClick={() => togglePanel('route')}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold text-sm">路線樣式</span>
          {expandedPanels.route ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expandedPanels.route && (
          <div className="px-3 pb-3">
            <RouteStylePicker style={routeStyle} onChange={setRouteStyle} />
          </div>
        )}
      </div>

      {/* Overlay Settings Panel */}
      <div className="border rounded-lg">
        <button
          onClick={() => togglePanel('overlay')}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold text-sm">覆蓋元素</span>
          {expandedPanels.overlay ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expandedPanels.overlay && (
          <div className="px-3 pb-3">
            <OverlaySettingsPanel settings={overlaySettings} onChange={setOverlaySettings} />
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Desktop Controls Panel - Hidden on mobile */}
      <div className="hidden md:block w-80 h-full border-r bg-card p-4 overflow-y-auto flex-shrink-0">
        <Button
          variant="ghost"
          className="flex items-center gap-2 mb-4 text-muted-foreground hover:text-primary"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} />
          <span>返回</span>
        </Button>

        {!gpxData && (
          <Card className="mb-4">
            <CardContent className="pt-4">
              <label className="block">
                <span className="text-sm text-muted-foreground">選擇 GPX 文件</span>
                <input
                  type="file"
                  accept=".gpx"
                  onChange={handleFileSelect}
                  className="mt-2 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </label>
            </CardContent>
          </Card>
        )}

        {settingsContent}
      </div>

      {/* Mobile Settings Modal */}
      {showMobileSettings && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowMobileSettings(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-card rounded-t-2xl p-4 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">設定</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowMobileSettings(false)}>
                <X size={20} />
              </Button>
            </div>

            {!gpxData && (
              <Card className="mb-4">
                <CardContent className="pt-4">
                  <label className="block">
                    <span className="text-sm text-muted-foreground">選擇 GPX 文件</span>
                    <input
                      type="file"
                      accept=".gpx"
                      onChange={handleFileSelect}
                      className="mt-2 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                  </label>
                </CardContent>
              </Card>
            )}

            {settingsContent}
          </div>
        </div>
      )}

      {/* Preview Panel - Full screen on mobile */}
      <div className="flex-1 h-full flex flex-col items-center justify-center p-4 md:p-8 bg-muted/30 overflow-auto relative">
        {/* Mobile Top Bar - Back button only */}
        <div className="md:hidden absolute top-0 left-0 p-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="bg-background/80 backdrop-blur-sm"
          >
            <ArrowLeft size={20} />
          </Button>
        </div>

        {gpxData ? (
          <>
            {/* Preview Container */}
            <div
              ref={containerRef}
              className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
              style={{
                width: aspectRatio.width * previewScale,
                height: aspectRatio.height * previewScale,
              }}
            >
              <MapView
                ref={mapRef}
                geojson={gpxData.geojson}
                animatedGeojson={animatedGeojson}
                bounds={gpxData.bounds}
                mapStyle={mapStyle}
                routeStyle={routeStyle}
                currentPosition={currentPosition}
                nextPosition={nextPosition}
                storyMode={videoSettings.storyMode}
                storyZoom={videoSettings.storyZoom}
                storyPitch={videoSettings.storyPitch}
              />

              {/* Overlays */}
              {overlaySettings.showTitle && overlaySettings.title && (
                <TitleOverlay
                  title={overlaySettings.title}
                  fontSize={overlaySettings.titleSize}
                  theme={overlaySettings.theme}
                  className="absolute top-4 left-4"
                />
              )}

              {overlaySettings.showElevation && track && (
                <ElevationChart
                  track={track}
                  currentDistance={currentDistance}
                  totalDistance={totalDistance}
                  theme={overlaySettings.theme}
                  routeColor={routeStyle.color}
                  scale={isMobile && videoSettings.aspectRatio !== '9:16' ? 0.6 : 1}
                  className={`absolute bottom-4 left-4 ${
                    videoSettings.aspectRatio === '9:16' ? 'right-4' : 'w-72'
                  }`}
                />
              )}

              {overlaySettings.showCompass && (
                <Compass className="absolute top-4 left-1/2 -translate-x-1/2" />
              )}

              {/* Completion Summary (Story Mode) */}
              {showCompletion && track && (
                <CompletionSummary
                  track={track}
                  title={overlaySettings.title}
                  theme={overlaySettings.theme}
                  routeColor={routeStyle.color}
                />
              )}
            </div>

            {/* Playback Controls */}
            <div className="mt-4 md:mt-6 flex flex-col gap-3 w-full max-w-xl">
              {/* Progress Row */}
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={handleReset} className="shrink-0">
                  <RotateCcw size={18} />
                </Button>

                <Button size="icon" onClick={handlePlayPause} className="shrink-0">
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </Button>

                <div className="flex-1 min-w-0">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.001}
                    value={progress}
                    onChange={e => {
                      setIsPlaying(false)
                      setShowCompletion(false)
                      setProgress(Number(e.target.value))
                    }}
                    className="w-full"
                  />
                </div>

                <span className="text-sm text-muted-foreground w-12 tabular-nums text-right shrink-0">
                  {Math.round(progress * 100)}%
                </span>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-center gap-3">
                {/* Mobile Settings Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMobileSettings(true)}
                  className="md:hidden"
                >
                  <Settings size={16} className="mr-2" />
                  設定
                </Button>


                <a
                  href="https://www.buymeacoffee.com/dorara"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#FFDD00] text-black rounded-md font-medium text-sm hover:bg-[#ffeb3b] transition-colors"
                >
                  <span>☕</span>
                  <span className="hidden sm:inline">贊助我讓網站更長久</span>
                  <span className="sm:hidden">贊助</span>
                </a>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground">
            <p className="text-lg mb-2">請上傳 GPX 文件開始編輯</p>
            <p className="text-sm mb-4">支援標準 GPX 格式</p>
            {/* Mobile upload button */}
            <Button
              className="md:hidden"
              onClick={() => setShowMobileSettings(true)}
            >
              選擇檔案
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
