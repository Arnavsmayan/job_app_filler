import { Server } from '@src/shared/utils/crossContextCommunication/server'
import { FieldPath, Answer } from '@src/shared/utils/types'
import { EVENT_LISTENER_ID, loadApp } from './app/App'
import { answers1010, migrate1010 } from './utils/storage/Answers1010'
import { convert106To1010, convert1010To106, sectionBaseName, sectionNumber } from './utils/storage/DataStore'
import { SavedAnswer } from './utils/storage/DataStoreTypes'
import { migrateEducation } from './utils/storage/migrateEducationSectionNames'
import { profileStore, Profile } from './utils/storage/profileStore'
import { aiSettingsStore, AiSettings } from './utils/storage/aiSettingsStore'
import { llmFallbackMatch, clearLlmCache } from './utils/llmFallback'

// Regiser server and methods accessible to injected script.
const server = new Server(process.env.CONTENT_SCRIPT_URL)
server.register('addAnswer', async (newAnswer: Answer) => {
  const answer1010 = answers1010.add(convert106To1010(newAnswer))
  return convert1010To106(answer1010)
})

server.register('updateAnswer', async (newAnswer: Answer) => {
  const answer1010 = answers1010.update(
    convert106To1010(newAnswer) as SavedAnswer
  )
  return convert1010To106(answer1010)
})

server.register('getAnswer', async (fieldPath: FieldPath) => {
  const saved = answers1010.search(fieldPath).map((record) => convert1010To106(record))
  if (saved.length > 0) {
    return saved
  }
  // Fallback 1: profile-based pre-defined answers (visa, work auth, etc.)
  const profileMatches = profileStore.match(fieldPath)
  if (profileMatches.length > 0) {
    return profileMatches.map((record) => convert1010To106(record))
  }
  // Fallback 2: LLM-driven autofill (cached per field signature).
  const llmMatches = await llmFallbackMatch(fieldPath)
  return llmMatches.map((record) => convert1010To106(record))
})

server.register('getProfile', async () => {
  return profileStore.get()
})

server.register('setProfile', async (profile: Profile) => {
  await profileStore.set(profile)
  return profileStore.get()
})

server.register('resetProfile', async () => {
  return profileStore.reset()
})

server.register('getAiSettings', async () => {
  return aiSettingsStore.get()
})

server.register('setAiSettings', async (next: Partial<AiSettings>) => {
  return aiSettingsStore.set(next)
})

server.register('clearLlmCache', async () => {
  await clearLlmCache()
  return true
})

server.register('deleteAnswer', async (id: number) => {
  return answers1010.delete(id)
})

server.register('getSectionCounts', async () => {
  const allAnswers = answers1010.getAll()
  const sectionCounts: { [baseName: string]: number } = {}
  allAnswers.forEach((answer) => {
    const section = answer.section
    if (!section) return
    const baseName = sectionBaseName(section)
    const num = sectionNumber(section)
    sectionCounts[baseName] = Math.max(sectionCounts[baseName] || 0, num)
  })
  // Merge with profile-defined section counts so multi-position
  // experience / education entries get added even without saved answers.
  const profileCounts = profileStore.sectionCounts()
  for (const [baseName, count] of Object.entries(profileCounts)) {
    sectionCounts[baseName] = Math.max(sectionCounts[baseName] || 0, count)
  }
  return sectionCounts
})

// inject script
function injectScript(filePath: string) {
  const script = document.createElement('script')
  script.src = chrome.runtime.getURL(filePath)
  script.setAttribute('async', 'true')
  script.type = 'module'
  script.onload = function () {
    script.remove()
  }
  ;(document.head || document.documentElement).appendChild(script)
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHOW_WHATS_NEW') {
    document.dispatchEvent(new CustomEvent(EVENT_LISTENER_ID))
  }
})

const run = async () => {
  await answers1010.load()
  await migrate1010()
  await migrateEducation()
  await profileStore.load()
  await aiSettingsStore.load()
  injectScript('inject.js')
  loadApp()
}

run()
