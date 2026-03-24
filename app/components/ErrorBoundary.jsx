import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleGoHome = () => {
    // Use window.location.href instead of navigate() for safety
    // ErrorBoundary may catch errors that break Router context
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">เกิดข้อผิดพลาด</h1>
            <p className="text-slate-600 mb-6">
              {this.state.error?.message || 'เกิดข้อผิดพลาดที่ไม่ anticipated กรุณารีเฟรชหน้าหรือลองใหม่ภายหลัง'}
            </p>
            <button
              onClick={this.handleGoHome}
              className="inline-block px-6 py-3 bg-blue-900 text-white font-medium rounded-xl hover:bg-blue-800 transition-colors"
            >
              กลับหน้าแรก
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
