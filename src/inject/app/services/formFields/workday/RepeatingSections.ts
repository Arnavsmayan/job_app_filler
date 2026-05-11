import { sleep } from '@src/shared/utils/async'
import { getElements } from '@src/shared/utils/getElements'
import { contentScriptAPI } from '../../contentScriptApi'

function findAddButton(sectionBaseName: string): HTMLElement | null {
  const buttons = getElements(document, './/button')
  const lowerBase = sectionBaseName.toLowerCase()
  return (
    buttons.find((btn) => {
      const text = btn.textContent?.toLowerCase() || ''
      return text.includes('add') && text.includes(lowerBase)
    }) || null
  )
}

function countExistingSections(sectionBaseName: string): number {
  const h4s = getElements(document, './/h4')
  const lowerBase = sectionBaseName.toLowerCase()
  return h4s.filter((h4) => {
    const text = h4.innerText?.toLowerCase() || ''
    return text.startsWith(lowerBase)
  }).length
}

export async function expandRepeatingSections(): Promise<void> {
  const response = await contentScriptAPI.send('getSectionCounts', {})
  if (!response.ok || !response.data) return

  const sectionCounts = response.data as { [baseName: string]: number }

  for (const [baseName, savedCount] of Object.entries(sectionCounts)) {
    if (savedCount <= 1) continue

    let existingCount = countExistingSections(baseName)

    while (existingCount < savedCount) {
      const addButton = findAddButton(baseName)
      if (!addButton) break

      addButton.click()
      await sleep(1500)

      const newCount = countExistingSections(baseName)
      if (newCount <= existingCount) break
      existingCount = newCount
    }
  }
}
