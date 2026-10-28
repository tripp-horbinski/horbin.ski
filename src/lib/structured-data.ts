import type { Post } from './posts'
import { SITE_URL } from './site'

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
    description: 'A modern blog focused on technology insights and running adventures',
    url: `${SITE_URL}/`,
    author: {
      '@type': 'Person',
      name: 'Tripp Horbinski',
      url: `${SITE_URL}/about/`,
      sameAs: [
        'https://github.com/tripp-horbinski',
        'https://linkedin.com/in/tripphorbinski',
        'https://twitter.com/tripphorbinski',
      ],
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
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
