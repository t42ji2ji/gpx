import { Button } from '@/components/ui/button'
import { VideoSettings as VideoSettingsType, ASPECT_RATIOS } from '@/types/gpx'

interface VideoSettingsProps {
  settings: VideoSettingsType
  onChange: (settings: VideoSettingsType) => void
}

const ASPECT_RATIO_OPTIONS = [
  { value: '16:9', label: '16:9 橫式' },
  { value: '9:16', label: '9:16 直式' },
  { value: '1:1', label: '1:1 方形' },
  { value: '4:3', label: '4:3 傳統' },
] as const

export default function VideoSettings({ settings, onChange }: VideoSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">畫面比例</label>
        <div className="grid grid-cols-2 gap-2">
          {ASPECT_RATIO_OPTIONS.map(option => (
            <Button
              key={option.value}
              variant={settings.aspectRatio === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ ...settings, aspectRatio: option.value })}
              className="text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {ASPECT_RATIOS[settings.aspectRatio].width} x {ASPECT_RATIOS[settings.aspectRatio].height}
        </p>
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-2 block">
          影片長度: {settings.duration}s
        </label>
        <input
          type="range"
          min={5}
          max={60}
          value={settings.duration}
          onChange={e => onChange({ ...settings, duration: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-2 block">
          FPS: {settings.fps}
        </label>
        <input
          type="range"
          min={15}
          max={60}
          step={5}
          value={settings.fps}
          onChange={e => onChange({ ...settings, fps: Number(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  )
}
