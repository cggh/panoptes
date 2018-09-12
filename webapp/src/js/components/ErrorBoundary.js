import React from 'react';

class ErrorBoundary extends React.Component {

  constructor(props) {
    super(props);
    this.state = {error: null, errorInfo: null};
  }

  componentDidCatch(error, errorInfo) {
    // Catch errors in any components below and re-render with error message
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    // You can also log error messages to an error reporting service here
  }

  render() {
    if (this.state.errorInfo) {
      // Error path
      return (
        <div>
          <h2>An error has occurred.</h2>
          Click <a href={window.rootURL}>{window.rootURL}</a> to reset the app.
        </div>
      );
    }
    // Normally, just render children
    return this.props.children;
  }
}


export default ErrorBoundary;
