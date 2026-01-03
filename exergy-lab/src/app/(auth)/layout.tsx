/**
 * Auth Layout
 *
 * Centered layout for authentication pages (sign-in, sign-up).
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Brand */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Exergy Lab</h1>
          <p className="text-sm text-muted mt-1">
            AI-Powered Scientific Research Platform
          </p>
        </div>

        {/* Auth Content */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted">
          By signing in, you agree to our{' '}
          <a href="/terms" className="text-primary hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  )
}
