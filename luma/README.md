# luma

An investing app for first-time investors: chat in plain language, get a swipeable feed of
ideas matched to your interests, comfort with risk, and timeline. See `CLAUDE.md` for the full
build spec, guardrails, and milestone plan.

## Setup

```bash
npm install
cp .env.example .env   # add your Supabase project URL and anon key
npx expo start
```

Apply the database migrations in `supabase/migrations/` to your Supabase project, either with
the Supabase CLI (`supabase link` then `supabase db push`) or by pasting them into the SQL
editor.

## Checks

```bash
npm test            # jest (jest-expo)
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
```

## Layout

- `src/app/`: routes (Expo Router). `welcome` and `sign-in` are for signed-out users; `(tabs)` is
  the signed-in app (For you, Saves, You).
- `src/constants/theme.ts`: design tokens (gold/cream palette, type, spacing, radii).
- `src/components/`: shared UI.
- `src/lib/supabase.ts`: Supabase client. `src/providers/auth-provider.tsx`: session state.
- `supabase/migrations/`: database schema.
