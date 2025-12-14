import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({ errorInfo })

    // In production, you'd send this to an error tracking service
    // Example: Sentry.captureException(error)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleGoHome = () => {
    this.handleReset()
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <div className="max-w-lg w-full text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-error/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-10 h-10 text-error" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Something went wrong
              </h1>
              <p className="text-text-secondary">
                We're sorry, but something unexpected happened. Our team has been notified.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Button
                variant="primary"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Try Again
              </Button>
              <Button
                variant="secondary"
                onClick={this.handleGoHome}
                leftIcon={<Home className="w-4 h-4" />}
              >
                Go Home
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-6 text-left">
                <button
                  onClick={() => {
                    const details = document.getElementById('error-details')
                    if (details) {
                      details.classList.toggle('hidden')
                    }
                  }}
                  className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary mb-2"
                >
                  <Bug className="w-4 h-4" />
                  Toggle Error Details
                </button>
                <div id="error-details" className="hidden">
                  <div className="bg-surface-secondary rounded-lg p-4 overflow-auto max-h-64 border border-border">
                    <p className="font-mono text-xs text-error mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="font-mono text-xs text-text-muted whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components to throw errors that the boundary will catch
export function useErrorHandler() {
  return (error: Error) => {
    throw error
  }
}

// Page-level error fallback for less critical errors
export function PageErrorFallback({
  error,
  resetError
}: {
  error: Error
  resetError: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-warning" />
      </div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Failed to load this section
      </h2>
      <p className="text-text-secondary text-center mb-4 max-w-md">
        {error.message || 'An unexpected error occurred while loading this content.'}
      </p>
      <Button
        variant="secondary"
        onClick={resetError}
        leftIcon={<RefreshCw className="w-4 h-4" />}
      >
        Try Again
      </Button>
    </div>
  )
}
