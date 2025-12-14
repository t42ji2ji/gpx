import { OverlayTheme, GpxTrack } from '@/types/gpx'

interface ThemeColors {
  background: string
  backgroundAlpha: number
  text: string
  muted: string
  chartFill: string
  chartFillAlpha: number
}

function getThemeColors(theme: OverlayTheme): ThemeColors {
  switch (theme) {
    case 'dark':
      return {
        background: '#000000',
        backgroundAlpha: 0.5,
        text: '#ffffff',
        muted: '#9ca3af',
        chartFill: '#888888',
        chartFillAlpha: 0.3,
      }
    case 'light':
      return {
        background: '#ffffff',
        backgroundAlpha: 0.6,
        text: '#111827',
        muted: '#6b7280',
        chartFill: '#888888',
        chartFillAlpha: 0.3,
      }
    case 'shadow':
      return {
        background: 'transparent',
        backgroundAlpha: 0,
        text: '#ffffff',
        muted: '#ffffffcc',
        chartFill: '#ffffff',
        chartFillAlpha: 0.3,
      }
    case 'glass':
      return {
        background: '#ffffff',
        backgroundAlpha: 0.2,
        text: '#ffffff',
        muted: '#ffffffb3',
        chartFill: '#ffffff',
        chartFillAlpha: 0.3,
      }
  }
}

export interface OverlayRenderOptions {
  width: number
  height: number
  theme: OverlayTheme
  routeColor: string
  showTitle: boolean
  showElevation: boolean
  showCompass: boolean
  title: string
  titleSize: number
  currentDistance: number
  totalDistance: number
  currentElevation: number
  track: GpxTrack | null
  aspectRatio: string
}

export class CanvasOverlayRenderer {
  private ctx: CanvasRenderingContext2D

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  render(options: OverlayRenderOptions): void {
    const { width, height } = options

    // Scale factor - use the larger dimension to ensure overlays are readable
    // This makes overlays appear similar size across different aspect ratios
    const maxDimension = Math.max(width, height)
    const scale = maxDimension / 1920

    if (options.showTitle && options.title) {
      this.renderTitle(options, scale)
    }

    if (options.showElevation && options.track) {
      this.renderElevationChart(options, scale)
    }

    if (options.showCompass) {
      this.renderCompass(options, scale)
    }
  }

