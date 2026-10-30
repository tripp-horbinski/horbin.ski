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

// Where to reach Tripp, on the homepage, in its resume and in its structured data
export const EMAIL = 'tripphorbinski@gmail.com'
export const GITHUB = 'https://github.com/tripp-horbinski'
export const LINKEDIN = 'https://www.linkedin.com/in/tripp-horbinski/'

// His resume as a PDF: the homepage's print-only resume, printed by scripts/resume-pdf.mjs
export const RESUME_PDF = '/tripp-horbinski-resume.pdf'

// puppe.rs, his app for whoever's watching your pets, which his dogs in the
// meadow link to
export const PUPPERS = 'https://puppe.rs'

// His AWS certifications, verified by AWS's badge issuer
export const CREDLY = 'https://www.credly.com/users/tripp-horbinski.8ee6f493/badges/credly'
