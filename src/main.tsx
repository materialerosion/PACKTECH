import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import ProductRender from './components/render/ProductRender'
import './index.css'

const renderView = new URLSearchParams(window.location.search).get('render')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {renderView === 'one-a-day-237' ? <ProductRender /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>,
)
