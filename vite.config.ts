import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd());
    const key = env.VITE_KEY || 'tasks';
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('VITE_KEY must be an extension key');
    return {
        base: `/ccm/${key}/`,
        plugins: [vue(), tailwindcss()],
        resolve: {
            dedupe: ['vue', 'pinia', '@tanstack/vue-query'],
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
    };
});
