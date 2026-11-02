import type { Metadata } from 'next'
import './globals.css'
import { OG_IMAGE, SITE_URL } from '@/lib/site'

const TITLE = 'Tripp Horbinski — Senior Software Engineer'
const DESCRIPTION = 'Senior software engineer: six years of CI/CD and cloud infrastructure, then nearly two building GoFundMe Pro full stack. AWS Golden Jacket, based in Milwaukee.'

export const metadata: Metadata = {
  // Resolves the OpenGraph image and other relative URLs against the live site
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s | Tripp Horbinski'
  },
  description: DESCRIPTION,
  keywords: ['platform engineer', 'infrastructure engineer', 'site reliability engineer', 'developer experience', 'cloud engineer', 'AWS Golden Jacket', 'AWS', 'Terraform', 'Kubernetes', 'CI/CD', 'software engineer', 'full stack', 'TypeScript', 'Next.js', 'Laravel', 'Python', 'Milwaukee'],
  authors: [{ name: 'Tripp Horbinski' }],
  creator: 'Tripp Horbinski',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    images: [OG_IMAGE],
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Tripp Horbinski',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <main className="w-full max-w-xl mx-auto px-4 mt-10 md:mt-16 mb-10 flex-1">{children}</main>
      </body>
    </html>
  )
}
