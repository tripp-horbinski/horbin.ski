// The meadow's colors, at 2:45 on a late-summer afternoon. Earlier versions of
// the scene ran through a whole day, in git history at commit `b69c683`.

export const PALETTE = {
  sky0: '#467cc3', sky1: '#8ab0d9', sky2: '#e0e2dd', glow: '#fff6e2',
  cloudHi: '#fffcf4', cloudLit: '#f1f0eb', cloudShade: '#b9c3d1',
  mtn: '#3b5839', mtnDark: '#283f2a', mtnLit: '#617f48',
  rockHi: '#dbb8aa', rockLit: '#c1988b', rockShade: '#826665', talus: '#baa190',
  pineDark: '#1e3322', pineLit: '#45623a',
  meadowFar: '#e7c97a', meadowMid: '#d9ab4e', meadowNear: '#ca9336',
  grassDark: '#946527', grassMid: '#ce9a3f', grassLit: '#f1ce7b', seed: '#f8e2a4',
  trail: '#dcb48b', verge: '#7d9943',
  // Color of the light itself; the trail post, birds and insects are multiplied by it
  light: '#fff9ed',
}

export type Palette = typeof PALETTE

const toHex = (rgb: number[]) =>
  '#' + rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')

export function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

// Straight RGB blend
export function blend(a: string, b: string, t: number) {
  const x = parseInt(a.slice(1), 16)
  const y = parseInt(b.slice(1), 16)
  return toHex([16, 8, 0].map((sh) => ((x >> sh) & 255) + (((y >> sh) & 255) - ((x >> sh) & 255)) * t))
}

// Multiply a surface color by the light falling on it
export function lit(hex: string, light: string) {
  const a = parseInt(hex.slice(1), 16)
  const b = parseInt(light.slice(1), 16)
  const ch = (n: number) => [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const [lr, lg, lb] = ch(b)
  const sat = Math.min(1, Math.max(0, ((0.3 * lr + 0.59 * lg + 0.11 * lb) / 255 - 0.25) / 0.55))
  const base = ch(a)
  const gray = 0.3 * base[0] + 0.59 * base[1] + 0.11 * base[2]
  return toHex(base.map((c, i) => ((gray + (c - gray) * sat) * [lr, lg, lb][i]) / 255))
}
