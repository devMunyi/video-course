# End-to-end tests

Playwright specs for study mode — navigation, the milestone dropdown, and the
notes editor (autosave, per-section isolation, persistence, formatting).

## Running

```bash
bun run e2e          # headless, full suite
bun run e2e:ui       # Playwright UI mode
bun run e2e:db:down  # stop the throwaway Postgres when done
```

`bun run e2e` is self-contained: `globalSetup` starts a throwaway Postgres
(`docker-compose.e2e.yml`, port **55432**, tmpfs so it wipes on stop), applies the
schema with `prisma db push`, seeds fixtures, and Playwright then boots
`next dev` on **:3009** from `.env.test`. Chromium is reused from the local
Playwright cache; CI installs its own.

## Why it looks the way it does

**No login flow.** Auth is Google-only, so there is no credential form to drive.
`seed.ts` inserts a Session row and signs its token into the same cookie
better-auth would set (`better-auth/crypto` → `makeSignature`), written as
Playwright `storageState`. Every spec starts already authenticated.

**Never touches production.** `.env.test` points at the docker DB. `prisma.config.ts`
loads `.env.local` (Neon) unconditionally, so `global-setup` passes `--url` to
`db push` and refuses to run unless the URL is the throwaway DB. `seed.ts` has the
same guard.

**The video is not driven.** Study mode embeds a real YouTube iframe — external,
flaky, non-deterministic. The specs assert the deterministic surface (open/exit,
section navigation, counter, notes) and only that exactly one iframe is mounted.
They do not assert playback position or seeking.

**State reset per test.** One seeded course is shared. Notes and the
playback-resume fields (`lastMilestoneId`, `lastPositionSec`, which the player
genuinely writes once it plays) are cleared in `resetProgress()` before each test,
so every test starts on section 1 with a blank note.

## Files

| file | role |
|---|---|
| `fixtures.ts` | the seeded user, course content, session token — one source of truth |
| `seed.ts` | wipes + seeds the e2e DB, writes `storageState` |
| `db.ts` | direct `pg` connection for per-test `resetProgress()` |
| `global-setup.ts` | docker up → `db push` → seed |
| `helpers.ts` | `openCourse`, `enterStudyMode`, `setNote`, `jumpToSection`, … |
| `study-mode.spec.ts` | navigation, dropdown, counter, single-player regression |
| `notes.spec.ts` | autosave, persistence, per-section isolation, formatting |

## Selector notes for future specs

- The milestone dropdown uses single selection, so items are
  `role="menuitemradio"`, **not** `menuitem`.
- Stable hooks on the study-mode header: `section-counter`,
  `section-dropdown-trigger`, `note-status`.
- The editor is `.note-prose[contenteditable='true']`.

## Bugs this suite has already caught

- Clicking Next before the YouTube player fired `onReady` threw
  `seekTo is not a function` and tripped the error boundary — fixed by guarding
  the section-change seek.
