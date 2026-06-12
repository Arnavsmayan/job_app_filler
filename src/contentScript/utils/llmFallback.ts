/**
 * LLM-based field fallback.
 *
 * When saved answers + profile rules return nothing for a field, ask an LLM
 * (OpenAI gpt-5.4-mini by default) for an answer. Results are cached
 * per (page, section, fieldType, fieldName) tuple to avoid re-spending
 * tokens on the same field — subsequent loads return instantly from cache.
 */

import { FieldPath } from '@src/shared/utils/types'
import { SavedAnswer } from './storage/DataStoreTypes'
import { aiSettingsStore } from './storage/aiSettingsStore'
import { profileStore } from './storage/profileStore'

const LLM_CACHE_KEY = 'llmCache_v1'
const ESTIMATED_PROMPT_TOKENS = 1200
const ESTIMATED_RESPONSE_TOKENS = 80
const REQUEST_TIMEOUT_MS = 15_000

type CacheEntry = {
  answer: any
  ts: number
}

type Cache = { [key: string]: CacheEntry }

let cacheLoaded = false
let cache: Cache = {}
const inFlight = new Map<string, Promise<any>>()

function cacheKey(fp: FieldPath): string {
  return [fp.page || '', fp.section || '', fp.fieldType, fp.fieldName].join('||')
}

async function loadCache(): Promise<void> {
  if (cacheLoaded) return
  const result = await chrome.storage.local.get(LLM_CACHE_KEY)
  cache = (result[LLM_CACHE_KEY] as Cache) || {}
  cacheLoaded = true
}

async function persistCache(): Promise<void> {
  await chrome.storage.local.set({ [LLM_CACHE_KEY]: cache })
}

function buildPrompt(fp: FieldPath): { system: string; user: string } {
  const profile = profileStore.get()
  const profileSummary = {
    fields: profile.fields || {},
    experience: profile.experience || [],
    education: profile.education || [],
    rules: (profile.rules || []).map((r) => ({
      label: r.label,
      answer: r.answer,
    })),
  }

  const system = [
    'You autofill job application form fields for a single user.',
    'Given the field metadata and the user profile, output ONLY the value to put in that field.',
    '',
    'POSTURE — what to avoid volunteering:',
    '- Do NOT reveal race or ethnicity unless the field explicitly asks for it.',
    '  When asked, prefer "Decline to self-identify".',
    '- For veteran-status fields: respond "I am not a protected veteran".',
    '- For disability self-id fields: respond "No, I do not have a disability".',
    '- For visa/sponsorship questions: the user IS an F-1 (OPT/CPT eligible)',
    '  Indian citizen. They WILL require sponsorship now or in the future.',
    '  They are authorized to work (with OPT) but NOT authorized without sponsorship.',
    '- Never invent work experience. If the asked-about employer is not in the',
    '  profile.experience array, respond SKIP.',
    '- Never invent schools/degrees. If not in profile.education, respond SKIP.',
    '- Salary expectation / desired compensation: respond "Negotiable" unless',
    '  the field requires a number, in which case respond SKIP.',
    '',
    'FORMAT by fieldType:',
    '- BooleanRadio / BooleanCheckbox: respond exactly "Yes" or "No".',
    '- SimpleDropdown / Dropdown / DropdownSearchable: respond with the option text most likely present (one short string).',
    '- MonthYear: respond as "MM/YYYY".',
    '- Year: respond as "YYYY".',
    '- TextInput / TextArea: respond with the user-appropriate value (concise).',
    '',
    'If the field is unanswerable from the profile, respond with the single token: SKIP.',
    'Respond as a JSON object: {"value": <string>}. No prose, no markdown fences.',
  ].join('\n')

  const user = JSON.stringify(
    {
      field: {
        page: fp.page,
        section: fp.section,
        fieldType: fp.fieldType,
        fieldName: fp.fieldName,
      },
      profile: profileSummary,
    },
    null,
    0
  )

  return { system, user }
}

