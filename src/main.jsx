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

const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'Loading chunk',
  'is not a valid JavaScript MIME type',
  'Importing a module script failed',
];

// Third-party in-app browser variables that are not our code
const THIRD_PARTY_VARS = ['zaloJSV2', 'zaloJS', '__ZaloSDK'];

function isChunkLoadError(error) {
  const msg = error?.message ?? '';
  return CHUNK_ERROR_PATTERNS.some((p) => msg.includes(p));
}

function isThirdPartyBrowserNoise(error) {
  const msg = error?.message ?? '';
  return THIRD_PARTY_VARS.some((v) => msg.includes(v));
}

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
  beforeSend(event, hint) {
    const err = hint?.originalException;
    if (isChunkLoadError(err)) return null;
    if (isThirdPartyBrowserNoise(err)) return null;
    return event;
  },
});

function ErrorFallback({ error }) {
  if (isChunkLoadError(error)) {
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
