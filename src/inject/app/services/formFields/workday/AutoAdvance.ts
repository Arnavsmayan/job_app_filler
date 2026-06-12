import { sleep } from '@src/shared/utils/async'
import { getElements } from '@src/shared/utils/getElements'

/**
 * Auto-advance through Workday application pages.
 *
 * After all visible fields on the current page have been auto-filled, click
 * the page's "Save and Continue" / "Next" button so the next page loads and
 * the existing MutationObserver in inject.ts re-runs the field discovery +
 * autofill chain. Stops at the Review / Submit screen so the user clicks
 * Submit themselves.
 *
 * Heuristics:
 * - "Submit", "Submit Application", "Confirm" buttons => stop.
 * - "Save and Continue" / "Next" / "Continue" => click.
 * - Wait for the page (h2 / h3) to settle before clicking, and for the URL
 *   or page header to change after clicking before re-running.
 */

const ADVANCE_LABELS = [
  'save and continue',
  'next',
  'continue',
  'save & continue',
]

const STOP_LABELS = [
  'submit',
  'submit application',
  'review and submit',
  'confirm',
]

function buttonText(btn: HTMLElement): string {
  return (btn.textContent || '').trim().toLowerCase()
}

function isVisible(el: HTMLElement): boolean {
  if ((el as HTMLButtonElement).disabled) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

function findAdvanceButton(): HTMLElement | null {
  const buttons = getElements(document, './/button')
  // Prefer non-stop labels first.
  const advance = buttons.find((b) => {
    const t = buttonText(b)
    if (!isVisible(b)) return false
    if (STOP_LABELS.some((s) => t === s || t.startsWith(s))) return false
    return ADVANCE_LABELS.some((a) => t === a || t.includes(a))
  })
  return advance || null
}

function isOnSubmitPage(): boolean {
  const buttons = getElements(document, './/button')
  return buttons.some((b) => {
    if (!isVisible(b)) return false
    const t = buttonText(b)
    return STOP_LABELS.some((s) => t === s || t.startsWith(s))
  })
}

function pageHeader(): string {
  const h = document.querySelector('h2') as HTMLElement | null
  return h?.innerText?.trim() || ''
}

async function waitForHeaderChange(prev: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const cur = pageHeader()
    if (cur && cur !== prev) return true
    await sleep(150)
  }
  return false
}

async function pageHasUnfilledRequiredFields(): Promise<boolean> {
  // Workday marks required-but-empty inputs with [aria-required="true"]
  // and aria-invalid or a visible "required" error span. Short, conservative check.
  const requireds = Array.from(
    document.querySelectorAll('[aria-required="true"]')
  ) as HTMLElement[]
  for (const el of requireds) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'input' || tag === 'textarea') {
      const v = (el as HTMLInputElement).value
      if (!v) return true
    }
  }
  return false
}

let advancing = false
let lastClickedHeader = ''

/**
 * Try to auto-advance once. Safe to call repeatedly from the MutationObserver.
 * - No-op if already advancing.
 * - No-op if on submit page.
 * - No-op if there are unfilled required fields.
 */
export async function tryAutoAdvance(): Promise<void> {
  if (advancing) return
  if (isOnSubmitPage()) return
  const header = pageHeader()
  if (!header) return
  // Avoid clicking on the same page twice without it changing.
  if (header === lastClickedHeader) return

  const advanceBtn = findAdvanceButton()
  if (!advanceBtn) return

  // Give the page a beat to finish autofills triggered by our chain.
  await sleep(900)

  if (await pageHasUnfilledRequiredFields()) return

  // Re-check button still there + visible (page may have re-rendered).
  const stillThere = findAdvanceButton()
  if (!stillThere) return

  advancing = true
  lastClickedHeader = header
  try {
    stillThere.click()
    // Wait for the page to actually change.
    await waitForHeaderChange(header, 6000)
  } finally {
    advancing = false
  }
}
