import { Component } from 'react'
import * as Sentry from '@sentry/react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    Sentry.captureException(error, { extra: info })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Something went wrong</p>
            <p className="text-slate-500 text-xs mt-1">{this.state.error.message}</p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="text-xs text-emerald-400 border border-emerald-700 rounded-full px-4 py-1.5 hover:bg-emerald-900/30 transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
