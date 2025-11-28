import { Github, Linkedin } from 'lucide-react'

export const metadata = {
  title: 'Tripp Horbinski - Tech & Running',
  description: 'Software developer and passionate runner exploring the intersection of technology and endurance sports',
}

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-center">
        {/* Hello World */}
        <h1 className="text-3xl font-semibold text-stone-900 mb-8">
          Hello, World!
        </h1>

        {/* Social Links */}
        <div className="flex justify-center space-x-6">
          <a
            href="https://github.com/tripp-horbinski"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 text-stone-600 hover:text-stone-900 rounded-lg transition-colors"
          >
            <Github className="w-6 h-6" />
          </a>
          <a
            href="https://linkedin.com/in/tripp-horbinski"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 text-stone-600 hover:text-blue-700 rounded-lg transition-colors"
          >
            <Linkedin className="w-6 h-6" />
          </a>
        </div>
      </div>
    </div>
  )
}
