// PAKmaster Vite entry point
// This file is loaded by Vite but the main app still runs from inline script in index.html

// Log successful Vite module loading
console.log('%c[Vite] 🚀 Module loaded successfully', 'color: #4ade80; font-weight: bold');
console.log('[Vite] Ready for progressive migration from inline script');

// Expose a hook for future migration to full Vite setup
if (typeof window !== 'undefined') {
  window.viteReady = true;
  window.viteVersion = import.meta.env?.MODE || 'development';
  
  // Future hook for when we fully migrate from inline script
  window.mountViteApp = () => {
    console.log('[Vite] Mounting React app via Vite...');
    // This will be used when we migrate away from inline script
  };
}

// Handle potential MIME type issues gracefully
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('[Vite] Hot reload triggered');
  });
}
