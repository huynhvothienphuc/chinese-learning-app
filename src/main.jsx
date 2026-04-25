import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: import.meta.env.PROD,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
});

function ErrorFallback({ error }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center dark:bg-slate-950">
      <p className="text-4xl">⚠️</p>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Something went wrong</h1>
      <p className="max-w-sm text-sm text-slate-500">{error?.message ?? 'An unexpected error occurred.'}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
      >
        Reload page
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={ErrorFallback}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);
