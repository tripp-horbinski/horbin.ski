import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'

export const metadata = {
  title: 'Writing',
  description: 'Posts about technology and hiking',
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div>
      <h1 className="text-xl md:text-2xl mb-1 font-medium">Writing</h1>
      <p className="mb-6" style={{ color: 'var(--text-nav)' }}>
        By{' '}
        <Link href="/" className="no-underline transition-colors" style={{ color: 'var(--text-nav)' }}>
          Tripp Horbinski
        </Link>
      </p>
      <ul className="pl-4 space-y-1 list-disc">
        {posts.map((post) => (
          <li key={post.slug} className="pl-1">
            <Link href={`/writing/${post.slug}`} className="link">
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
