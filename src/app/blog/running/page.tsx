import { getPostsByCategory } from '@/lib/posts'
import PostCard from '@/components/PostCard'

export const metadata = {
  title: 'Running Posts',
  description: 'Posts about training, racing, and the mental aspects of running',
}

export default function RunningPage() {
  const posts = getPostsByCategory('running')

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-2xl font-medium text-stone-900 mb-4">
            Running
          </h1>
          <p className="text-stone-600">
            Training insights and race experiences
          </p>
        </div>

        {/* Posts List */}
        <div className="space-y-0">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-stone-600">No running posts yet.</p>
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
