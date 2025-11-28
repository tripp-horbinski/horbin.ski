'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Code2, Zap, Home, BookOpen, Cpu, Zap as ZapIcon, User, Mail } from 'lucide-react'

const navigation = [
  { name: 'Blog', href: '/blog' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-36 overflow-y-auto bg-white">
      <div className="flex flex-col h-full py-8">
        {/* Profile Image Logo */}
        <div className="px-6 mb-4 text-center">
          <Link href="/" className="block">
            <Image
              src="/images/profile.jpg"
              alt="Tripp Horbinski"
              width={80}
              height={80}
              className="mx-auto hover:opacity-80 transition-opacity"
              style={{
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
              }}
              priority
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`block py-2 text-lg transition-colors text-center ${
                  isActive
                    ? 'text-stone-900 font-medium'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
