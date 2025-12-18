'use client'

import * as React from 'react'
import { FrontierScienceChatInterface } from '@/components/chat/FrontierScienceChatInterface'
import { AdminDebugViewer } from '@/components/debug'

export default function DiscoveryPage() {
  return (
    <div className="h-full flex flex-col relative">
      <FrontierScienceChatInterface
        pageTitle="FrontierScience Discovery"
        pageSubtitle="12-phase AI discovery pipeline with rubric validation"
        onComplete={(result) => {
          console.log('Discovery completed:', result)
        }}
      />
      {/* Admin Debug Viewer - only visible in development */}
      <AdminDebugViewer />
    </div>
  )
}
