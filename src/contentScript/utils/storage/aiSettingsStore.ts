/**
 * AI fallback settings.
 *
 * When neither the saved-answer store nor the profile rules can answer a
 * field, an LLM is asked. Settings (API key, model, daily token budget) are
 * stored locally — never leave the user's browser except for the actual
 * OpenAI API call.
 */

const AI_SETTINGS_KEY = 'aiSettings_v1'

declare const process: { env: { [key: string]: any } }

/** Build-time defaults injected by webpack DefinePlugin from config.py. */
const BUILD_DEFAULT_API_KEY: string = process.env.AI_DEFAULT_API_KEY || ''
const BUILD_DEFAULT_MODEL: string = process.env.AI_DEFAULT_MODEL || 'gpt-5.4-mini'
const BUILD_DEFAULT_BUDGET: number =
  Number(process.env.AI_DAILY_TOKEN_BUDGET) || 2_500_000
const BUILD_DEFAULT_ENABLED: boolean = process.env.AI_DEFAULT_ENABLED === true

export type AiSettings = {
  /** OpenAI API key (sk-...). Stored locally only. */
  apiKey: string
  /** Model name (default gpt-5.4-mini). */
  model: string
  /** Whether the AI fallback is active. */
  enabled: boolean
  /** Daily input+output token budget. Defaults to 2,500,000. */
  dailyTokenBudget: number
  /** Tokens consumed today (resets daily). */
  tokensUsedToday: number
  /** ISO date (YYYY-MM-DD) of the last counter reset. */
  lastResetDate: string
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  apiKey: BUILD_DEFAULT_API_KEY,
  model: BUILD_DEFAULT_MODEL,
  enabled: BUILD_DEFAULT_ENABLED,
  dailyTokenBudget: BUILD_DEFAULT_BUDGET,
  tokensUsedToday: 0,
  lastResetDate: '',
}

function todayString(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

class AiSettingsStore {
  private settings: AiSettings = DEFAULT_AI_SETTINGS
  private loaded = false

  async load(): Promise<void> {
    const result = await chrome.storage.local.get(AI_SETTINGS_KEY)
    const stored = (result[AI_SETTINGS_KEY] || {}) as Partial<AiSettings>
    // Build-time defaults always supply a fallback when a stored value is missing
    // or empty. The stored key wins when present (so the popup can override).
    this.settings = {
      ...DEFAULT_AI_SETTINGS,
      ...stored,
      apiKey: stored.apiKey || DEFAULT_AI_SETTINGS.apiKey,
      model: stored.model || DEFAULT_AI_SETTINGS.model,
      dailyTokenBudget:
        stored.dailyTokenBudget || DEFAULT_AI_SETTINGS.dailyTokenBudget,
      // `enabled` honors stored value if explicitly set, else build default.
      enabled:
        typeof stored.enabled === 'boolean'
          ? stored.enabled
          : DEFAULT_AI_SETTINGS.enabled,
    }
    // Reset daily counter if needed.
    const today = todayString()
    if (this.settings.lastResetDate !== today) {
      this.settings = {
        ...this.settings,
        tokensUsedToday: 0,
        lastResetDate: today,
      }
      await this.persist()
    }
    this.loaded = true
  }

  get(): AiSettings {
    return this.loaded ? this.settings : DEFAULT_AI_SETTINGS
  }

  async set(next: Partial<AiSettings>): Promise<AiSettings> {
    this.settings = { ...this.settings, ...next }
    await this.persist()
    return this.settings
  }

  /** Returns true if a call within the budget can proceed. */
  canConsume(estimatedTokens: number): boolean {
    if (!this.settings.enabled) return false
    if (!this.settings.apiKey) return false
    return (
      this.settings.tokensUsedToday + estimatedTokens <=
      this.settings.dailyTokenBudget
    )
  }

  async recordUsage(tokens: number): Promise<void> {
    const today = todayString()
    if (this.settings.lastResetDate !== today) {
      this.settings.tokensUsedToday = 0
      this.settings.lastResetDate = today
    }
    this.settings.tokensUsedToday += tokens
    await this.persist()
  }

  private async persist(): Promise<void> {
    await chrome.storage.local.set({ [AI_SETTINGS_KEY]: this.settings })
  }
}

export const aiSettingsStore = new AiSettingsStore()