function formatAnswerForFieldType(value: string, fieldType: string): any {
  if (value === undefined || value === null || value === '') return undefined
  const v = String(value).trim()
  if (!v || v.toUpperCase() === 'SKIP') return undefined

  if (fieldType === 'MonthYear') {
    const m = v.match(/(\d{1,2})\s*[\/\-]\s*(\d{2,4})/)
    if (m) return [m[1], m[2]]
    return undefined
  }
  if (fieldType === 'Year') {
    const m = v.match(/\d{4}/)
    return m ? m[0] : v
  }
  if (fieldType === 'SingleCheckbox' || fieldType === 'BooleanCheckbox') {
    return /^(yes|true|y|1)$/i.test(v)
  }
  if (
    fieldType === 'SimpleDropdown' ||
    fieldType === 'Dropdown' ||
    fieldType === 'DropdownSearchable'
  ) {
    return [v]
  }
  return v
}

async function callOpenAI(
  prompt: { system: string; user: string }
): Promise<{ value: string; usage: { input: number; output: number } } | null> {
  const settings = aiSettingsStore.get()
  if (!settings.apiKey) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 200,
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn('[job_app_filler] LLM fallback HTTP', res.status, await safeText(res))
      return null
    }
    const json = await res.json()
    const content = json?.choices?.[0]?.message?.content
    if (!content) return null
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
      return null
    }
    const value = parsed?.value
    if (typeof value !== 'string') return null
    const usage = {
      input: json?.usage?.prompt_tokens || ESTIMATED_PROMPT_TOKENS,
      output: json?.usage?.completion_tokens || ESTIMATED_RESPONSE_TOKENS,
    }
    return { value, usage }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[job_app_filler] LLM fallback error', e)
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

/**
 * Try to answer `fieldPath` using the LLM. Returns at most one SavedAnswer.
 * Cached per field signature so repeat visits cost nothing.
 */
export async function llmFallbackMatch(
  fieldPath: FieldPath
): Promise<SavedAnswer[]> {
  if (!fieldPath?.fieldName) return []
  await loadCache()
  await aiSettingsStore.load()

  const settings = aiSettingsStore.get()
  if (!settings.enabled || !settings.apiKey) return []

  const key = cacheKey(fieldPath)
  if (key in cache) {
    const cached = cache[key]
    if (cached.answer === null || cached.answer === undefined) return []
    return [makeAnswer(fieldPath, cached.answer)]
  }

  if (
    !aiSettingsStore.canConsume(ESTIMATED_PROMPT_TOKENS + ESTIMATED_RESPONSE_TOKENS)
  ) {
    return []
  }

  // De-dupe concurrent requests for the same field.
  if (inFlight.has(key)) {
    const value = await inFlight.get(key)
    if (value === undefined || value === null) return []
    return [makeAnswer(fieldPath, value)]
  }

  const promise = (async () => {
    const prompt = buildPrompt(fieldPath)
    const result = await callOpenAI(prompt)
    if (!result) {
      cache[key] = { answer: null, ts: Date.now() }
      await persistCache()
      return null
    }
    await aiSettingsStore.recordUsage(result.usage.input + result.usage.output)
    const formatted = formatAnswerForFieldType(result.value, fieldPath.fieldType)
    cache[key] = { answer: formatted ?? null, ts: Date.now() }
    await persistCache()
    return formatted
  })()
  inFlight.set(key, promise)

  try {
    const value = await promise
    if (value === undefined || value === null) return []
    return [makeAnswer(fieldPath, value)]
  } finally {
    inFlight.delete(key)
  }
}

let pseudoIdCounter = -100_000
function makeAnswer(fp: FieldPath, value: any): SavedAnswer {
  return {
    id: pseudoIdCounter--,
    page: fp.page,
    section: fp.section || '',
    fieldType: fp.fieldType,
    fieldName: fp.fieldName,
    answer: value,
    matchType: 'llm',
  }
}

export async function clearLlmCache(): Promise<void> {
  cache = {}
  cacheLoaded = true
  await chrome.storage.local.remove(LLM_CACHE_KEY)
}
