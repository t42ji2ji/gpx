import { motion } from 'framer-motion'
import { GpxTrack, OverlayTheme } from '@/types/gpx'
import { getOverlayStyles } from './overlayTheme'

interface CompletionSummaryProps {
  track: GpxTrack
  title?: string
  theme?: OverlayTheme
  routeColor?: string
}

export default function CompletionSummary({ 
  track, 
  title,
  theme = 'dark',
  routeColor = '#3b82f6'
}: CompletionSummaryProps) {
  const styles = getOverlayStyles(theme)

  const stats = [
    { label: '總距離', value: `${track.totalDistance.toFixed(2)} km` },
    { label: '總爬升', value: `${track.elevationGain.toFixed(0)} m` },
    { label: '總下降', value: `${track.elevationLoss.toFixed(0)} m` },
    { label: '最高海拔', value: `${track.maxElevation.toFixed(0)} m` },
    { label: '最低海拔', value: `${track.minElevation.toFixed(0)} m` },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl overflow-auto p-2"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`p-4 sm:p-6 rounded-2xl ${styles.container} max-w-xs w-full mx-2 my-auto flex-shrink-0`}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-4 sm:mb-6"
        >
          <div
            className="text-3xl sm:text-4xl mb-2"
            style={{ color: routeColor }}
          >
            🎉
          </div>
          <h2 className={`text-xl sm:text-2xl font-bold ${styles.text}`}>
            完成！
          </h2>
          {title && (
            <p className={`mt-1 sm:mt-2 text-sm sm:text-base ${styles.subtext}`}>{title}</p>
          )}
        </motion.div>

        <div className="space-y-2 sm:space-y-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex justify-between items-center"
            >
              <span className={`text-xs sm:text-sm ${styles.subtext}`}>{stat.label}</span>
              <span className={`text-sm sm:text-base font-bold tabular-nums ${styles.text}`}>{stat.value}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-4 sm:mt-6 h-1 rounded-full"
          style={{ backgroundColor: routeColor }}
        />
      </motion.div>
    </motion.div>
  )
}
