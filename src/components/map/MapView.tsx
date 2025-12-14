import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle, memo } from 'react'
import Map, { Source, Layer, MapRef, Marker } from 'react-map-gl/mapbox'
import { Feature, LineString } from 'geojson'
import { RouteStyle, MAP_STYLES, PIN_STYLES, PinStyle } from '@/types/gpx'
import 'mapbox-gl/dist/mapbox-gl.css'

interface MapViewProps {
  geojson: Feature<LineString> | null
  animatedGeojson?: Feature<LineString> | null
  bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number }
  mapStyle: string
  routeStyle: RouteStyle
  currentPosition?: [number, number] | null
  nextPosition?: [number, number] | null
  storyMode?: boolean
  storyZoom?: number
  storyPitch?: number
  className?: string
}

export interface MapViewHandle {
  getMapRef: () => MapRef | null
}

// Pin marker component
function PinMarker({
  pinStyle,
  color,
  bearing = 0
}: {
  pinStyle: PinStyle
  color: string
  bearing?: number
}) {
  const pinInfo = PIN_STYLES.find(p => p.id === pinStyle) || PIN_STYLES[0]

  if (pinStyle === 'dot') {
    return (
      <div
        className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
        style={{ backgroundColor: color }}
      />
    )
  }

  if (pinStyle === 'arrow') {
    // bearing: 0=北, 90=東, 180=南, 270=西 (地理方位角)
    // CSS rotate: 0=右, 90=下, 180=左, 270=上
    // ➤ 預設指向右邊 (0deg in CSS)
    // 要讓箭頭指向北 (bearing=0)，需要 rotate(-90deg)
    // 公式: CSS角度 = bearing - 90
    return (
      <div
        className="text-2xl drop-shadow-lg"
        style={{
          color,
          transform: `rotate(${bearing - 90}deg)`,
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
        }}
      >
        ➤
      </div>
    )
  }

  // For emoji-based pins (pin, bike, hiker, car)
  return (
    <div
      className="text-2xl drop-shadow-lg"
      style={{
        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))',
      }}
    >
      {pinInfo.icon}
    </div>
  )
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

const MapView = forwardRef<MapViewHandle, MapViewProps>(({
  geojson,
  animatedGeojson,
  bounds,
  mapStyle,
  routeStyle,
  currentPosition,
  nextPosition,
  storyMode = false,
  storyZoom = 14,
  storyPitch = 45,
  className = '',
}, ref) => {
  const mapRef = useRef<MapRef>(null)
  const lastUpdateRef = useRef<number>(0)
  const lastBearingRef = useRef<number>(0) // 地圖旋轉角度 (story mode)
  const markerBearingRef = useRef<number>(0) // 標記方向角度

  useImperativeHandle(ref, () => ({
    getMapRef: () => mapRef.current,
  }))

  const fitBounds = useCallback(() => {
    if (bounds && mapRef.current) {
      mapRef.current.fitBounds(
        [[bounds.minLon, bounds.minLat], [bounds.maxLon, bounds.maxLat]],
        { padding: 50, duration: 1000 }
      )
    }
  }, [bounds])

  useEffect(() => {
    if (bounds && !storyMode) {
      const timer = setTimeout(fitBounds, 500)
      return () => clearTimeout(timer)
    }
  }, [bounds, fitBounds, storyMode])

  // 計算標記方向（不論是否在 story mode）
  useEffect(() => {
    if (currentPosition && nextPosition) {
      const newBearing = calculateBearing(currentPosition, nextPosition)
      let bearingDiff = newBearing - markerBearingRef.current
      if (bearingDiff > 180) bearingDiff -= 360
      if (bearingDiff < -180) bearingDiff += 360
      // 平滑過渡
      markerBearingRef.current = ((markerBearingRef.current + bearingDiff * 0.3) % 360 + 360) % 360
    }
  }, [currentPosition, nextPosition])

  // Story mode: follow current position with pitch and bearing
  useEffect(() => {
    if (storyMode && currentPosition && mapRef.current) {
      const now = Date.now()
      // Throttle updates to ~10fps for smoother animation
      if (now - lastUpdateRef.current < 100) return
      lastUpdateRef.current = now

      const map = mapRef.current.getMap()
      if (map) {
        let targetBearing = lastBearingRef.current

        if (nextPosition) {
          const newBearing = calculateBearing(currentPosition, nextPosition)
          let bearingDiff = newBearing - lastBearingRef.current
          if (bearingDiff > 180) bearingDiff -= 360
          if (bearingDiff < -180) bearingDiff += 360

          // Smooth bearing - always interpolate slowly
          targetBearing = lastBearingRef.current + bearingDiff * 0.15
          targetBearing = ((targetBearing % 360) + 360) % 360
          lastBearingRef.current = targetBearing
        }

        // Use easeTo for smooth transitions
        map.easeTo({
          center: [currentPosition[0], currentPosition[1]],
          zoom: storyZoom,
          pitch: storyPitch,
          bearing: targetBearing,
          duration: 150,
          easing: (t) => t, // Linear easing for consistent speed
        })
      }
    }
  }, [storyMode, currentPosition, nextPosition, storyZoom, storyPitch])

  // Reset view when story mode is toggled off
  useEffect(() => {
    if (!storyMode && bounds && mapRef.current) {
      const map = mapRef.current.getMap()
      if (map) {
        map.setPitch(0)
        map.setBearing(0)
      }
      fitBounds()
    }
  }, [storyMode, bounds, fitBounds])

  const selectedStyle = MAP_STYLES.find(s => s.id === mapStyle)?.url || MAP_STYLES[0].url

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
    <Map
      ref={mapRef}
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
      initialViewState={{
        longitude: 121.5,
        latitude: 25.0,
        zoom: 10,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={selectedStyle}
      preserveDrawingBuffer={true}
    >
      {geojson && (
        <Source id="route-bg" type="geojson" data={geojson}>
          <Layer
            id="route-bg-line"
            type="line"
            paint={{
              'line-color': '#ccc',
              'line-width': routeStyle.width + 2,
              'line-opacity': 0.3,
            }}
          />
        </Source>
      )}

      {animatedGeojson && (
        <Source id="route-animated" type="geojson" data={animatedGeojson}>
          <Layer
            id="route-animated-line"
            type="line"
            paint={{
              'line-color': routeStyle.color,
              'line-width': routeStyle.width,
              'line-opacity': routeStyle.opacity,
            }}
          />
        </Source>
      )}

      {currentPosition && (
        <Marker longitude={currentPosition[0]} latitude={currentPosition[1]}>
          <PinMarker
            pinStyle={routeStyle.pinStyle}
            color={routeStyle.color}
            bearing={storyMode
              ? markerBearingRef.current - lastBearingRef.current  // 補償地圖旋轉
              : markerBearingRef.current  // 地圖不旋轉，直接使用方向
            }
          />
        </Marker>
      )}
    </Map>
    </div>
  )
})

MapView.displayName = 'MapView'

export default memo(MapView)
