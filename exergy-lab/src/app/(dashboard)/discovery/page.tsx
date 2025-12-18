'use client'

import { FrontierScienceChatInterface } from '@/components/chat/FrontierScienceChatInterface'
import { AdminDebugViewer, DebugProvider } from '@/components/debug'

export default function DiscoveryPage() {
  return (
    <DebugProvider>
      <div className="h-full flex flex-col relative">
        <FrontierScienceChatInterface
          pageTitle="Discovery Engine"
          pageSubtitle="12-phase AI discovery pipeline with rubric validation"
          onComplete={(result) => {
            console.log('Discovery completed:', result)
          }}
        />
        {/* Admin Debug Viewer - only visible in development */}
        <AdminDebugViewer />
      </div>
    </DebugProvider>
  )
}
