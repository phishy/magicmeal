# MagicMeal Agents

_Last updated: 2025-11-27_

## Snapshot
- Supabase is now the canonical backend. The latest migration (`supabase/migrations/20251127215904_remote_schema.sql`) provisions `profiles`, `meals`, `weight_entries`, and `blood_pressure_entries` with RLS plus helper triggers.
- App boot wraps everything in `SessionProvider` and `ThemePreferenceProvider` inside `app/_layout.tsx`, so authenticated navigation + theming are first-class.
- Food capture flows now lean on Open Food Facts for both text search and barcode lookup, while OpenAI powers voice search and AI-assisted weight imports.
- Tools → Weight is a full-featured Supabase-backed screen with charts, range filters, DocumentPicker import, and SWR caching. Blood pressure is mid-migration (Supabase version exists alongside the legacy AsyncStorage view).
- Types live in `types/index.ts`. When adding new models (products, parser payloads, etc.), update that file first and import everywhere else.

## Active Workstreams

### 1. Supabase-first data & auth
- `lib/supabase.ts`, `providers/SessionProvider.tsx`, and `services/helpers.ts` wire the Supabase JS client into React Native with persisted sessions.
- All CRUD services (`services/meals.ts`, `services/weight.ts`, `services/bloodPressure.ts`) hit Supabase tables created in the latest migration.
- Auth flows in `app/login.tsx` use Supabase email/password. `useSession` gates the tab stack vs login stack.
- Local dev expectations: `supabase start`, grab URL/key from the CLI output, and set `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` before `npx expo start`.

### 2. Food ingestion & lookup
- `services/openFoodFacts.ts` handles both barcode lookups and paginated search, mapping responses into the shared `FoodItem` type.
- `app/food-search.tsx` shows the Open Food Facts results, supports pagination, filtering for branded items, meal logging via `createMeal`, and voice search through Whisper (`services/openai.ts` + `transcribeAudioFile`).
- `app/barcode-scanner.tsx` now pipes scans directly into Open Food Facts, offering "Add to Log" via `createMeal`.
- `app/photo-scanner.tsx` still runs a mock analyzer – hook this up to `services/openai` (or another provider) when we’re ready for real inference.

### 3. Weight intelligence & AI imports
- `app/(tabs)/tools/weight.tsx` renders Supabase-backed history via SWR (`fetchWeightEntries`), grouped weekly summaries, multi-range charts, and deletion via `removeWeightEntry`.
- Document imports call `services/weightImport.ts`, which uses `generateObject` on `gpt-4o-mini` to synthesize a parser, execute it safely, normalize entries, and then batch insert via `createWeightEntries`.
- This path depends on `EXPO_PUBLIC_OPENAI_API_KEY`; we gate UI affordances with `canUseAiWeightImport`.
- `components/WeightTrendChart.tsx` provides the shared sparkline rendering; styles and theming come from `constants/theme.ts`.

### 4. Blood pressure parity gap
- `app/(tabs)/tools/blood-pressure.tsx` is the new Supabase-backed experience mirroring the weight tool patterns (SWR, Supabase service, charting).
- `app/tools/blood-pressure.tsx` is the legacy AsyncStorage implementation that the stack screen currently navigates to (`router.push('/tools/blood-pressure')`). Decide whether to (a) port the Supabase version into the stack route or (b) drop the legacy view and update navigation.

### 5. Theming, session UX, and “You” tab
- `providers/ThemePreferenceProvider.tsx` persists theme selections per-user via AsyncStorage and exposes `useAppTheme`.
- `constants/theme.ts` + `ThemeCatalog` enumerate the palettes surfaced in `app/(tabs)/you.tsx`, where users can switch themes and sign out.
- `ThemePreferenceProvider` wraps the entire tree, so new screens should consume `useAppTheme` instead of custom contexts.

## Open Loops / Next Steps
- Replace the mock implementation in `app/photo-scanner.tsx` with a real AI vision call (OpenAI Vision, Google Cloud Vision, etc.) and move parsing logic into `services/` with typed responses.
- Consolidate the duplicate blood pressure screens: ensure the route that tabs push to is Supabase-backed, then delete the AsyncStorage version (or keep it as an offline fallback, but make that explicit).
- Audit routing for the weight tool: `Stack.Screen name="tools/weight"` currently points to a non-existent root file. Either add a wrapper that renders the `(tabs)` implementation or adjust navigation targets.
- Expand test coverage (or at least smoke scripts) around `services/weightImport.ts` and `services/openFoodFacts.ts` to catch schema drifts from external APIs.
- Continue honoring the “centralize types” rule—if you introduce new payloads (parser responses, nutrition fields, etc.), extend `types/index.ts` and import from there to avoid drift.

## Dev Setup Cheatsheet
- `npm install`
- `supabase start` (or `supabase db start`) → copy URL + anon key into `.env` for Expo.
- `npx expo start` (use `--ios`, `--android`, or `--web` as needed).
- Optional: `EXPO_PUBLIC_OPENAI_API_KEY` unlocks voice search (`app/food-search.tsx`) and weight import (`app/(tabs)/tools/weight.tsx`).
- The `reset-project` script is destructive; treat it as a last resort when bootstrapping a blank Expo app.

Ping this file whenever a workstream lands, pivots, or needs a hand-off so future agents can ramp faster.
