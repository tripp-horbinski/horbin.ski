import RunnerPortrait from '@/components/RunnerPortrait'

export const metadata = {
  title: 'Tripp',
  description: 'Tripp crossing the Hoan Bridge in the 2024 Milwaukee Lakefront Marathon, drawn for the Chautauqua Meadow scene.',
  // A working page for the meadow figures, not linked from the site yet
  robots: { index: false, follow: false },
}

export default function BridgePage() {
  return (
    <div>
      <h1 className="text-xl md:text-2xl leading-none">Tripp</h1>
      <p className="mt-2 mb-6 font-display text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-nav)' }}>
        Milwaukee Lakefront Marathon &middot; Hoan Bridge &middot; 2024
      </p>
      <RunnerPortrait figure="bridge" />
    </div>
  )
}
