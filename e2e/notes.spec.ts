import { expect, test } from "@playwright/test"
import { closeDb, resetProgress } from "./db"
import { enterStudyMode, jumpToSection, noteStatus, openCourse, setNote, studyEditor } from "./helpers"

// One seeded course is shared across the suite; resetProgress before each test
// clears notes and the playback-resume state so every test starts on section 1.
test.describe("study mode — notes", () => {
  test.beforeEach(async ({ page }) => {
    await resetProgress()
    await openCourse(page)
    await enterStudyMode(page)
  })
  test.afterAll(closeDb)

  test("typing autosaves and the status settles on Saved", async ({ page }) => {
    await setNote(page, "Support is a price floor")
    await expect(noteStatus(page)).toHaveText("Saved", { timeout: 10_000 })
    await expect(studyEditor(page)).toContainText("Support is a price floor")
  })

  test("notes persist across a reload", async ({ page }) => {
    await setNote(page, "Reload persistence check")
    await expect(noteStatus(page)).toHaveText("Saved", { timeout: 10_000 })

    await page.reload()
    await expect(page.getByRole("heading", { name: /Section One/ })).toBeVisible({ timeout: 20_000 })
    await enterStudyMode(page)
    await expect(studyEditor(page)).toContainText("Reload persistence check")
  })

  test("each section keeps its own note", async ({ page }) => {
    await setNote(page, "Note for section one")
    await expect(noteStatus(page)).toHaveText("Saved", { timeout: 10_000 })

    await page.getByRole("button", { name: "Next section" }).click()
    await expect(studyEditor(page)).not.toContainText("Note for section one")
    await setNote(page, "Note for section two")
    await expect(noteStatus(page)).toHaveText("Saved", { timeout: 10_000 })

    await page.getByRole("button", { name: "Previous section" }).click()
    await expect(studyEditor(page)).toContainText("Note for section one")
    await expect(studyEditor(page)).not.toContainText("Note for section two")
  })

  test("bold formatting applies to selected text", async ({ page }) => {
    const editor = studyEditor(page)
    await setNote(page, "bold words")
    // Select the text and toggle bold via the keyboard shortcut — clicking the
    // toolbar button blurs the editor (HeroUI onPress), which drops the mark.
    await editor.click()
    await page.keyboard.press("ControlOrMeta+a")
    await page.keyboard.press("ControlOrMeta+b")
    await expect(editor.locator("strong")).toHaveText("bold words")
  })

  test("an untouched empty note never reports Saved", async ({ page }) => {
    // Regression for the data-loss bug: an editor the user never typed into must
    // not autosave <p></p> over a real note. Progress is reset before each test,
    // so section three is empty and its status line stays blank, not "Saved".
    await jumpToSection(page, "Section Three")
    await expect(page.getByTestId("section-dropdown-trigger")).toContainText("Section Three")
    await expect(noteStatus(page)).toHaveText("")
  })
})
