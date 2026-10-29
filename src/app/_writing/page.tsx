import Link from 'next/link'
import { format } from 'date-fns'
import { getAllPosts } from '@/lib/posts'
import SheetNav from '@/components/SheetNav'
import TrailMap from '@/components/TrailMap'

export const metadata = {
  title: 'Writing',
  description: 'Posts about technology and hiking',
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div>
      <SheetNav current="/writing/" />
      <figure className="writing-head">
        <div>
          <h1 className="sheet-title">Writing</h1>
          <p className="sheet-sub">Tech &middot; Trails &middot; Milwaukee</p>
          <p className="writing-note">
            The Ice Age Trail across Wisconsin, St. Croix Falls to Sturgeon Bay. Each post below is a waypoint.
          </p>
        </div>
        <TrailMap />
        <figcaption className="map-collar">
          <span>
            <b>Ice Age Trail</b> Wisconsin
          </span>
          <span>Segments &copy; OpenStreetMap contributors</span>
        </figcaption>
      </figure>
      <ol className="waypoints">
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
      </ol>
    </div>
  )
}
