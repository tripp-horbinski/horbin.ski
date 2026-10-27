import { trailSignMarkup } from '@/lib/flatirons'

export default function TrailSign({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <svg
      viewBox="0 0 600 230"
      role="img"
      aria-label={`${title}: ${subtitle}`}
      className="block w-full h-auto"
      dangerouslySetInnerHTML={{ __html: trailSignMarkup(title, subtitle) }}
    />
  )
}
