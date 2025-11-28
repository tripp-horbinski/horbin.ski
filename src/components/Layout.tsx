'use client'

import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <Header />
      </div>

      {/* Main Content */}
      <div className="md:pl-36 min-h-screen">
        <div className="min-h-screen overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
