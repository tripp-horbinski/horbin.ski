import { TRAIL_MAP } from '@/lib/maps'

// The Ice Age Trail across Wisconsin, every segment OpenStreetMap has, with
// the Parnell segment from the Projects map picked out
export default function TrailMap() {
  const { width, height, outline, route, segment, ends } = TRAIL_MAP
  return (
    <svg
      className="trail-map"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Map of Wisconsin with the Ice Age Trail's segments from St. Croix Falls to Sturgeon Bay, the Parnell segment highlighted"
    >
      <path className="trail-map-state" d={outline} />
      <path className="trail-map-route" d={route} />
      <path className="trail-map-segment" d={segment} />
      {ends.map(([x, y]) => (
        <circle key={x} className="trail-map-end" cx={x} cy={y} r="9" />
      ))}
    </svg>
  )
}
