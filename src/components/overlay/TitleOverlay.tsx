import { OverlayTheme } from '@/types/gpx'
import { getOverlayStyles } from './overlayTheme'

interface TitleOverlayProps {
  title: string
  fontSize?: number
  theme?: OverlayTheme
  className?: string
}

export default function TitleOverlay({ title, fontSize = 16, theme = 'dark', className = '' }: TitleOverlayProps) {
  if (!title) return null

  const styles = getOverlayStyles(theme)

  return (
    <div className={`px-6 py-3 rounded-lg ${styles.container} ${className}`}>
      <h1 
        className={`font-bold whitespace-pre-wrap ${styles.text}`}
        style={{ fontSize: `${fontSize}px`, lineHeight: 1.3 }}
      >
        {title}
      </h1>
    </div>
  )
}
