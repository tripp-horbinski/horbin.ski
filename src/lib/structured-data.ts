import { CREDLY, GITHUB, LINKEDIN, SITE_URL } from './site'

// Who Tripp is, for search engines reading the homepage
export function generatePersonStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Tripp Horbinski',
    url: `${SITE_URL}/`,
    jobTitle: 'Software Engineer',
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Milwaukee School of Engineering' },
    description: 'Software engineer building full-stack products, after six years in cloud and DevOps.',
    homeLocation: { '@type': 'Place', name: 'Milwaukee, Wisconsin' },
    knowsAbout: ['TypeScript', 'Next.js', 'React', 'PHP', 'Laravel', 'MySQL', 'Amazon Web Services', 'Terraform', 'Kubernetes', 'CI/CD'],
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      name: 'AWS Golden Jacket (every AWS certification)',
      credentialCategory: 'certification',
      dateCreated: '2023-12-30',
      url: CREDLY,
      recognizedBy: { '@type': 'Organization', name: 'Amazon Web Services' },
    },
    sameAs: [GITHUB, LINKEDIN, CREDLY],
  }
}
