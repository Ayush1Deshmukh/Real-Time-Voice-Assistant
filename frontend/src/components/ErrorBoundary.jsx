import { Component } from 'react'

/**
 * ErrorBoundary — catches render errors in any child component tree.
 * Wraps the VoiceAssistant section so a crash doesn't take down the whole page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-8 flex flex-col items-center gap-4 text-center max-w-md mx-auto mt-8 animate-fade-in">
          <div className="text-5xl">💥</div>
          <h2 className="text-xl font-semibold text-slate-100">Something went wrong</h2>
          <p className="text-sm text-slate-400">
            The voice assistant encountered an unexpected error.
            {this.state.error && (
              <code className="block mt-2 text-xs text-red-400 bg-red-500/10 rounded p-2">
                {this.state.error.message}
              </code>
            )}
          </p>
          <button
            id="error-boundary-reload-btn"
            onClick={this.handleReload}
            className="btn-primary mt-2"
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