  private renderTitle(options: OverlayRenderOptions, scale: number): void {
    const { title, titleSize, theme } = options
    const colors = getThemeColors(theme)
    const ctx = this.ctx

    const padding = 16 * scale
    const fontSize = titleSize * scale * 1.5
    const lines = title.split('\n')
    const lineHeight = fontSize * 1.3

    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

    // Measure text for background
    let maxWidth = 0
    for (const line of lines) {
      const metrics = ctx.measureText(line)
      maxWidth = Math.max(maxWidth, metrics.width)
    }

    const boxWidth = maxWidth + padding * 2
    const boxHeight = lines.length * lineHeight + padding * 1.5
    const x = padding
    const y = padding

    // Draw background
    if (colors.backgroundAlpha > 0) {
      ctx.fillStyle = colors.background
      ctx.globalAlpha = colors.backgroundAlpha
      this.roundRect(x, y, boxWidth, boxHeight, 8 * scale)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Draw text shadow for shadow theme
    if (theme === 'shadow') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 4 * scale
      ctx.shadowOffsetX = 2 * scale
      ctx.shadowOffsetY = 2 * scale
    }

    // Draw text
    ctx.fillStyle = colors.text
    ctx.textBaseline = 'top'
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x + padding, y + padding * 0.75 + i * lineHeight)
    }

    // Reset shadow
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }

  private renderElevationChart(options: OverlayRenderOptions, scale: number): void {
    const { width, height, theme, routeColor, currentDistance, totalDistance, currentElevation, track, aspectRatio } = options
    if (!track) return

    const colors = getThemeColors(theme)
    const ctx = this.ctx

    const padding = 16 * scale
    const chartPadding = 12 * scale

    // Chart dimensions - responsive based on aspect ratio
    const isVertical = aspectRatio === '9:16'
    const chartWidth = isVertical ? width - padding * 2 : 288 * scale
    const chartHeight = 56 * scale
    const boxHeight = chartHeight + 60 * scale

    const x = padding
    const y = height - padding - boxHeight

    // Draw background
    if (colors.backgroundAlpha > 0) {
      ctx.fillStyle = colors.background
      ctx.globalAlpha = colors.backgroundAlpha
      this.roundRect(x, y, chartWidth, boxHeight, 8 * scale)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Draw text shadow for shadow theme
    if (theme === 'shadow') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 4 * scale
      ctx.shadowOffsetX = 2 * scale
      ctx.shadowOffsetY = 2 * scale
    }

    // Draw distance label
    ctx.font = `${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillStyle = colors.muted
    ctx.textBaseline = 'top'
    ctx.fillText('距離', x + chartPadding, y + chartPadding)

    // Draw distance value
    ctx.font = `bold ${20 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillStyle = colors.text
    ctx.fillText(currentDistance.toFixed(2), x + chartPadding, y + chartPadding + 14 * scale)

    // Draw total distance
    ctx.font = `${14 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillStyle = colors.muted
    const distText = ctx.measureText(currentDistance.toFixed(2))
    ctx.fillText(` / ${totalDistance.toFixed(2)} km`, x + chartPadding + distText.width + 4 * scale, y + chartPadding + 18 * scale)

    // Draw elevation label (right side)
    ctx.font = `${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillStyle = colors.muted
    ctx.textAlign = 'right'
    ctx.fillText('海拔', x + chartWidth - chartPadding, y + chartPadding)

    // Draw elevation value
    ctx.font = `bold ${20 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillStyle = colors.text
    const elevText = `${currentElevation.toFixed(0)}`
    ctx.fillText(elevText, x + chartWidth - chartPadding - 24 * scale, y + chartPadding + 14 * scale)

    // Draw elevation unit
    ctx.font = `${14 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillStyle = colors.muted
    ctx.fillText(' m', x + chartWidth - chartPadding, y + chartPadding + 18 * scale)

    ctx.textAlign = 'left'

    // Reset shadow before drawing chart
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    // Draw elevation chart
    const chartX = x + chartPadding
    const chartY = y + 48 * scale
    const chartW = chartWidth - chartPadding * 2
    const chartH = chartHeight

    this.drawElevationPath(track, chartX, chartY, chartW, chartH, colors.chartFill, colors.chartFillAlpha)

    // Draw progress overlay
    const progress = totalDistance > 0 ? currentDistance / totalDistance : 0
    ctx.save()
    ctx.beginPath()
    ctx.rect(chartX, chartY, chartW * progress, chartH)
    ctx.clip()
    this.drawElevationPath(track, chartX, chartY, chartW, chartH, routeColor, 0.8)
    ctx.restore()

    // Draw current position dot
    const dotX = chartX + chartW * progress
    const dotY = this.getElevationY(track, progress, chartY, chartH)
    ctx.beginPath()
    ctx.arc(dotX, dotY, 5 * scale, 0, Math.PI * 2)
    ctx.fillStyle = routeColor
    ctx.fill()
    ctx.strokeStyle = theme === 'light' ? '#000' : '#fff'
    ctx.lineWidth = 2 * scale
    ctx.stroke()
  }

  private drawElevationPath(
    track: GpxTrack,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    alpha: number
  ): void {
    const ctx = this.ctx
    const points = track.points
    const minElev = track.minElevation - 50
    const maxElev = track.maxElevation + 50
    const elevRange = maxElev - minElev

    ctx.beginPath()
    ctx.moveTo(x, y + height)

    for (let i = 0; i < points.length; i++) {
      const px = x + (i / (points.length - 1)) * width
      const elev = points[i].ele || 0
      const py = y + height - ((elev - minElev) / elevRange) * height
      if (i === 0) {
        ctx.lineTo(px, py)
      } else {
        ctx.lineTo(px, py)
      }
    }

    ctx.lineTo(x + width, y + height)
    ctx.closePath()

    ctx.fillStyle = color
    ctx.globalAlpha = alpha
    ctx.fill()
    ctx.globalAlpha = 1

    // Draw line on top
    ctx.beginPath()
    for (let i = 0; i < points.length; i++) {
      const px = x + (i / (points.length - 1)) * width
      const elev = points[i].ele || 0
      const py = y + height - ((elev - minElev) / elevRange) * height
      if (i === 0) {
        ctx.moveTo(px, py)
      } else {
        ctx.lineTo(px, py)
      }
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.globalAlpha = alpha + 0.2
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  private getElevationY(track: GpxTrack, progress: number, chartY: number, chartH: number): number {
    const points = track.points
    const minElev = track.minElevation - 50
    const maxElev = track.maxElevation + 50
    const elevRange = maxElev - minElev

    const index = Math.floor(progress * (points.length - 1))
    const elev = points[Math.min(index, points.length - 1)]?.ele || 0

    return chartY + chartH - ((elev - minElev) / elevRange) * chartH
  }

  private renderCompass(options: OverlayRenderOptions, scale: number): void {
    const { width, theme } = options
    const colors = getThemeColors(theme)
    const ctx = this.ctx

    const size = 48 * scale
    const x = width / 2
    const y = 16 * scale + size / 2

    // Draw background circle
    if (colors.backgroundAlpha > 0) {
      ctx.beginPath()
      ctx.arc(x, y, size / 2, 0, Math.PI * 2)
      ctx.fillStyle = colors.background
      ctx.globalAlpha = colors.backgroundAlpha
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Draw compass arrow (pointing north - up)
    ctx.save()
    ctx.translate(x, y)

    // North arrow (red)
    ctx.beginPath()
    ctx.moveTo(0, -size * 0.35)
    ctx.lineTo(-size * 0.12, size * 0.1)
    ctx.lineTo(0, 0)
    ctx.lineTo(size * 0.12, size * 0.1)
    ctx.closePath()
    ctx.fillStyle = '#ef4444'
    ctx.fill()

    // South arrow (white/gray)
    ctx.beginPath()
    ctx.moveTo(0, size * 0.35)
    ctx.lineTo(-size * 0.12, -size * 0.1)
    ctx.lineTo(0, 0)
    ctx.lineTo(size * 0.12, -size * 0.1)
    ctx.closePath()
    ctx.fillStyle = colors.text
    ctx.globalAlpha = 0.6
    ctx.fill()
    ctx.globalAlpha = 1

    // N label
    ctx.font = `bold ${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    ctx.fillStyle = '#ef4444'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('N', 0, -size * 0.35 - 2 * scale)

    ctx.restore()
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }
}
