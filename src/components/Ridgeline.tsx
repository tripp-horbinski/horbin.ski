import { RIDGELINE_HEIGHT, RIDGELINE_WIDTH, ridgelineMarkup } from '@/lib/flatirons'

const markup = ridgelineMarkup()

export default function Ridgeline() {
  return (
    <footer className="site-footer mt-20" aria-hidden="true">
      <svg
        viewBox={`0 0 ${RIDGELINE_WIDTH} ${RIDGELINE_HEIGHT}`}
        preserveAspectRatio="xMidYMax slice"
        className="block w-full h-[120px] md:h-[180px]"
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </footer>
  )
}
