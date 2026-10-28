// Time-of-day palettes for the meadow. Stops are keyed by hour and blended in
// OKLab so the light passes through dawn and dusk without going muddy. The
// golden hour and sunset stops follow when the sun really reaches and leaves
// the meadow, as measured from the lidar horizon.

import { TERRAIN } from './terrain'

const [RISE, SHADE] = TERRAIN.sunlit ?? [6.35, 18.6]

type Stop = {
  sky0: string; sky1: string; sky2: string; glow: string
  cloudHi: string; cloudLit: string; cloudShade: string; far: string
  mtn: string; mtnDark: string; mtnLit: string
  rockHi: string; rockLit: string; rockShade: string; rockLine: string; talus: string
  pineDark: string; pineLit: string
  meadowFar: string; meadowMid: string; meadowNear: string
  grassDark: string; grassMid: string; grassLit: string; seed: string
  trail: string; verge: string; bush: string
  // Color of the light itself; the trail post, birds and insects are multiplied by it
  light: string
}

export type PaletteKey = keyof Stop
export type Palette = Record<PaletteKey, string>

const NIGHT: Stop = {
  sky0: '#090E1D', sky1: '#131B31', sky2: '#253049', glow: '#3A4566',
  cloudHi: '#3A4560', cloudLit: '#2B344D', cloudShade: '#1B2336', far: '#1A2233',
  mtn: '#121A1F', mtnDark: '#0B1115', mtnLit: '#1A2528',
  rockHi: '#4D4D5C', rockLit: '#3A3B48', rockShade: '#262733', rockLine: '#1D1D27', talus: '#2C2D36',
  pineDark: '#0A0F12', pineLit: '#141C1F',
  meadowFar: '#2B2E33', meadowMid: '#23262A', meadowNear: '#1C1F23',
  grassDark: '#15181B', grassMid: '#2A2E34', grassLit: '#454C56', seed: '#5E6674',
  trail: '#3C3F47', verge: '#1E2522', bush: '#1D2822', light: '#4A5670',
}

const PREDAWN: Stop = {
  sky0: '#1A2547', sky1: '#3D4A75', sky2: '#A08DA6', glow: '#E3A79A',
  cloudHi: '#C2A6B4', cloudLit: '#857A96', cloudShade: '#4E5170', far: '#4B5370',
  mtn: '#1E2A30', mtnDark: '#151E24', mtnLit: '#2B3A3C',
  rockHi: '#957884', rockLit: '#705D6B', rockShade: '#463C4C', rockLine: '#3A3040', talus: '#554A58',
  pineDark: '#10181A', pineLit: '#1D2A28',
  meadowFar: '#5E5550', meadowMid: '#4C4642', meadowNear: '#3B3735',
  grassDark: '#2A2725', grassMid: '#4C4540', grassLit: '#7A6E66', seed: '#8E8279',
  trail: '#6E6462', verge: '#2E3A30', bush: '#2E3D30', light: '#8C849C',
}

// The sun comes up behind you and the east-facing slabs light up first
const ALPENGLOW: Stop = {
  sky0: '#4F6FA6', sky1: '#A2B2CE', sky2: '#F2CAB0', glow: '#FFB38A',
  cloudHi: '#FFE5CA', cloudLit: '#F5BBA2', cloudShade: '#A88FA6', far: '#8D90A8',
  mtn: '#3A4A3A', mtnDark: '#2A372C', mtnLit: '#6E6A44',
  rockHi: '#FFB685', rockLit: '#EF8C5E', rockShade: '#A85A4E', rockLine: '#8A4A44', talus: '#C98A6E',
  pineDark: '#1E2A22', pineLit: '#45502F',
  meadowFar: '#CFA066', meadowMid: '#A98048', meadowNear: '#85643A',
  grassDark: '#5C4428', grassMid: '#9C7442', grassLit: '#DCA866', seed: '#EEC28A',
  trail: '#C49A80', verge: '#4E6038', bush: '#6A8A3A', light: '#F6C6A2',
}

const MORNING: Stop = {
  sky0: '#5B8BC4', sky1: '#A2C0DB', sky2: '#E3E6DA', glow: '#FFF0D0',
  cloudHi: '#FFFDF6', cloudLit: '#F1F0EA', cloudShade: '#BAC5D2', far: '#A4B4B8',
  mtn: '#45613F', mtnDark: '#2F4730', mtnLit: '#6D8A55',
  rockHi: '#EEC2A6', rockLit: '#D29E86', rockShade: '#93685E', rockLine: '#7B5550', talus: '#C4A08C',
  pineDark: '#223725', pineLit: '#44603A',
  meadowFar: '#E2C47E', meadowMid: '#CFA650', meadowNear: '#BE8F38',
  grassDark: '#8E6526', grassMid: '#C29440', grassLit: '#E9C677', seed: '#F3DEA2',
  trail: '#DDBB95', verge: '#7C9545', bush: '#8DBF45', light: '#FFF4E6',
}

