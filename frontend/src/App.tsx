import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { TEACalculator } from '@/pages/TEACalculator'
import { Projects } from '@/pages/Projects'
import { DataUpload } from '@/pages/DataUpload'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="tea" element={<TEACalculator />} />
            <Route path="projects" element={<Projects />} />
            <Route path="upload" element={<DataUpload />} />
            <Route path="analytics" element={<ComingSoon title="Analytics" />} />
            <Route path="settings" element={<ComingSoon title="Settings" />} />
            <Route path="help" element={<ComingSoon title="Help" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Placeholder component for pages under development
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">{title}</h1>
      <p className="text-text-muted">This page is coming soon.</p>
    </div>
  )
}

export default App
