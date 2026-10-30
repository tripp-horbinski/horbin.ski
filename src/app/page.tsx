import Meadow from '@/components/Meadow'
import Resume from '@/components/Resume'
import Work from '@/components/Work'
import { generatePersonStructuredData } from '@/lib/structured-data'

export const metadata = {
  title: 'Tripp Horbinski — Software Engineer',
  description:
    'Tripp Horbinski builds beautiful, useful software that people use every day: his work by the numbers, from GoFundMe Pro’s move to pro.gofundme.com to CI/CD for 3,000 engineers.',
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generatePersonStructuredData()) }} />
      <div className="home">
        <Meadow />
        <Work />
      </div>
      <Resume />
    </>
  )
}
