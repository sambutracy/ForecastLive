import React, { ErrorInfo, ReactNode } from 'react';
import '../styles.css'; // Make sure styles.css contains the error boundary styles

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <h1 className="error-boundary-heading">Something went wrong</h1>
          <h2>Error Details:</h2>
          <p>{this.state.error && this.state.error.toString()}</p>
          <div className="error-boundary-stack">
            <pre className="error-boundary-pre">
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
