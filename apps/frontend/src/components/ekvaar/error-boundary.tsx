'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onRetry?: () => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-agni mb-3" />
          <h3 className="font-display text-lg mb-2">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={this.handleRetry}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

export function RealtimeErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-gulabi mb-3" />
          <h3 className="font-display text-lg mb-2">Connection Lost</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Real-time updates are unavailable. Data may be stale.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
