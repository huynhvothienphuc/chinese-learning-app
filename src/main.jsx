import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initAuth } from '@/store/authStore';
import { prefetchFromSession } from '@/hooks/useVocabData';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes (overridden per-query where needed)
      retry: 1,
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
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Root />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
