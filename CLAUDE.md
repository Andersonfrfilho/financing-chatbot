# Project Rules

## Code Style

- **No abbreviations or diminutives** in variable names, function names, or identifiers. Use full descriptive words always.
- **Locale imports** must use `text` as the alias, never `t`:
  ```ts
  // correct
  import { leads as text } from '@/locales'
  // wrong
  import { leads as t } from '@/locales'
  ```

## Locale System

- All UI strings live in `apps/web/src/locales/`
- Shared strings: `locales/shared/common.ts` and `locales/shared/navigation.ts`
- Per-module strings: `locales/modules/<module>.ts`
- Parameterized strings use typed functions: `subtitle: (total: number) => \`${total} leads encontrados\``
- Import alias is always `text`: `import { leads as text } from '@/locales'`