// Late-summer midday, the hour of the photograph
const MIDDAY: Stop = {
  sky0: '#3C76C6', sky1: '#7DA8DA', sky2: '#D6E3EC', glow: '#FFFFFF',
  cloudHi: '#FFFFFF', cloudLit: '#F2F5F8', cloudShade: '#BCC9DA', far: '#A7B9C4',
  mtn: '#3E5E3A', mtnDark: '#29432B', mtnLit: '#6A8C4C',
  rockHi: '#E8C6B8', rockLit: '#CDA294', rockShade: '#8C6C68', rockLine: '#765856', talus: '#C9AE9A',
  pineDark: '#1F3523', pineLit: '#46663A',
  meadowFar: '#E6CB80', meadowMid: '#D8AE52', meadowNear: '#C9963A',
  grassDark: '#94692A', grassMid: '#CB9B42', grassLit: '#EFCD7C', seed: '#F7E3A8',
  trail: '#D9B48E', verge: '#7E9A44', bush: '#9ACB45', light: '#FFFFFF',
}

const AFTERNOON: Stop = {
  sky0: '#4A7EC2', sky1: '#8FB3D8', sky2: '#E4E2D6', glow: '#FFF2D6',
  cloudHi: '#FFFBF0', cloudLit: '#F1EEE6', cloudShade: '#B8C0CD', far: '#A3AFB6',
  mtn: '#3A5638', mtnDark: '#273E2A', mtnLit: '#5E7A46',
  rockHi: '#D6B2A4', rockLit: '#BC9488', rockShade: '#7E6464', rockLine: '#6A5052', talus: '#B49C8C',
  pineDark: '#1E3222', pineLit: '#45603A',
  meadowFar: '#E8C878', meadowMid: '#DAAA4C', meadowNear: '#CB9234',
  grassDark: '#946426', grassMid: '#CF9A3E', grassLit: '#F2CF7A', seed: '#F9E2A2',
  trail: '#DDB48A', verge: '#7C9842', bush: '#9AC842', light: '#FFF6E6',
}

// Sun in the west, behind the mountain: the slabs fall into shade, the grass glows
const GOLDEN: Stop = {
  sky0: '#6A8BBC', sky1: '#C2C1C4', sky2: '#F6D6A0', glow: '#FFD08A',
  cloudHi: '#FFE8BA', cloudLit: '#F3CFA0', cloudShade: '#A79EA9', far: '#9C9AA6',
  mtn: '#2E4634', mtnDark: '#213426', mtnLit: '#4E5E40',
  rockHi: '#B89688', rockLit: '#9C7C78', rockShade: '#6A5258', rockLine: '#5A444A', talus: '#9A8078',
  pineDark: '#1B2A20', pineLit: '#626838',
  meadowFar: '#F2C66C', meadowMid: '#E8A845', meadowNear: '#D08A2E',
  grassDark: '#8E5A20', grassMid: '#D8953A', grassLit: '#FFD37A', seed: '#FFE9AA',
  trail: '#E6B582', verge: '#86923C', bush: '#A8B43E', light: '#FFD9A8',
}

const SUNSET: Stop = {
  sky0: '#58689C', sky1: '#C79A9E', sky2: '#F7B77A', glow: '#FF9E5E',
  cloudHi: '#FFC99C', cloudLit: '#F2A28A', cloudShade: '#7E6A88', far: '#7A6F86',
  mtn: '#2E2C42', mtnDark: '#24223A', mtnLit: '#3C3850',
  rockHi: '#725A6A', rockLit: '#5E4C5E', rockShade: '#3E3448', rockLine: '#33293C', talus: '#554656',
  pineDark: '#1A1C26', pineLit: '#2A2A34',
  meadowFar: '#A88660', meadowMid: '#8C6C48', meadowNear: '#6E5338',
  grassDark: '#4A3826', grassMid: '#7E6040', grassLit: '#B8905E', seed: '#D6AA7A',
  trail: '#9C8070', verge: '#4A4C3A', bush: '#4E5A36', light: '#D8A890',
}

