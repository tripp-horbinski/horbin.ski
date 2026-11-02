import { CREDLY, GITHUB, LINKEDIN, SITE_URL } from './site'

// Who Tripp is, for search engines reading the homepage
export function generatePersonStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Tripp Horbinski',
    url: `${SITE_URL}/`,
    jobTitle: 'Senior Software Engineer',
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Milwaukee School of Engineering' },
    description: 'Senior software engineer: six years of CI/CD and cloud infrastructure, then nearly two building GoFundMe Pro full stack.',
    homeLocation: { '@type': 'Place', name: 'Milwaukee, Wisconsin' },
    knowsAbout: ['Amazon Web Services', 'Terraform', 'Kubernetes', 'CI/CD', 'TypeScript', 'Next.js', 'React', 'PHP', 'Laravel', 'MySQL'],
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      name: 'AWS Golden Jacket (every AWS certification)',
      credentialCategory: 'certification',
      dateCreated: '2023-12',
      url: CREDLY,
      recognizedBy: { '@type': 'Organization', name: 'Amazon Web Services' },
    },
    sameAs: [GITHUB, LINKEDIN, CREDLY],
  }
}
