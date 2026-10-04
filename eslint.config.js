import js from '@eslint/js';
import vueConfigPrettier from '@vue/eslint-config-prettier';
import pluginVue from 'eslint-plugin-vue';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
    { files: ['**/*.{js,mjs,cjs,ts,vue}'], plugins: { js }, extends: ['js/recommended'] },
    { files: ['**/*.{js,mjs,cjs,ts,vue}'], languageOptions: { globals: globals.browser } },
    tseslint.configs.recommended,
    pluginVue.configs['flat/essential'],
    {
        files: ['**/*.vue'],
        languageOptions: { parserOptions: { parser: tseslint.parser } },
    },
    { files: ['**/*.{ts,vue}'], rules: { 'no-undef': 'off' } },
    vueConfigPrettier,
    globalIgnores(['dist/', 'releases/']),
    { files: ['scripts/**', '*.config.*'], languageOptions: { globals: globals.node } },
    {
        rules: {
            'vue/multi-word-component-names': 'off',
            'vue/attributes-order': ['error', { alphabetical: true }],
        },
    },
]);
