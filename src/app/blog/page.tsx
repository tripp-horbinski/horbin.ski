import { getAllPosts } from '@/lib/posts'
import PostCard from '@/components/PostCard'

export const metadata = {
  title: 'Blog',
  description: 'All posts about technology and running',
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-stone-900 mb-6">
            All Posts
          </h1>
          <p className="text-lg text-stone-600">
            Exploring technology and running
          </p>
        </div>

        {/* Posts List */}
        <div className="space-y-0">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-stone-600">No posts found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
