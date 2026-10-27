import { cssPaint, flatironsMarkup } from '@/lib/flatirons'

// Colors come from --fi-* tokens in globals.css, so the scene flips to night with the theme
const markup = flatironsMarkup({ paint: cssPaint, sky: 'both', grain: true })

export default function FlatironsScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 60 600 340"
      role="img"
      aria-label="The Boulder Flatirons seen from Chautauqua Meadow"
      className={className}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
