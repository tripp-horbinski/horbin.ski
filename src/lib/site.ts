// Where the site is served. Everything search engines and link previews read
// (metadata, the sitemap, robots.txt, RSS, structured data) builds its URLs
// from this, with the trailing slash every page is served at.
export const SITE_URL = 'https://tripp.horbin.ski'

// The link-preview picture: a screenshot of the homepage (public/og.jpg),
// taken again with `npm run meadow:og` when the scene changes
export const OG_IMAGE = {
  url: '/og.jpg',
  width: 1200,
  height: 630,
  alt: 'Tripp Horbinski on the trail in Chautauqua Meadow, below the Boulder Flatirons',
}
