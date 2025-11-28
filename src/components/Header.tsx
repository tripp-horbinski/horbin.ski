'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Code2, Zap, Home, BookOpen, Cpu, Zap as ZapIcon, User, Mail } from 'lucide-react'

const navigation = [
  { name: 'Blog', href: '/blog' },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="bg-white border-b border-stone-100 sticky top-0 z-50">
      <div className="px-4 sm:px-6">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="text-lg font-medium text-stone-900 hover:text-stone-600 transition-colors">
            Horbin.ski
          </Link>

          {/* Mobile menu button */}
          <button
            type="button"
            className="text-stone-600 hover:text-stone-900 p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Menu</span>
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="pb-4 space-y-1 border-t border-stone-100">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'text-stone-900 font-medium'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </header>
  )
}
