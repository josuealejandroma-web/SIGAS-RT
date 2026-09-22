import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
        pool: 'vmThreads',
        maxWorkers: 1,
        isolate: false,
        testTimeout: 30000,
        hookTimeout: 30000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'tests/', '*.config.ts', '*.config.js']
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src')
        }
    }
});
