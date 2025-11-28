import Link from 'next/link'
import { ArrowRight, Code2, Zap } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative py-20 lg:py-32">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          {/* Hero Icons */}
          <div className="flex justify-center items-center space-x-6 mb-12">
            <Code2 className="w-6 h-6 text-stone-400" />
            <div className="w-12 h-px bg-stone-200"></div>
            <Zap className="w-6 h-6 text-stone-400" />
          </div>

          {/* Hero Text */}
          <h1 className="text-5xl md:text-6xl font-bold text-stone-900 mb-8 leading-tight">
            Tech meets Running
          </h1>

          <p className="text-xl text-stone-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Exploring the intersection of software development and endurance sports. 
            Insights on code, emerging technologies, training strategies, and the mental game.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/blog" className="text-stone-600 hover:text-stone-900 transition-colors">
              Explore Posts →
            </Link>
            <Link href="/about" className="text-stone-600 hover:text-stone-900 transition-colors">
              About Me
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-semibold text-stone-900 mb-1">10+</div>
              <div className="text-sm text-stone-600">Years Coding</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-semibold text-stone-900 mb-1">5+</div>
              <div className="text-sm text-stone-600">Marathons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-semibold text-stone-900 mb-1">50+</div>
              <div className="text-sm text-stone-600">Tech Posts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-semibold text-stone-900 mb-1">1000+</div>
              <div className="text-sm text-stone-600">Miles Run</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
