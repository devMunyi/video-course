import { existsSync } from "node:fs"
import { defineConfig, devices } from "@playwright/test"

// Study-mode e2e against a local stack: throwaway docker Postgres (:5433) + a
// `next dev` on :3009 loaded from .env.test. globalSetup provisions the DB and
// writes storageState (auth is Google-only, so specs load a seeded session cookie
// rather than driving a login form). Chromium is reused from the local cache when
// present; CI falls back to `playwright install chromium`.
const localChromium = `${process.env.HOME}/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`
const chromiumExe = existsSync(localChromium) ? localChromium : undefined

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false, // one seeded course, shared note state — keep serial
  workers: 1,
  retries: 0,
  // `next dev` compiles each route on first hit, which can take 20s+ cold, so the
  // budgets are generous rather than tight.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3009",
    storageState: "./e2e/.auth/state.json",
    trace: "retain-on-failure",
    ...(chromiumExe ? { launchOptions: { executablePath: chromiumExe } } : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "dotenv -e .env.test -- next dev -p 3009",
    url: "http://localhost:3009/login",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
})
