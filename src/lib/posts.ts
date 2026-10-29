import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import { MAPS, type PlaceId } from './maps'

const postsDirectory = path.join(process.cwd(), 'src/content/posts')

export interface Post {
  slug: string
  title: string
  date: string
  excerpt: string
  content: string
  category: 'tech' | 'running'
  tags: string[]
  readTime: number
  featured?: boolean
  // A place from src/lib/maps.ts to head the post, where it happened
  map?: PlaceId
  // Drafts show on the dev server only, so a post can be read in place before
  // it goes out
  draft?: boolean
}

const showDrafts = process.env.NODE_ENV !== 'production'

const mapOf = (value: unknown) => (typeof value === 'string' && value in MAPS ? (value as PlaceId) : undefined)

export function getAllPosts(): Post[] {
  try {
    if (!fs.existsSync(postsDirectory)) {
      return []
    }
    
    const fileNames = fs.readdirSync(postsDirectory)
    const allPostsData = fileNames
      .filter((fileName) => fileName.endsWith('.md'))
      .map((fileName) => {
        const slug = fileName.replace(/\.md$/, '')
        const fullPath = path.join(postsDirectory, fileName)
        const fileContents = fs.readFileSync(fullPath, 'utf8')
        const matterResult = matter(fileContents)

        return {
          slug,
          title: matterResult.data.title || 'Untitled',
          date: matterResult.data.date || new Date().toISOString(),
          excerpt: matterResult.data.excerpt || '',
          content: matterResult.content,
          category: matterResult.data.category || 'tech',
          tags: matterResult.data.tags || [],
          readTime: calculateReadTime(matterResult.content),
          featured: matterResult.data.featured || false,
          map: mapOf(matterResult.data.map),
          draft: matterResult.data.draft === true,
        } as Post
      })
      .filter((post) => showDrafts || !post.draft)

    return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1))
  } catch (error) {
    console.error('Error reading posts:', error)
    return []
  }
}

export function getPostBySlug(slug: string): Post | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`)
    
    if (!fs.existsSync(fullPath)) {
      return null
    }
    
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const matterResult = matter(fileContents)
    if (matterResult.data.draft === true && !showDrafts) {
      return null
    }

    return {
      slug,
      title: matterResult.data.title || 'Untitled',
      date: matterResult.data.date || new Date().toISOString(),
      excerpt: matterResult.data.excerpt || '',
      content: matterResult.content,
      category: matterResult.data.category || 'tech',
      tags: matterResult.data.tags || [],
      readTime: calculateReadTime(matterResult.content),
      featured: matterResult.data.featured || false,
      map: mapOf(matterResult.data.map),
      draft: matterResult.data.draft === true,
    } as Post
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error)
    return null
  }
}

export function getPostsByCategory(category: 'tech' | 'running'): Post[] {
  const allPosts = getAllPosts()
  return allPosts.filter((post) => post.category === category)
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark().use(html).process(markdown)
  return result.toString()
}

function calculateReadTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

export function getAllTags(): string[] {
  const allPosts = getAllPosts()
  const tags = allPosts.flatMap((post) => post.tags)
  return Array.from(new Set(tags)).sort()
}
