export type IconName =
  | 'globe'
  | 'chart-bar'
  | 'user'
  | 'user-plus'
  | 'chevron-left'
  | 'check-circle'
  | 'alert-triangle'
  | 'alert-octagon'
  | 'activity'
  | 'footprints'
  | 'clipboard-list'
  | 'bluetooth'
  | 'camera'
  | 'file-text'
  | 'chair'

interface IconProps {
  name: IconName
  size?: number
  className?: string
  style?: React.CSSProperties
}

// Simple stroke icons built from basic SVG primitives (circle/rect/line/
// polyline), not an icon-font or external library — keeps the bundle small
// and everything offline. currentColor so each usage just sets CSS color.
const PATHS: Record<IconName, React.ReactNode> = {
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </>
  ),
  'chart-bar': (
    <>
      <line x1="3" y1="21" x2="21" y2="21" />
      <rect x="5" y="13" width="3.5" height="8" rx="0.5" />
      <rect x="10.25" y="8" width="3.5" height="13" rx="0.5" />
      <rect x="15.5" y="4" width="3.5" height="17" rx="0.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </>
  ),
  'user-plus': (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 20c0-4 3-7 7-7s7 3 7 7" />
      <line x1="19" y1="7" x2="19" y2="13" />
      <line x1="16" y1="10" x2="22" y2="10" />
    </>
  ),
  'chevron-left': <polyline points="15 6 9 12 15 18" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="8 12.5 11 15.5 16 9" />
    </>
  ),
  'alert-triangle': (
    <>
      <path d="M12 3.5 21.5 20h-19z" />
      <line x1="12" y1="9.5" x2="12" y2="14" />
      <line x1="12" y1="16.7" x2="12" y2="16.9" />
    </>
  ),
  'alert-octagon': (
    <>
      <polygon points="8 2 16 2 22 8 22 16 16 22 8 22 2 16 2 8" />
      <line x1="12" y1="8" x2="12" y2="12.5" />
      <line x1="12" y1="15.2" x2="12" y2="15.4" />
    </>
  ),
  activity: <polyline points="2 12 7 12 9.5 5.5 13.5 18.5 16 12 22 12" />,
  footprints: (
    <>
      <ellipse cx="8" cy="16.5" rx="2.6" ry="4.6" transform="rotate(-18 8 16.5)" />
      <ellipse cx="16" cy="7.5" rx="2.6" ry="4.6" transform="rotate(18 16 7.5)" />
    </>
  ),
  'clipboard-list': (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <rect x="9" y="2" width="6" height="3" rx="1" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="16" y2="15" />
      <line x1="8" y1="18.5" x2="13" y2="18.5" />
    </>
  ),
  bluetooth: <polyline points="6.5 6.5 17.5 17.5 12 22.5 12 1.5 17.5 6.5 6.5 17.5" />,
  camera: (
    <>
      <path d="M3 8a2 2 0 0 1 2-2h2.5l1.8-2h5.4l1.8 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.8" />
    </>
  ),
  'file-text': (
    <>
      <path d="M6 2h9l5 5v15H6z" />
      <polyline points="15 2 15 7 20 7" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </>
  ),
  chair: (
    <>
      <path d="M6 4v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4" />
      <line x1="6" y1="13" x2="18" y2="13" />
      <line x1="6.5" y1="15" x2="6.5" y2="21" />
      <line x1="17.5" y1="15" x2="17.5" y2="21" />
    </>
  ),
}

export function Icon({ name, size = 20, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
