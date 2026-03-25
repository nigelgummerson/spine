import React from 'react';
import ReactDOM from 'react-dom/client';
// Fonts — WOFF2 only, Latin + Latin-ext + Greek subsets
import './inter-subset.css';
import './source-serif-4-subset.css';
// CJK fonts — loaded on demand via unicode-range, web build only
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-kr/400.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<ErrorBoundary><App /></ErrorBoundary>);

// Register service worker for offline caching (web build only, not file://)
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register(
    import.meta.env.BASE_URL + 'sw.js'
  ).catch(() => { /* SW registration failed — app works fine without it */ });
}
