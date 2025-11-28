import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { getPostBySlug, getAllPosts, markdownToHtml } from '@/lib/posts'
import { generateBlogPostStructuredData } from '@/lib/structured-data'
import Link from 'next/link'

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
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
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
  const url = `https://horbin.ski/blog/${post.slug}`
  const structuredData = generateBlogPostStructuredData(post, url)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <article className="min-h-screen bg-white">
        {/* Simple Header */}
        <header className="max-w-2xl mx-auto px-6 pt-16 pb-8">
          {/* Back Button */}
          <Link
            href="/blog"
            className="inline-block text-stone-500 hover:text-stone-700 transition-colors mb-8 text-sm"
          >
            ← Back
          </Link>

          {/* Category */}
          <div className="text-stone-500 text-sm mb-4">
            {post.category === 'tech' ? 'Technology' : 'Running'}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-8 leading-tight">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="text-stone-500 text-sm mb-8">
            {format(new Date(post.date), 'MMMM d, yyyy')} · {post.readTime} min read
          </div>
        </header>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-6 pb-16">
          <div
            className="prose prose-stone max-w-none
              prose-lg:text-lg prose-lg:leading-relaxed
              prose-headings:font-medium prose-headings:text-stone-900 prose-headings:tracking-tight
              prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
              prose-p:text-stone-700 prose-p:leading-relaxed prose-p:mb-6
              prose-a:text-stone-900 prose-a:underline prose-a:decoration-stone-300 hover:prose-a:decoration-stone-500
              prose-strong:text-stone-900 prose-strong:font-medium
              prose-em:text-stone-700 prose-em:italic
              prose-blockquote:border-l-stone-200 prose-blockquote:text-stone-600 prose-blockquote:italic
              prose-code:text-stone-800 prose-code:bg-stone-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal
              prose-pre:bg-stone-900 prose-pre:text-stone-100
              prose-ul:text-stone-700 prose-ol:text-stone-700
              prose-li:text-stone-700 prose-li:leading-relaxed
              prose-hr:border-stone-200"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </article>
    </>
  )
}
