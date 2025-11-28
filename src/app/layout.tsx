import type { Metadata } from 'next'
import './globals.css'
import Layout from '@/components/Layout'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: {
    default: 'Horbin.ski - Tech & Running Blog',
    template: '%s | Horbin.ski'
  },
  description: 'A modern blog focused on technology insights and running adventures',
  keywords: ['technology', 'running', 'blog', 'software development', 'fitness'],
  authors: [{ name: 'Tripp Horbinski' }],
  creator: 'Tripp Horbinski',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://horbin.ski',
    title: 'Horbin.ski - Tech & Running Blog',
    description: 'A modern blog focused on technology insights and running adventures',
    siteName: 'Horbin.ski',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Horbin.ski - Tech & Running Blog',
    description: 'A modern blog focused on technology insights and running adventures',
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
    <html lang="en" className="scroll-smooth">
      <body>
        <Layout>
          <div className="flex flex-col min-h-screen">
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </div>
        </Layout>
      </body>
    </html>
  )
}
