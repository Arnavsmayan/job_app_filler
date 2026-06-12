import { sleep } from '@src/shared/utils/async'
import { getElements } from '@src/shared/utils/getElements'
import { contentScriptAPI } from '../../contentScriptApi'

function findAddButton(sectionBaseName: string): HTMLElement | null {
  const buttons = getElements(document, './/button')
  const lowerBase = sectionBaseName.toLowerCase()
  // Prefer exact-ish "Add <Section>" buttons; fall back to any button with "add" + base.
  const candidates = buttons.filter((btn) => {
    const text = btn.textContent?.toLowerCase() || ''
    return text.includes('add') && text.includes(lowerBase)
  })
  if (candidates.length === 0) return null
  // Workday usually exposes a single visible "Add" button; pick the one that is
  // actually attached, visible, and enabled.
  const visible = candidates.find((btn) => {
    const el = btn as HTMLButtonElement
    if (el.disabled) return false
    const rect = el.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  })
  return visible || candidates[0]
}

function countExistingSections(sectionBaseName: string): number {
  const h4s = getElements(document, './/h4')
  const lowerBase = sectionBaseName.toLowerCase()
  return h4s.filter((h4) => {
    const text = h4.innerText?.toLowerCase() || ''
    return text.startsWith(lowerBase)
  }).length
}

/** Poll until predicate returns true, up to `timeoutMs`. Returns whether it succeeded. */
async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
  intervalMs: number = 100
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) return true
    await sleep(intervalMs)
  }
  return predicate()
}

export async function expandRepeatingSections(): Promise<void> {
  const response = await contentScriptAPI.send('getSectionCounts', {})
  if (!response.ok || !response.data) return

  const sectionCounts = response.data as { [baseName: string]: number }

  for (const [baseName, savedCount] of Object.entries(sectionCounts)) {
    if (savedCount <= 1) continue

    let existingCount = countExistingSections(baseName)
    let consecutiveFailures = 0

    while (existingCount < savedCount) {
      const addButton = findAddButton(baseName)
      if (!addButton) {
        // Add button may not be rendered yet — wait briefly for it.
        const appeared = await waitFor(
          () => findAddButton(baseName) !== null,
          1500
        )
        if (!appeared) break
        continue
      }

      addButton.click()

      // Poll for the new section instead of fixed sleep — much faster.
      const grew = await waitFor(
        () => countExistingSections(baseName) > existingCount,
        2500
      )

      const newCount = countExistingSections(baseName)
      if (!grew || newCount <= existingCount) {
        consecutiveFailures += 1
        if (consecutiveFailures >= 2) break
        // Give the page a moment then retry.
        await sleep(300)
        continue
      }
      consecutiveFailures = 0
      existingCount = newCount
    }
  }
}
