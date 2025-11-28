import { getPostsByCategory } from '@/lib/posts'
import PostCard from '@/components/PostCard'

export const metadata = {
  title: 'Technology Posts',
  description: 'Posts about software development, emerging technologies, and industry insights',
}

export default function TechPage() {
  const posts = getPostsByCategory('tech')

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-2xl font-medium text-stone-900 mb-4">
            Technology
          </h1>
          <p className="text-stone-600">
            Software development insights and emerging technologies
          </p>
        </div>

        {/* Posts List */}
        <div className="space-y-0">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-stone-600">No technology posts yet.</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
