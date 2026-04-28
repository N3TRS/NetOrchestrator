// @ts-check
import security from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    plugins: { security },
    languageOptions: {
      parser: tseslint.parser,
      globals: { ...globals.node },
    },
    rules: {
      'security/detect-unsafe-regex': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-object-injection': 'error',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-child-process': 'error',
    },
  },
];