const DUSK: Stop = {
  sky0: '#232D55', sky1: '#585884', sky2: '#C88A86', glow: '#E59A7E',
  cloudHi: '#A87C8C', cloudLit: '#7A6280', cloudShade: '#3E3A58', far: '#3E3C56',
  mtn: '#1C1E2C', mtnDark: '#151724', mtnLit: '#262838',
  rockHi: '#4A4250', rockLit: '#3E3846', rockShade: '#2A2634', rockLine: '#221E2C', talus: '#36303E',
  pineDark: '#10131A', pineLit: '#1A1D26',
  meadowFar: '#4E4842', meadowMid: '#423D38', meadowNear: '#35312E',
  grassDark: '#24221F', grassMid: '#403B36', grassLit: '#625A52', seed: '#7A7066',
  trail: '#545052', verge: '#262A26', bush: '#262E26', light: '#6E6A88',
}

const STOPS: [number, Stop][] = [
  [0, NIGHT], [4.6, NIGHT], [5.5, PREDAWN], [RISE + 0.05, ALPENGLOW], [8, MORNING], [12.5, MIDDAY],
  [16, AFTERNOON], [SHADE - 0.6, GOLDEN], [SHADE + 0.25, SUNSET], [20.2, DUSK], [21.3, NIGHT], [24, NIGHT],
]

export const PHOTO_HOUR = 12.5

type Lab = [number, number, number]

function toLab(hex: string): Lab {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
    c /= 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function fromLab([L, a, b]: Lab) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3)
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3)
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3)
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return toHex(rgb.map((c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)))
}

const toHex = (rgb: number[]) =>
  '#' + rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')

const KEYS = Object.keys(MIDDAY) as PaletteKey[]
const LAB_STOPS = STOPS.map(([h, stop]) => [h, KEYS.map((k) => toLab(stop[k]))] as const)

export function paletteAt(hour: number): Palette {
  const h = ((hour % 24) + 24) % 24
  let i = 1
  while (i < LAB_STOPS.length - 1 && LAB_STOPS[i][0] < h) i++
  const [h0, a] = LAB_STOPS[i - 1]
  const [h1, b] = LAB_STOPS[i]
  const t = smooth(0, 1, (h - h0) / (h1 - h0))
  const out = {} as Palette
  KEYS.forEach((k, j) => {
    out[k] = fromLab([0, 1, 2].map((c) => a[j][c] + (b[j][c] - a[j][c]) * t) as Lab)
  })
  return out
}

export function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

// Scalars that ride along with the palette: how much night, how much sun
export function lightAt(hour: number) {
  const h = ((hour % 24) + 24) % 24
  return {
    stars: h < 12 ? 1 - smooth(4.4, 5.8, h) : smooth(19.9, 21.3, h),
    sun: smooth(RISE - 0.1, RISE + 0.4, h) * (1 - smooth(SHADE - 0.15, SHADE + 0.1, h)),
    day: smooth(6.5, 7.5, h) * (1 - smooth(19.0, 19.8, h)),
    crickets: h < 12 ? 1 - smooth(4.8, 6.2, h) : smooth(19.4, 20.6, h),
  }
}

export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

// Straight RGB blend, cheap enough to run for every mountain facet as the hour changes
export function blend(a: string, b: string, t: number) {
  const x = parseInt(a.slice(1), 16)
  const y = parseInt(b.slice(1), 16)
  return toHex([16, 8, 0].map((sh) => ((x >> sh) & 255) + (((y >> sh) & 255) - ((x >> sh) & 255)) * t))
}

// Multiply a surface color by the light falling on it. Colors also drain toward
// gray as the light fails, the way they do on a real trail at dusk.
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

export function formatHour(hour: number) {
  const h = ((hour % 24) + 24) % 24
  let hh = Math.floor(h)
  let mm = Math.round((h - hh) * 60 / 5) * 5
  if (mm === 60) {
    mm = 0
    hh = (hh + 1) % 24
  }
  const ampm = hh < 12 ? 'AM' : 'PM'
  return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, '0')} ${ampm}`
}

export function phaseName(hour: number) {
  const h = ((hour % 24) + 24) % 24
  if (h < 4.8 || h >= 21.2) return 'Night'
  if (h < RISE - 0.4) return 'First light'
  if (h < RISE + 0.6) return 'Alpenglow'
  if (h < 10.5) return 'Morning'
  if (h < 14.5) return 'Midday'
  if (h < SHADE - 1.2) return 'Afternoon'
  if (h < SHADE) return 'Golden hour'
  if (h < 19.8) return 'Sunset'
  return 'Dusk'
}
