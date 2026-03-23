import React from 'react';
import ReactDOM from 'react-dom/client';
// Fonts — WOFF2 only, Latin + Latin-ext + Greek subsets
import './inter-subset.css';
import './source-serif-4-subset.css';
import App from './App';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
