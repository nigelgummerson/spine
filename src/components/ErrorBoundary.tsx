import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info.componentStack);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleDismiss = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/95" role="alert">
                    <div className="max-w-lg mx-auto p-8 text-center">
                        <div className="text-4xl mb-4">&#9888;</div>
                        <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
                        <p className="text-sm text-slate-600 mb-4">
                            Your data has been auto-saved to the browser. Reloading should restore your work.
                        </p>
                        {this.state.error && (
                            <pre className="text-xs text-left bg-slate-100 p-3 rounded mb-4 overflow-auto max-h-32 text-slate-500">
                                {this.state.error.message}
                            </pre>
                        )}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
                            >
                                Reload page
                            </button>
                            <button
                                onClick={this.handleDismiss}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded font-medium hover:bg-slate-300"
                            >
                                Try to continue
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
