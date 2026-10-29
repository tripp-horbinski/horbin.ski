import type { Post } from './posts'
import { CREDLY, GITHUB, LINKEDIN, SITE_URL } from './site'

export function generateBlogPostStructuredData(post: Post, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    author: {
      '@type': 'Person',
      name: 'Tripp Horbinski',
      url: `${SITE_URL}/about/`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Horbin.ski',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon.png`,
      },
    },
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    keywords: post.tags.join(', '),
    articleSection: post.category === 'tech' ? 'Technology' : 'Running',
    wordCount: post.content.split(' ').length,
    timeRequired: `PT${post.readTime}M`,
  }
}

export function generateWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Horbin.ski',
    description: 'Tripp Horbinski, platform engineer: his career, resume and side projects',
    url: `${SITE_URL}/`,
    author: {
      '@type': 'Person',
      name: 'Tripp Horbinski',
      url: `${SITE_URL}/about/`,
      sameAs: [GITHUB, LINKEDIN],
    },
  }
}

// Who Tripp is, for search engines reading the About page
export function generatePersonStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Tripp Horbinski',
    url: `${SITE_URL}/about/`,
    jobTitle: 'Platform Engineer',
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Milwaukee School of Engineering' },
    description: 'Platform engineer building cloud-native platforms, developer infrastructure and distributed systems.',
    homeLocation: { '@type': 'Place', name: 'Milwaukee, Wisconsin' },
    knowsAbout: ['Amazon Web Services', 'Terraform', 'AWS CDK', 'Kubernetes', 'CI/CD', 'Infrastructure as Code', 'Python', 'TypeScript'],
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

export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
