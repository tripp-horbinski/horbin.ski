// Contour lines from an elevation grid: marching squares, joined into
// polylines and simplified. Everything is in the grid's own pixel units, row 0
// at the north edge.

// The polylines where the grid crosses `level`. `inside(i)` can rule out cells
// by the index of their top-left corner, e.g. to keep lake depths off the land.
export function contourLines(z, w, h, level, inside) {
  const segA = []
  const segB = []
  // Each crossing is named by the cell edge it sits on: even ids run along a
  // row to the next column, odd ids down a column to the next row
  const H = (x, y) => (y * w + x) * 2
  const V = (x, y) => (y * w + x) * 2 + 1
  const add = (a, b) => {
    segA.push(a)
    segB.push(b)
  }

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const i = y * w + x
      if (inside && !inside(i)) continue
      const c = (z[i] > level ? 8 : 0) | (z[i + 1] > level ? 4 : 0) | (z[i + w + 1] > level ? 2 : 0) | (z[i + w] > level ? 1 : 0)
      if (c === 0 || c === 15) continue
      const T = H(x, y)
      const R = V(x + 1, y)
      const B = H(x, y + 1)
      const L = V(x, y)
      switch (c) {
        case 1: case 14: add(L, B); break
        case 2: case 13: add(B, R); break
        case 3: case 12: add(L, R); break
        case 4: case 11: add(T, R); break
        case 6: case 9: add(T, B); break
        case 7: case 8: add(L, T); break
        default: {
          // A saddle: when the middle is above, the high corners join through
          // it and the line cuts off each low corner instead
          const middle = (z[i] + z[i + 1] + z[i + w] + z[i + w + 1]) / 4 > level
          if ((c === 5) === middle) {
            add(L, T)
            add(B, R)
          } else {
            add(L, B)
            add(T, R)
          }
        }
      }
    }
  }

  const point = (e) => {
    const k = e >> 1
    const x = k % w
    const y = (k / w) | 0
    const a = z[k]
    const b = e & 1 ? z[k + w] : z[k + 1]
    const t = (level - a) / (b - a)
    return e & 1 ? [x, y + t] : [x + t, y]
  }

  // Each edge is shared by at most two segments, so chains follow edge to edge
  const byEdge = new Map()
  const link = (e, s) => {
    const list = byEdge.get(e)
    if (list) list.push(s)
    else byEdge.set(e, [s])
  }
  for (let s = 0; s < segA.length; s++) {
    link(segA[s], s)
    link(segB[s], s)
  }
  const used = new Uint8Array(segA.length)
  const extend = (chain) => {
    for (;;) {
      const e = chain[chain.length - 1]
      const next = byEdge.get(e).find((s) => !used[s])
      if (next === undefined) return
      used[next] = 1
      chain.push(segA[next] === e ? segB[next] : segA[next])
    }
  }

  const lines = []
  for (let s = 0; s < segA.length; s++) {
    if (used[s]) continue
    used[s] = 1
    const chain = [segA[s], segB[s]]
    extend(chain)
    chain.reverse()
    extend(chain)
    lines.push(chain.map(point))
  }
  return lines
}

// Douglas–Peucker: drop points within `tolerance` of the line they sit on
export function simplify(points, tolerance) {
  if (points.length < 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    const [ax, ay] = points[a]
    const [bx, by] = points[b]
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy)
    let far = 0
    let at = -1
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i]
      const d = len ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / len : Math.hypot(px - ax, py - ay)
      if (d > far) {
        far = d
        at = i
      }
    }
    if (far > tolerance) {
      keep[at] = 1
      stack.push([a, at], [at, b])
    }
  }
  return points.filter((_, i) => keep[i])
}

// Box blur, a few passes, to take the lidar's fine noise out before tracing
export function blur({ data, width: w, height: h }, passes) {
  let a = Float32Array.from(data)
  const b = new Float32Array(a.length)
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const l = a[y * w + Math.max(0, x - 1)]
        const r = a[y * w + Math.min(w - 1, x + 1)]
        b[y * w + x] = (l + a[y * w + x] + r) / 3
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = b[Math.max(0, y - 1) * w + x]
        const d = b[Math.min(h - 1, y + 1) * w + x]
        a[y * w + x] = (u + b[y * w + x] + d) / 3
      }
    }
  }
  return a
}

// SVG path data for polylines, scaled into the output frame
export function pathData(lines, scale, decimals = 1) {
  const f = (n) => +(n * scale).toFixed(decimals)
  return lines.map((l) => l.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('')).join('')
}

// Total length of a polyline, in its own units
export const lengthOf = (l) => l.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - l[i - 1][0], p[1] - l[i - 1][1]) : 0), 0)
