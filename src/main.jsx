import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { initAuth } from '@/store/authStore';
import { prefetchFromSession } from '@/hooks/useVocabData';
import App from './App';
import './index.css';
import './App.css';

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
  const isChunkError = error?.message?.includes('Failed to fetch dynamically imported module')
    || error?.message?.includes('Loading chunk')
    || error?.message?.includes('is not a valid JavaScript MIME type')
    || error?.message?.includes('Importing a module script failed');

  if (isChunkError) {
    const reloaded = sessionStorage.getItem('chunk_reload');
    if (!reloaded) {
      sessionStorage.setItem('chunk_reload', '1');
      window.location.reload();
      return null;
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <p className="text-4xl">⚠️</p>
      <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{error?.message ?? 'An unexpected error occurred.'}</p>
      <button
        type="button"
        onClick={() => { sessionStorage.removeItem('chunk_reload'); window.location.reload(); }}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
      >
        Reload page
      </button>
    </div>
  );
}

const ErrorBoundary = ({ children }) => (
  <Sentry.ErrorBoundary fallback={ErrorFallback}>
    {children}
  </Sentry.ErrorBoundary>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Warm cache from last session immediately — runs before React mounts,
// in parallel with auth. Eliminates the books→sections→vocab waterfall
// for returning users.
prefetchFromSession(queryClient);

function Root() {
  useEffect(() => {
    const cleanup = initAuth();
    return cleanup;
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <Root />
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
