import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceDot } from 'recharts'
import { GpxTrack, OverlayTheme } from '@/types/gpx'
import { useMemo } from 'react'
import { getOverlayStyles } from './overlayTheme'

interface ElevationChartProps {
  track: GpxTrack
  currentDistance: number
  totalDistance: number
  theme?: OverlayTheme
  routeColor?: string
  className?: string
  scale?: number
}

export default function ElevationChart({
  track,
  currentDistance,
  totalDistance,
  theme = 'dark',
  routeColor = '#3b82f6',
  className = '',
  scale = 1,
}: ElevationChartProps) {
  const styles = getOverlayStyles(theme)
  
  // Only recalculate when track changes
  const data = useMemo(() => {
    let distance = 0
    return track.points.map((point, i) => {
      if (i > 0) {
        const prev = track.points[i - 1]
        const R = 6371
        const dLat = (point.lat - prev.lat) * Math.PI / 180
        const dLon = (point.lon - prev.lon) * Math.PI / 180
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(prev.lat * Math.PI / 180) * Math.cos(point.lat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        distance += R * c
      }
      return {
        distance: Number(distance.toFixed(3)),
        elevation: point.ele || 0,
        index: i,
      }
    })
  }, [track])

  const currentData = useMemo(() => {
    const idx = data.findIndex(d => d.distance >= currentDistance)
    if (idx === -1) return data[data.length - 1]
    if (idx === 0) return data[0]
    
    const prev = data[idx - 1]
    const curr = data[idx]
    const ratio = (currentDistance - prev.distance) / (curr.distance - prev.distance)
    
    return {
      distance: currentDistance,
      elevation: prev.elevation + (curr.elevation - prev.elevation) * ratio,
      index: idx,
    }
  }, [data, currentDistance])

  // Progress percentage for clip path
  const progress = totalDistance > 0 ? (currentDistance / totalDistance) * 100 : 0
  const clipId = `clip-progress-${routeColor.replace('#', '')}`

  const scaleStyle = scale !== 1 ? {
    transform: `scale(${scale})`,
    transformOrigin: 'bottom left',
  } : {}

  return (
    <div className={`p-3 rounded-lg ${styles.container} ${className}`} style={scaleStyle}>
      {/* Distance and Elevation Stats */}
      <div className="flex justify-between items-center mb-2">
        <div className={`${styles.text}`}>
          <div className={`text-xs ${styles.muted}`}>距離</div>
          <span className="text-xl font-bold tabular-nums" style={{ minWidth: '5ch', display: 'inline-block' }}>
            {currentDistance.toFixed(2)}
          </span>
          <span className={`text-sm ${styles.muted}`}> / {totalDistance.toFixed(2)} km</span>
        </div>
        <div className={`text-right ${styles.text}`}>
          <div className={`text-xs ${styles.muted}`}>海拔</div>
          <span className="text-xl font-bold tabular-nums">{currentData.elevation.toFixed(0)}</span>
          <span className={`text-sm ${styles.muted}`}> m</span>
        </div>
      </div>

      {/* Elevation Chart with Progress */}
      <div className="h-14">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="elevationGradientGray" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#888" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#888" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id={`elevationGradientColor-${routeColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={routeColor} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={routeColor} stopOpacity={0.2}/>
              </linearGradient>
              <clipPath id={clipId}>
                <rect x="0" y="0" width={`${progress}%`} height="100%" />
              </clipPath>
            </defs>
            <XAxis dataKey="distance" hide />
            <YAxis 
              domain={[track.minElevation - 50, track.maxElevation + 50]} 
              hide 
            />
            {/* Background - full elevation in gray */}
            <Area 
              type="monotone" 
              dataKey="elevation" 
              stroke="#888"
              strokeOpacity={0.3}
              fill="url(#elevationGradientGray)"
              strokeWidth={1}
              isAnimationActive={false}
            />
            {/* Foreground - completed elevation in color (clipped) */}
            <Area 
              type="monotone" 
              dataKey="elevation" 
              stroke={routeColor}
              fill={`url(#elevationGradientColor-${routeColor.replace('#', '')})`}
              strokeWidth={2}
              clipPath={`url(#${clipId})`}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={currentData.distance}
              y={currentData.elevation}
              r={5}
              fill={routeColor}
              stroke={theme === 'light' ? '#000' : '#fff'}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
