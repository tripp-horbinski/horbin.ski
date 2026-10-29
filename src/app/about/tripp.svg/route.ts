import { jacketSvg } from '@/lib/meadow/jacket-print'

export const dynamic = 'force-static'

// Tripp's print in his gold AWS Certified jacket as a static SVG for the
// About page, so the page doesn't ship the art as script
export function GET() {
  return new Response(jacketSvg(), { headers: { 'Content-Type': 'image/svg+xml' } })
}
