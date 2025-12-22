'use client'

import { BreakthroughEngineInterface } from '@/components/breakthrough'
import { DebugProvider, AdminDebugViewer } from '@/components/debug'

export default function BreakthroughPage() {
  return (
    <DebugProvider>
      <div className="h-full w-full flex flex-col relative -m-6">
        <BreakthroughEngineInterface />
        {/* Admin Debug Viewer - only visible in development */}
        <AdminDebugViewer />
      </div>
    </DebugProvider>
  )
}
