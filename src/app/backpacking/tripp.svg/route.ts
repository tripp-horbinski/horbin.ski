import { hikerSvg } from '@/lib/meadow/hiker-print'

export const dynamic = 'force-static'

// Tripp's print on the trail as a static SVG for the Backpacking page, so the
// page doesn't ship the art as script
export function GET() {
  return new Response(hikerSvg(), { headers: { 'Content-Type': 'image/svg+xml' } })
}
