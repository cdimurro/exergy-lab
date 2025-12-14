import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/clerk-react'
import { Layout } from '@/components/layout/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider, MockAuthProvider } from '@/lib/auth'
import { InteractiveEnergyExplorer } from '@/pages/InteractiveEnergyExplorer'
import { Dashboard } from '@/pages/Dashboard'
import { TEACalculator } from '@/pages/TEACalculator'
import { Projects } from '@/pages/Projects'
import { DataUpload } from '@/pages/DataUpload'
import { ExergyAnalysis } from '@/pages/ExergyAnalysis'
import { DiscoveryEngine } from '@/pages/DiscoveryEngine'
import { GlobalEnergy } from '@/pages/GlobalEnergy'
import { Pricing } from '@/pages/Pricing'
import './index.css'

// Clerk publishable key - in production, use environment variable
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  // Skip Clerk in development if no key is set
  const hasClerkKey = CLERK_PUBLISHABLE_KEY && !CLERK_PUBLISHABLE_KEY.includes('placeholder')

  const routes = (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<InteractiveEnergyExplorer />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="energy" element={<GlobalEnergy />} />
        <Route path="tea" element={<TEACalculator />} />
        <Route path="projects" element={<Projects />} />
        <Route path="upload" element={<DataUpload />} />
        <Route path="exergy" element={<ExergyAnalysis />} />
        <Route path="discovery" element={<DiscoveryEngine />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="analytics" element={<ComingSoon title="Analytics" />} />
        <Route path="settings" element={<ComingSoon title="Settings" />} />
        <Route path="help" element={<ComingSoon title="Help" />} />
        {/* Redirect old routes */}
        <Route path="global-energy" element={<Navigate to="/energy" replace />} />
        <Route path="login" element={<Navigate to="/pricing" replace />} />
      </Route>
    </Routes>
  )

  // Full app with all providers
  if (hasClerkKey) {
    return (
      <ErrorBoundary>
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                {routes}
              </BrowserRouter>
            </QueryClientProvider>
          </AuthProvider>
        </ClerkProvider>
      </ErrorBoundary>
    )
  }

  // Development mode without Clerk
  return (
    <ErrorBoundary>
      <MockAuthProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            {routes}
          </BrowserRouter>
        </QueryClientProvider>
      </MockAuthProvider>
    </ErrorBoundary>
  )
}

// Placeholder component for pages under development
function ComingSoon({ title, tier }: { title: string; tier?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">{title}</h1>
      {tier && (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary mb-4">
          {tier} Tier
        </span>
      )}
      <p className="text-text-muted">This page is coming soon.</p>
    </div>
  )
}

export default App
