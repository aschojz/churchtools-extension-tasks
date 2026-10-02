import { churchtoolsClient } from '@churchtools/churchtools-client';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { queryClient } from './data/queryClient';
import { loadCurrentUser } from './platform';
import { router } from './router';
import './tailwind.css';

// only import reset.css in development mode to keep the production bundle small and to simulate CT environment
if (import.meta.env.MODE === 'development') {
    import('@fortawesome/fontawesome-free/css/all.css');
    import('./utils/reset.css');
}

declare const window: Window &
    typeof globalThis & {
        settings: {
            base_url?: string;
        };
        t?: (key?: string, ...args: unknown[]) => string;
    };

const baseUrl = window.settings?.base_url ?? import.meta.env.VITE_BASE_URL ?? window.location.origin;
churchtoolsClient.setBaseUrl(baseUrl);

const username = import.meta.env.VITE_USERNAME;
const password = import.meta.env.VITE_PASSWORD;
if (import.meta.env.MODE === 'development' && username && password) {
    await churchtoolsClient.post('/login', { username, password });
}

const KEY = import.meta.env.VITE_KEY;
export { KEY };

const pinia = createPinia();
await loadCurrentUser();
const app = createApp(App);
app.use(pinia);
app.use(router);
app.use(VueQueryPlugin, { queryClient });
app.mount('#app');
