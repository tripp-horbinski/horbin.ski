import Meadow from '@/components/Meadow'
import { generatePersonStructuredData } from '@/lib/structured-data'

export const metadata = {
  title: 'Tripp Horbinski — Software Engineer',
  description:
    'Tripp Horbinski builds beautiful, useful software that people use every day. Walk his career down the trail through Chautauqua Meadow, below the Flatirons.',
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generatePersonStructuredData()) }} />
      <Meadow />
    </>
  )
}
