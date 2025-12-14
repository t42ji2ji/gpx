import { Toggle } from '@/components/ui/toggle'
import { Button } from '@/components/ui/button'
import { OverlaySettings as OverlaySettingsType, OVERLAY_THEMES } from '@/types/gpx'

interface OverlaySettingsProps {
  settings: OverlaySettingsType
  onChange: (settings: OverlaySettingsType) => void
}

export default function OverlaySettings({ settings, onChange }: OverlaySettingsProps) {
  const toggleOptions = [
    { key: 'showTitle', label: '標題' },
    { key: 'showElevation', label: '距離/海拔' },
    { key: 'showCompass', label: '指北針' },
  ] as const

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">主題樣式</label>
        <div className="grid grid-cols-2 gap-2">
          {OVERLAY_THEMES.map(theme => (
            <Button
              key={theme.id}
              variant={settings.theme === theme.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ ...settings, theme: theme.id })}
              className="text-xs"
            >
              {theme.name}
            </Button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">標題文字 (支援換行)</label>
        <textarea
          value={settings.title}
          onChange={e => onChange({ ...settings, title: e.target.value })}
          placeholder="輸入標題...&#10;可以換行"
          className="w-full text-sm p-2 rounded-md border bg-background resize-none"
          rows={3}
        />
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-2 block">
          標題大小: {settings.titleSize}px
        </label>
        <input
          type="range"
          min={12}
          max={48}
          value={settings.titleSize}
          onChange={e => onChange({ ...settings, titleSize: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        {toggleOptions.map(option => (
          <Toggle
            key={option.key}
            pressed={settings[option.key]}
            onPressedChange={pressed => 
              onChange({ ...settings, [option.key]: pressed })
            }
            className="w-full justify-between px-3"
          >
            <span>{option.label}</span>
            <span className="text-xs text-muted-foreground">
              {settings[option.key] ? '顯示' : '隱藏'}
            </span>
          </Toggle>
        ))}
      </div>
    </div>
  )
}
