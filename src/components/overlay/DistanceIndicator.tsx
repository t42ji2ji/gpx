import { OverlayTheme } from '@/types/gpx'
import { getOverlayStyles } from './overlayTheme'

interface DistanceIndicatorProps {
  currentDistance: number
  totalDistance: number
  theme?: OverlayTheme
  routeColor?: string
  className?: string
}

export default function DistanceIndicator({ 
  currentDistance, 
  totalDistance,
  theme = 'dark',
  routeColor = '#3b82f6',
  className = '' 
}: DistanceIndicatorProps) {
  const progress = totalDistance > 0 ? (currentDistance / totalDistance) * 100 : 0
  const styles = getOverlayStyles(theme)

  return (
    <div className={`px-4 py-2 rounded-lg ${styles.container} ${className}`}>
      <div className={`text-2xl font-bold ${styles.text}`}>
        <span className="inline-block tabular-nums" style={{ minWidth: '5ch' }}>{currentDistance.toFixed(2)}</span>
        <span className={`text-lg ${styles.muted}`}> / {totalDistance.toFixed(2)} km</span>
      </div>
      <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${styles.bar}`}>
        <div 
          className="h-full"
          style={{ width: `${progress}%`, backgroundColor: routeColor }}
        />
      </div>
    </div>
  )
}
