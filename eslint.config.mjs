import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import configPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
    js.configs.recommended,
    ...pluginVue.configs['flat/recommended'],
    configPrettier,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021,
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        rules: {
            'vue/multi-word-component-names': 'off',
            'no-unused-vars': 'warn',
            'no-console': 'off',
            'no-debugger': 'warn',
            'vue/no-v-html': 'off',
        },
    },
    {
        ignores: ['dist/**', 'node_modules/**', 'docs/**'],
    },
];
