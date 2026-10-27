import Link from 'next/link'
import { format } from 'date-fns'
import { getAllPosts } from '@/lib/posts'
import TrailSign from '@/components/TrailSign'

export const metadata = {
  title: 'Writing',
  description: 'Posts about technology and hiking',
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div>
      <h1 className="sr-only">Writing</h1>
      <TrailSign title="Writing" subtitle="Tech · Trails · Boulder" />
      <p className="mt-6 mb-8 text-center" style={{ color: 'var(--text-nav)' }}>
        By{' '}
        <Link href="/" className="no-underline transition-colors" style={{ color: 'var(--text-nav)' }}>
          Tripp Horbinski
        </Link>
      </p>
      <ul className="trail-list">
        {posts.map((post) => (
          <li key={post.slug} data-category={post.category}>
            <Link href={`/writing/${post.slug}`} className="link">
              {post.title}
            </Link>
            <span className="trail-list-meta">
              {post.category} &middot; {format(new Date(post.date), 'MMM yyyy')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
