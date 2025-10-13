# Smart Dental Healthcare – Agent Guide

## Mission Snapshot

- Provide fast, context-aware support for a tri-surface stack (web, mobile, backend) serving dental scheduling, follow-ups, and patient engagement.
- Prioritize maintaining end-to-end flows: appointment booking, notifications, telehealth/chat, and cloud asset handling.
- Keep guidance rooted in the repo docs; call out mismatches (several README files are boilerplate or outdated).

## Repo Topography

- `client/` Next.js 15 app using the App Router, Redux Toolkit, Radix UI, Tailwind v4, and NextAuth beta; see feature notes in `client/README.md`.
- `server/` NestJS 11 API with MongoDB, sockets, mailer, and Gemini AI helpers; scripts for seeding doctors/medications and Cloudinary diagnostics under `scripts/`.
- `mobile/` Expo Router app (React Native 0.81) sharing auth/chat utilities; starts on port 8082 to align with CORS in `server/env.example`.
- Domain briefs live in root Markdown files (`APPOINTMENT_FIXES_SUMMARY.md`, `ENHANCED_CHATBOT_INTEGRATION.md`, etc.); skim before touching related modules.
- `docker-compose.yml` orchestrates services when local Mongo or future services are needed; confirm versions before relying on it.

## Prerequisites & Tooling

- Node.js 18+ (aligns with Next 15 and Expo 54), npm preferred; ensure `npm install -g expo-cli` if running native emulators.
- MongoDB reachable at `mongodb://localhost:27017/smart_dental_healthcare` unless overriding `MONGODB_URI`.
- Cloudinary credentials and Gemini API key required for media upload and AI flows; copy `server/env.example` when provisioning.
- VS Code recommended with ESLint and Tailwind plugins; repository already includes shared configs (`eslint.config.mjs`, `.prettierrc`).

## Runbooks

- **API (NestJS)**: `cd server; npm install; cp env.example .env` (fill secrets); start with `npm run dev`; tests via `npm run test`, lint via `npm run lint`; use seed scripts (`npm run seed:doctors`, `npm run seed:medications`) to populate baselines.
- **Web (Next.js)**: `cd client; npm install; cp .env.example .env` (if present) or sync with backend team; launch `npm run dev` (Turbopack, port 3000); `npm run lint` enforces rules; `npm run build` before deployment.
- **Mobile (Expo)**: `cd mobile; npm install; cp .env.example .env` (create if missing based on backend env); run `npm start` or platform-specific scripts (`npm run android`, `npm run ios`, `npm run web`) which bind to port 8082; Expo lint via `npm run lint`.
- **Full stack loop**: start backend first (port 3001), then web and/or mobile; confirm CORS origins include `http://localhost:3000` and `http://localhost:8082`.

## Quality Bar

- Respect TypeScript strictness; prefer typed hooks/selectors in `client/src/hooks/` and shared models in `client/src/types/`.
- Keep Redux changes consistent with guidance in `REDUX_MIGRATION_SUMMARY.md`; centralize state where noted.
- Socket features touch both `server/src` gateways and web/mobile chat utilities—verify interfaces in tandem.
- Before PRs, run `npm run lint` and relevant tests per surface; add or update tests in `server/test/` and client component/unit harnesses as features expand.

## Collaboration Patterns

- When requesting help, paste file paths plus snippets; link related domain docs from the root for clarity.
- Note environment assumptions (ports, third-party keys) so commands can be reproduced.
- For architectural questions, identify whether change targets web, mobile, backend, or shared contracts to fetch the right context quickly.
- Use the Decision Log to capture assumptions or pending clarifications; keep it pruned so future assistants enter with clean state.

## Optional MCP Hooks

- **Command:repo-search** → enable fuzzy codebase queries (map to ripgrep or built-in search).
- **Command:npm-lint** → wraps `npm run lint` for `client`, `mobile`, `server` depending on requested surface.
- **Command:npm-test** → runs appropriate test suites (`client` currently lacks tests; backend uses Jest).
- **Command:env-sync** → script that copies `server/env.example` into each surface and flags missing secrets.
- These are helpful but not required; plain npm scripts already cover core workflows.

## Decision Log

- _None yet. Add open assumptions or blockers here._
