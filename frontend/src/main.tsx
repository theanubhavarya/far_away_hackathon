import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 5 * 60 * 1000 },
    mutations: { retry: 0 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(13, 27, 46, 0.95)',
            color: '#E8F4FF',
            border: '1px solid rgba(59, 158, 255, 0.2)',
            backdropFilter: 'blur(12px)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#050D1A' } },
          error: { iconTheme: { primary: '#F43F5E', secondary: '#050D1A' } },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
