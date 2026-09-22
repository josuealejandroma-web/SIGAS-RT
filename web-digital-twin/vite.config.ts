import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src')
        }
    },
    server: {
        port: 5173,
        host: true,
    open: false,
        headers: {
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin'
        }
    },
    build: {
        target: 'esnext',
        minify: 'esbuild',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules')) {
                        if (id.includes('@playcanvas/react') || id.includes('playcanvas')) {
                            return 'playcanvas';
                        }
                        if (id.includes('react') || id.includes('react-dom')) {
                            return 'react';
                        }
                        if (id.includes('zustand')) {
                            return 'vendor';
                        }
                        return 'vendor';
                    }
                }
            }
        }
    },
    optimizeDeps: {
        include: ['@playcanvas/react', 'playcanvas', 'zustand']
    },
    define: {
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '0.0.0')
    }
});
