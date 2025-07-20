import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          color: 'white', 
          background: '#1A1A2E',
          maxWidth: '800px',
          margin: '40px auto',
          borderRadius: '8px',
          border: '1px solid #FF8C00'
        }}>
          <h1 style={{ color: '#FF8C00' }}>Something went wrong</h1>
          <h2>Error Details:</h2>
          <p>{this.state.error && this.state.error.toString()}</p>
          <div style={{ 
            background: '#0F0F23', 
            padding: '15px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '300px',
            marginTop: '15px'
          }}>
            <pre style={{ whiteSpace: 'pre-wrap' }}>
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
