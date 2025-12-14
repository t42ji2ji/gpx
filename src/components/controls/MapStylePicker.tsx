import { Button } from '@/components/ui/button'
import { MAP_STYLES } from '@/types/gpx'

interface MapStylePickerProps {
  selected: string
  onChange: (styleId: string) => void
}

export default function MapStylePicker({ selected, onChange }: MapStylePickerProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {MAP_STYLES.map(style => (
          <Button
            key={style.id}
            variant={selected === style.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(style.id)}
            className="text-xs"
          >
            {style.name}
          </Button>
        ))}
      </div>
    </div>
  )
}
