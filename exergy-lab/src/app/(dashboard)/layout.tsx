'use client'

import * as React from 'react'
import { Sidebar, Header } from '@/components/layout'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  // Listen for sidebar collapse state
  React.useEffect(() => {
    const handleResize = () => {
      // Auto-collapse on smaller screens
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen bg-page-background">
      <Sidebar />
      <Header sidebarCollapsed={sidebarCollapsed} />
      <main
        className={`pt-16 transition-all duration-300 min-h-screen ${
          sidebarCollapsed ? 'pl-20' : 'pl-72'
        }`}
      >
        <div className="p-8 h-full">{children}</div>
      </main>
    </div>
  )
}
