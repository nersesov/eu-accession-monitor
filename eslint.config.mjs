import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', '.pnpm-store/**', 'src/migrations/**', 'src/payload-types.ts', 'src/app/(payload)/**', 'tests/k6/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**', '.lighthouseci/**'],
  },
  ...nextVitals,
  ...nextTs,
  { rules: { '@typescript-eslint/no-explicit-any': 'off' } },
]

export default config
