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
      {/* Story Mode Toggle */}
      <div
        className="flex items-center justify-between w-full px-3 py-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => onChange({ ...settings, storyMode: !settings.storyMode })}
      >
        <span className="text-sm font-medium">跟隨視角</span>
        <div
          className={`relative w-11 h-6 rounded-full transition-colors ${
            settings.storyMode ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              settings.storyMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </div>
      </div>

      {settings.storyMode && (
        <div className="space-y-3 pl-2 border-l-2 border-primary/30">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              鏡頭縮放: {settings.storyZoom}
            </label>
            <input
              type="range"
              min={10}
              max={18}
              step={0.5}
              value={settings.storyZoom}
              onChange={e => onChange({ ...settings, storyZoom: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              俯瞰角度: {settings.storyPitch}°
            </label>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={settings.storyPitch}
              onChange={e => onChange({ ...settings, storyPitch: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      )}
      
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
