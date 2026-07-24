import { expect, test } from "@playwright/test"
import { closeDb, resetProgress } from "./db"
import { enterStudyMode, jumpToSection, openCourse } from "./helpers"

test.describe("study mode — navigation", () => {
  test.beforeEach(async ({ page }) => {
    await resetProgress() // clean notes + resume so we always open on section 1
    await openCourse(page)
    await enterStudyMode(page)
  })
  test.afterAll(closeDb)

  test("opens as an overlay and exits back to the course", async ({ page }) => {
    await expect(page.getByTestId("section-counter")).toBeVisible()
    await page.getByRole("button", { name: "Exit" }).click()
    await expect(page.getByRole("button", { name: "Exit" })).toBeHidden()
    await expect(page.getByRole("heading", { name: /Section One/ })).toBeVisible()
  })

  test("shows a section counter", async ({ page }) => {
    await expect(page.getByTestId("section-counter")).toContainText("1 of 3")
  })

  test("Previous is disabled on the first section, Next is enabled", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Previous section" })).toBeDisabled()
    await expect(page.getByRole("button", { name: "Next section" })).toBeEnabled()
  })

  test("Next / Previous walk through sections and clamp at the ends", async ({ page }) => {
    await expect(page.getByTestId("section-dropdown-trigger")).toContainText("Section One")

    await page.getByRole("button", { name: "Next section" }).click()
    await expect(page.getByTestId("section-dropdown-trigger")).toContainText("Section Two")
    await expect(page.getByTestId("section-counter")).toContainText("2 of 3")

    await page.getByRole("button", { name: "Next section" }).click()
    await expect(page.getByTestId("section-dropdown-trigger")).toContainText("Section Three")

    // Last section: Next disabled, Previous enabled.
    await expect(page.getByRole("button", { name: "Next section" })).toBeDisabled()
    await expect(page.getByRole("button", { name: "Previous section" })).toBeEnabled()

    await page.getByRole("button", { name: "Previous section" }).click()
    await expect(page.getByTestId("section-dropdown-trigger")).toContainText("Section Two")
  })

  test("the milestone dropdown jumps directly to any section", async ({ page }) => {
    await jumpToSection(page, "Section Three")
    await expect(page.getByTestId("section-dropdown-trigger")).toContainText("Section Three")
    await expect(page.getByRole("button", { name: "Next section" })).toBeDisabled()
  })

  test("regression: only one video player is mounted in study mode", async ({ page }) => {
    // The bug was the inline course layout staying mounted underneath, running a
    // second YouTube player. Study mode must own the only video mount.
    await expect
      .poll(async () => page.locator("iframe").count(), { timeout: 15_000 })
      .toBeLessThanOrEqual(1)
  })
})
