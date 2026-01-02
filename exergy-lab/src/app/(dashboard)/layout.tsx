'use client'

import * as React from 'react'
import { Sidebar, Header } from '@/components/layout'
import { cn } from '@/lib/utils'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  // Listen for sidebar collapse state
  React.useEffect(() => {
    const handleResize = () => {
      // Auto-collapse on smaller screens
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true)
        setMobileMenuOpen(false) // Close mobile menu when resizing
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen bg-page-background">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <Header
        sidebarCollapsed={sidebarCollapsed}
        onMobileMenuOpen={() => setMobileMenuOpen(true)}
      />
      <main
        className={cn(
          'pt-16 transition-all duration-300 h-screen',
          'lg:pl-72',
          sidebarCollapsed && 'lg:pl-20'
        )}
      >
        <div className="p-4 lg:p-6 min-h-[calc(100vh-64px)] overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}
