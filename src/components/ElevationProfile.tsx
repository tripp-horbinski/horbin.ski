import { PROFILE } from '@/lib/maps'

const W = 600
const H = 80
const feet = (n: number) => `${n.toLocaleString('en-US')} ft`

// The footer: the climb from Chautauqua Meadow to Green Mountain's summit,
// sampled from the same lidar as the meadow, gridded every thousand feet
export default function ElevationProfile() {
  const { from, to, miles, points } = PROFILE
  const lo = Math.floor(Math.min(...points) / 500) * 500
  const hi = Math.ceil(Math.max(...points) / 500) * 500
  const y = (ft: number) => (H - 2 - ((ft - lo) / (hi - lo)) * (H - 8)).toFixed(1)
  const line = points.map((ft, i) => `${i ? 'L' : 'M'}${((i * W) / (points.length - 1)).toFixed(1)} ${y(ft)}`).join('')
  const grid = []
  for (let ft = Math.ceil(lo / 1000) * 1000; ft < hi; ft += 1000) grid.push(`M0 ${y(ft)}H${W}`)
  const start = points[0]
  const end = points[points.length - 1]

  return (
    <footer className="profile">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <path className="profile-grid" d={grid.join('')} />
        <path className="profile-fill" d={`${line}L${W} ${H}L0 ${H}Z`} />
        <path className="profile-line" d={line} />
      </svg>
      <p className="profile-peak">
        {to} <b>{feet(end)}</b>
      </p>
      <p className="profile-foot">
        <span>
          {from} <b>{feet(start)}</b>
        </span>
        <span>{miles} mi as the crow flies &middot; USGS 3DEP lidar</span>
      </p>
    </footer>
  )
}
