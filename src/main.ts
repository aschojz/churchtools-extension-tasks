import { createApp, h } from 'vue';

import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client/core';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { ctStyleguide } from '@churchtools/styleguide';
import '@churchtools/styleguide/style';
import { ctUtils } from '@churchtools/utils';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { provideApolloClient } from '@vue/apollo-composable';
import { createPinia } from 'pinia';
import App from './App.vue';
import { queryClient } from './data/queryClient';
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
const cache = new InMemoryCache();
const apolloClient = new ApolloClient({ cache, link: new HttpLink({ uri: 'https://api.fontawesome.com' }) });
const app = createApp({
    setup() {
        provideApolloClient(apolloClient);
    },
    render: () => h(App),
});
const translate = window.t ?? ((key = '') => key);
app.use(pinia);
app.use(ctUtils, { baseUrl, pinia, t: translate });
app.use(ctStyleguide, { baseUrl, t: translate });
app.use(router);
app.use(VueQueryPlugin, { queryClient });
app.mount('#app');
