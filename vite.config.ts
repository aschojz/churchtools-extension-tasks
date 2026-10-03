import ui from '@nuxt/ui/vite';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const packageVersion = (
    JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
        version: string;
    }
).version;

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd());
    const key = env.VITE_KEY || 'tasks';
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('VITE_KEY must be an extension key');
    let buildCommit = env.VITE_BUILD_COMMIT || process.env.GITHUB_SHA?.slice(0, 7);
    if (!buildCommit) {
        try {
            buildCommit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
        } catch {
            buildCommit = 'unbekannt';
        }
    }
    return {
        base: `/ccm/${key}/`,
        define: {
            __APP_VERSION__: JSON.stringify(packageVersion),
            __BUILD_COMMIT__: JSON.stringify(buildCommit),
        },
        plugins: [
            vue(),
            tailwindcss(),
            ui({
                experimental: { componentDetection: true },
                icon: { clientBundle: { scan: true } },
                theme: { prefix: 'tasks' },
            }),
        ],
        resolve: {
            dedupe: ['vue', 'pinia', '@tanstack/vue-query'],
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
    };
});
