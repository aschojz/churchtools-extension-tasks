import js from '@eslint/js';
import vueConfigPrettier from '@vue/eslint-config-prettier';
import vueConfigTypescript from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
    { files: ['**/*.{js,mjs,cjs,ts,vue}'], plugins: { js }, extends: ['js/recommended'] },
    { files: ['**/*.{js,mjs,cjs,ts,vue}'], languageOptions: { globals: globals.browser } },
    tseslint.configs.recommended,
    pluginVue.configs['flat/essential'],
    ...vueConfigTypescript(),
    vueConfigPrettier,
    globalIgnores(['dist/', 'releases/', 'src/assets/', 'src/utils/ct-types.d.ts']),
    { files: ['scripts/**', '*.config.*'], languageOptions: { globals: globals.node } },
    {
        rules: {
            'vue/multi-word-component-names': 'off',
            'vue/no-explicit-any': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            'vue/attributes-order': ['error', { alphabetical: true }],
        },
    },
]);
