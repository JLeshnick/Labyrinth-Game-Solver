import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen w-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center gap-6 p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/30">
            <RefreshCcw className="w-8 h-8 text-red-400" />
          </div>
          <div className="text-center max-w-md">
            <h1 className="text-xl font-bold text-stone-100 mb-2">Something went wrong</h1>
            <p className="text-stone-400 text-sm mb-4">
              The solver or board encountered an unexpected error.
            </p>
            <pre className="text-xs text-red-400 bg-stone-900 rounded-xl p-4 text-left overflow-auto max-h-40 mb-6 border border-stone-800">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="px-6 py-2.5 bg-theme-primary text-stone-950 font-bold rounded-xl hover:bg-theme-primary-hover transition-colors"
            >
              Try to recover
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
