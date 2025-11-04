// frontend/src/components/Toaster.jsx
import { useEffect, useState } from 'react';

// Simple Toast System ohne externe Library
const ToastContext = {
  toasts: [],
  listeners: [],
  
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },
  
  notify() {
    this.listeners.forEach(listener => listener(this.toasts));
  },
  
  success(message, duration = 3000) {
    this.add({ type: 'success', message, duration });
  },
  
  error(message, duration = 4000) {
    this.add({ type: 'error', message, duration });
  },
  
  info(message, duration = 3000) {
    this.add({ type: 'info', message, duration });
  },
  
  add(toast) {
    const id = Date.now() + Math.random();
    const newToast = { ...toast, id };
    this.toasts = [...this.toasts, newToast];  // ← Neues Array!
    this.notify();
    
    // Auto-remove nach duration
    setTimeout(() => {
      this.remove(id);
    }, toast.duration);
  },
  
  remove(id) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }
};

export const toast = {
  success: (msg, duration) => ToastContext.success(msg, duration),
  error: (msg, duration) => ToastContext.error(msg, duration),
  info: (msg, duration) => ToastContext.info(msg, duration),
};

export function Toaster() {
  const [toasts, setToasts] = useState([]);
  
  useEffect(() => {
    const unsubscribe = ToastContext.subscribe(setToasts);
    return unsubscribe;
  }, []);
  
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md
            animate-in slide-in-from-top-2 duration-300
            ${toast.type === 'success' ? 'bg-green-500 text-white' : ''}
            ${toast.type === 'error' ? 'bg-red-500 text-white' : ''}
            ${toast.type === 'info' ? 'bg-blue-500 text-white' : ''}
          `}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {toast.type === 'success' && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => ToastContext.remove(toast.id)}
              className="text-white/80 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
