import Link from 'next/link'
import { format } from 'date-fns'
import type { Post } from '@/lib/posts'

interface PostCardProps {
  post: Post
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <article className="py-6 border-b border-stone-100 last:border-b-0 group">
      <Link href={`/blog/${post.slug}`} className="block">
        {/* Category */}
        <div className="text-stone-500 text-sm mb-2">
          {post.category === 'tech' ? 'Technology' : 'Running'}
        </div>

        {/* Title */}
        <h3 className="text-xl font-medium text-stone-900 mb-4 group-hover:text-stone-600 transition-colors leading-tight">
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className="text-stone-600 mb-4 leading-relaxed line-clamp-2 text-lg">
          {post.excerpt}
        </p>

        {/* Meta */}
        <div className="text-stone-500 text-base">
          {format(new Date(post.date), 'MMMM d, yyyy')} · {post.readTime} min read
        </div>
      </Link>
    </article>
  )
}
