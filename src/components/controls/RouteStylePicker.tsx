import { RouteStyle } from '@/types/gpx'

interface RouteStylePickerProps {
  style: RouteStyle
  onChange: (style: RouteStyle) => void
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#ffffff', // white
]

export default function RouteStylePicker({ style, onChange }: RouteStylePickerProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">顏色</label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              onClick={() => onChange({ ...style, color })}
              className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                style.color === color ? 'border-foreground scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={style.color}
            onChange={e => onChange({ ...style, color: e.target.value })}
            className="w-7 h-7 rounded cursor-pointer"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-2 block">
          線條寬度: {style.width}px
        </label>
        <input
          type="range"
          min={2}
          max={10}
          value={style.width}
          onChange={e => onChange({ ...style, width: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-2 block">
          透明度: {Math.round(style.opacity * 100)}%
        </label>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.1}
          value={style.opacity}
          onChange={e => onChange({ ...style, opacity: Number(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  )
}
