import Meadow from '@/components/Meadow'
import Resume from '@/components/Resume'
import Work from '@/components/Work'
import { SITE_URL } from '@/lib/site'
import { generatePersonStructuredData } from '@/lib/structured-data'

export const metadata = {
  title: 'Tripp Horbinski — Senior Software Engineer',
  description:
    'Tripp Horbinski builds platforms and the products on top of them: his work by the numbers, from CI/CD for 3,000+ engineers to GoFundMe Pro’s move to pro.gofundme.com.',
  alternates: { canonical: `${SITE_URL}/` },
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
