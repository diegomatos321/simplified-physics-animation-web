import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    build: {
        lib: {
            entry: {
                index: resolve(__dirname, 'src/index.ts'),
                core: resolve(__dirname, 'src/core/index.ts'),
                bodies: resolve(__dirname, 'src/bodies/index.ts'),
                worker: resolve(__dirname, 'src/worker/index.ts'),
            },
            name: 'LisoEngine',
        },
        rollupOptions: {
            external: ['earcut', 'gl-matrix'],
        },
        watch: {},
    },
    plugins: [tsconfigPaths()],
});
