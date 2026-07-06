import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { DataProvider } from './context/DataContext';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
const initialData = typeof window !== 'undefined' ? window.__INITIAL_DATA__ || {} : {};
const userFromSSR = typeof window !== 'undefined' ? window.__USER__ || null : null;

if (typeof window !== 'undefined') {
  delete window.__INITIAL_DATA__;
  delete window.__USER__;
}

const app = (
  <StrictMode>
    <HelmetProvider>
      <DataProvider data={initialData}>
        <BrowserRouter>
          <App userFromSSR={userFromSSR} />
        </BrowserRouter>
      </DataProvider>
    </HelmetProvider>
  </StrictMode>
);

if (rootElement.children.length > 0) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
