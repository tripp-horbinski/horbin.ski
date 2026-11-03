// The real sun over Chautauqua Meadow at 2:45 on a late-summer afternoon, and
// where things land in the reference frame through the camera calibrated
// against the lidar.

import { getPosition } from 'suncalc'
import { TERRAIN } from './terrain'

// Standing at the north end of the meadow, facing southwest (see scripts/meadow/config.mjs)
const CAMERA = TERRAIN.camera ?? { lat: 39.99968, lon: -105.28315, heading: 218.871, pitch: 9.596, roll: -0.615, f: 1266.7, cx: 600, cy: 400 }

// Late August, Mountain Daylight Time
const DAY = Date.parse(TERRAIN.day ?? '2025-08-28')
const MDT = -6
const HOUR = 14.75

type Vec = [number, number, number]

const deg = Math.PI / 180

// Unit vector toward the sun in east/north/up. SunCalc 2 gives degrees, azimuth
// clockwise from north
const position = getPosition(new Date(DAY + (HOUR - MDT) * 3600e3), CAMERA.lat, CAMERA.lon)
const bearing = position.azimuth * deg
const altitude = position.altitude * deg
export const SUN: Vec = [Math.sin(bearing) * Math.cos(altitude), Math.cos(bearing) * Math.cos(altitude), Math.sin(altitude)]

const [p, t, q] = [CAMERA.heading * deg, CAMERA.pitch * deg, CAMERA.roll * deg]
const F: Vec = [Math.sin(p) * Math.cos(t), Math.cos(p) * Math.cos(t), Math.sin(t)]
const R0: Vec = [Math.cos(p), -Math.sin(p), 0]
const U0: Vec = [-Math.sin(p) * Math.sin(t), -Math.cos(p) * Math.sin(t), Math.cos(t)]
const R = R0.map((v, i) => v * Math.cos(q) + U0[i] * Math.sin(q))
const U = U0.map((v, i) => v * Math.cos(q) - R0[i] * Math.sin(q))
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

// How far a direction is to the right of the view: positive right, negative left
export const sideways = (d: Vec) => dot(d, R)

// A point seen at (u, v) in the frame, `range` meters away, relative to the camera
export function pointAt(u: number, v: number, range: number): Vec {
  const d = [0, 1, 2].map((i) => F[i] * CAMERA.f + R[i] * (u - CAMERA.cx) + U[i] * (CAMERA.cy - v))
  const k = range / Math.hypot(d[0], d[1], d[2])
  return [d[0] * k, d[1] * k, d[2] * k]
}

// Depth of a point along the view direction
export const depth = (p: Vec) => dot(p, F)
export const FOCAL = CAMERA.f

// Where a direction, or a point relative to the camera, appears in the
// reference frame, if it's in front of the camera
export function project(d: Vec): [number, number] | null {
  const z = dot(d, F)
  if (z <= 0.05) return null
  return [CAMERA.cx + (CAMERA.f * dot(d, R)) / z, CAMERA.cy - (CAMERA.f * dot(d, U)) / z]
}
