import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { getPostBySlug, getAllPosts, markdownToHtml } from '@/lib/posts'
import { generateBlogPostStructuredData } from '@/lib/structured-data'
import { OG_IMAGE, SITE_URL } from '@/lib/site'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  return {
    title: post.title,
    description: post.excerpt,
    // A post's openGraph replaces the site's whole, so it carries the picture too
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${SITE_URL}/writing/${post.slug}/`,
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [OG_IMAGE.url],
    },
  }
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const content = await markdownToHtml(post.content)
  const url = `${SITE_URL}/writing/${post.slug}/`
  const structuredData = generateBlogPostStructuredData(post, url)
  const dateLabel = format(new Date(post.date), 'MMMM yyyy')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <article>
        <Link href="/writing" className="trail-arrow">
          Writing
        </Link>
        <p className="trail-eyebrow mt-8 mb-3">{post.category}</p>
        <h1 className="text-xl md:text-2xl mb-1">
          {post.title}
        </h1>
        <p className="mb-6" style={{ color: 'var(--text-nav)' }}>
          <Link
            href="/"
            className="no-underline transition-colors"
            style={{ color: 'var(--text-nav)' }}
          >
            {dateLabel} &ndash; Tripp Horbinski
          </Link>
        </p>
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </article>
    </>
  )
}
