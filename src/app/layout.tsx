import type { Metadata } from 'next'
import './globals.css'
import ThemeToggle from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: {
    default: 'Tripp Horbinski — Developer & Runner',
    template: '%s | Tripp Horbinski'
  },
  description: 'Software developer and distance runner. Building things for the web and chasing finish lines.',
  keywords: ['software developer', 'running', 'web development', 'technology', 'marathon'],
  authors: [{ name: 'Tripp Horbinski' }],
  creator: 'Tripp Horbinski',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://horbin.ski',
    title: 'Tripp Horbinski — Developer & Runner',
    description: 'Software developer and distance runner. Building things for the web and chasing finish lines.',
    siteName: 'Tripp Horbinski',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tripp Horbinski — Developer & Runner',
    description: 'Software developer and distance runner. Building things for the web and chasing finish lines.',
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
      <body className="antialiased max-w-xl mx-auto px-4 mt-14 md:mt-28 mb-28">
        <main>{children}</main>
        <ThemeToggle />
      </body>
    </html>
  )
}
