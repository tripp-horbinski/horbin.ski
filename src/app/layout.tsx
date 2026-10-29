import type { Metadata } from 'next'
import './globals.css'
import ThemeToggle from '@/components/ThemeToggle'
import ElevationProfile from '@/components/ElevationProfile'
import { OG_IMAGE, SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  // Resolves the OpenGraph image and other relative URLs against the live site
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Tripp Horbinski — Platform Engineer',
    template: '%s | Tripp Horbinski'
  },
  description: 'Platform engineer in Milwaukee: 8 years building cloud-native platforms, CI/CD and developer infrastructure. AWS Golden Jacket; runs marathons and backpacks.',
  keywords: ['platform engineer', 'cloud engineer', 'AWS Golden Jacket', 'AWS', 'Terraform', 'Kubernetes', 'CI/CD', 'TypeScript', 'Python', 'Milwaukee'],
  authors: [{ name: 'Tripp Horbinski' }],
  creator: 'Tripp Horbinski',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    images: [OG_IMAGE],
    title: 'Tripp Horbinski — Platform Engineer',
    description: 'Platform engineer in Milwaukee: 8 years building cloud-native platforms, CI/CD and developer infrastructure. AWS Golden Jacket; runs marathons and backpacks.',
    siteName: 'Tripp Horbinski',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tripp Horbinski — Platform Engineer',
    description: 'Platform engineer in Milwaukee: 8 years building cloud-native platforms, CI/CD and developer infrastructure. AWS Golden Jacket; runs marathons and backpacks.',
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
        <ElevationProfile />
        <ThemeToggle />
      </body>
    </html>
  )
}
