interface CompassProps {
  bearing?: number
  className?: string
}

export default function Compass({ bearing = 0, className = '' }: CompassProps) {
  return (
    <div className={`bg-black/70 p-2 rounded-full backdrop-blur-sm ${className}`}>
      <div 
        className="w-12 h-12 relative"
        style={{ transform: `rotate(${-bearing}deg)` }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#666" strokeWidth="2" />
          <polygon points="50,10 45,50 55,50" fill="#ef4444" />
          <polygon points="50,90 45,50 55,50" fill="#fff" />
          <text x="50" y="8" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">N</text>
        </svg>
      </div>
    </div>
  )
}
