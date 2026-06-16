import js from '@eslint/js';
import cypressPlugin from 'eslint-plugin-cypress';
import mochaPlugin from 'eslint-plugin-mocha';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  tseslint.configs.recommended,
  cypressPlugin.configs.recommended,
  mochaPlugin.configs.recommended,
  {
    rules: {
      'mocha/consistent-spacing-between-blocks': 'error',
    },
  },
  prettierConfig,
  {
    ignores: ['node_modules/', 'cypress/videos/', 'cypress/screenshots/', 'cypress/downloads/'],
  },
);
