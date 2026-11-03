import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'next-env.d.ts',
      'design/**',
      'docs/**',
      'public/fonts/**',
      'data/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['app/api/**/*.ts'],
    rules: {
      'max-lines': ['error', { max: 120, skipBlankLines: true, skipComments: true }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/db', '@/lib/db/*'],
              message: 'Route handlers must go through feature services, not the database layer.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['app/**/page.tsx', 'app/**/layout.tsx'],
    rules: {
      'max-lines': ['error', { max: 120, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['components/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/lib/db',
                '@/lib/db/*',
                '@/lib/auth',
                '@/lib/auth/server',
                '@/lib/auth/auth-core',
              ],
              message: 'UI components must not reach into server infrastructure.',
            },
            {
              group: ['@/features/*/service', '@/features/*/queries'],
              message:
                'UI components must consume feature queries through the public feature entry.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['lib/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*', '@/features/*'],
              message: 'Infrastructure modules must not import application or feature modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];

export default eslintConfig;
