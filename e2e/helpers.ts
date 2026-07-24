import { expect, type Page } from "@playwright/test"
import { TEST_COURSE_ID } from "./fixtures"

/** Open the seeded course. Session cookie is already loaded via storageState. */
export async function openCourse(page: Page) {
  await page.goto(`/courses/${TEST_COURSE_ID}`)
  // The course page is client-rendered off a tRPC query; wait for the milestone
  // heading rather than networkidle (the YouTube embed keeps the network busy).
  // 40s covers the cold `next dev` route compile on the first hit of the suite.
  await expect(page.getByRole("heading", { name: /Section One/ })).toBeVisible({ timeout: 40_000 })
}

/** Open the milestone dropdown and jump to a section by its visible title.
 *  The menu uses single-selection, so react-aria gives items role
 *  "menuitemradio" rather than "menuitem". */
export async function jumpToSection(page: Page, titleFragment: string) {
  await page.getByTestId("section-dropdown-trigger").click()
  await page.getByRole("menuitemradio").filter({ hasText: titleFragment }).click()
}

/** Enter study mode via the top-bar button and wait for its header. */
export async function enterStudyMode(page: Page) {
  await page.getByRole("button", { name: "Study mode" }).first().click()
  await expect(page.getByRole("button", { name: "Exit" })).toBeVisible()
}

/** The ProseMirror editor inside study mode. */
export function studyEditor(page: Page) {
  // Study mode is the only editor mounted while open (the inline one unmounts).
  return page.locator(".note-prose[contenteditable='true']")
}

/** Replace the editor's contents with `text` — tests share one seeded course, so
 *  clearing first makes each note assertion independent of what ran before. */
export async function setNote(page: Page, text: string) {
  const editor = studyEditor(page)
  await editor.click()
  await page.keyboard.press("ControlOrMeta+a")
  await page.keyboard.press("Delete")
  await editor.pressSequentially(text, { delay: 10 })
}

/** The autosave status line ("Saving…" / "Saved" / "Unsaved" / empty). */
export function noteStatus(page: Page) {
  return page.getByTestId("note-status")
}

