/**
 * Profile-based pre-defined answers.
 *
 * Lets the user pre-define answers for common questions (visa eligibility,
 * work authorization, etc.) using keyword rules. When a job application form
 * field is encountered for which no saved answer exists, the field name is
 * matched against the keywords in each rule. Matching rules contribute
 * fallback answers that the autofill flow uses.
 */

import { FieldPath } from '@src/shared/utils/types'
import { SavedAnswer } from './DataStoreTypes'

const PROFILE_STORAGE_KEY = 'profileAnswers_v1'

export type ProfileRule = {
  /** any-of keyword match against the form field's label/name */
  keywords: string[]
  /** the value to fill into the field */
  answer: any
  /**
   * optional: restrict this rule to a specific fieldType (e.g.
   * 'BooleanRadio', 'TextInput', 'Dropdown'). If omitted the rule
   * applies to any field type.
   */
  fieldType?: string
  /**
   * optional human-readable label, shown in the editor only.
   */
  label?: string
}

export type Profile = {
  rules: ProfileRule[]
  /** quick-fill personal info commonly requested across forms */
  fields?: { [key: string]: any }
}

/**
 * Default profile. Empty values so the user knows what to fill in.
 * Rules cover the common visa/work-authorization questions.
 */
export const DEFAULT_PROFILE: Profile = {
  fields: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    linkedin: '',
    website: '',
    github: '',
  },
  rules: [
    {
      label: 'Are you legally authorized to work?',
      keywords: [
        'authorized to work',
        'legally authorized',
        'eligible to work',
        'legally eligible',
        'right to work',
        'work authorization',
        'legally able to work',
      ],
      answer: 'Yes',
    },
    {
      label: 'Do you require visa sponsorship?',
      keywords: [
        'require sponsorship',
        'need sponsorship',
        'require visa sponsorship',
        'need visa sponsorship',
        'visa sponsorship',
        'require employer sponsorship',
        'sponsorship for employment visa',
      ],
      answer: 'Yes',
    },
    {
      label: 'Will you now or in the future require sponsorship?',
      keywords: [
        'now or in the future',
        'in the future require sponsorship',
        'future require sponsorship',
      ],
      answer: 'Yes',
    },
    {
      label: 'Are you 18 or older?',
      keywords: ['18 years', '18 or older', 'at least 18'],
      answer: 'Yes',
    },
    {
      label: 'Have you been convicted of a felony?',
      keywords: ['convicted of a felony', 'criminal conviction', 'convicted of a crime'],
      answer: 'No',
    },
    {
      label: 'Previously worked here / current employee',
      keywords: [
        'previously worked',
        'previous employee',
        'former employee',
        'current employee',
        'currently employed by',
        'previously employed by',
      ],
      answer: 'No',
    },
    {
      label: 'How did you hear about us?',
      keywords: ['how did you hear', 'how did you find', 'referral source', 'where did you hear'],
      answer: 'Other',
    },
    {
      label: 'Gender',
      keywords: ['gender', 'what is your gender'],
      answer: 'Male',
    },
    {
      label: 'Race / Ethnicity',
      keywords: ['race', 'ethnicity', 'ethnic background'],
      answer: 'Decline to self-identify',
    },
    {
      label: 'Veteran status',
      keywords: ['veteran status', 'protected veteran', 'military veteran'],
      answer: 'I am not a protected veteran',
    },
    {
      label: 'Disability status',
      keywords: ['disability status', 'have a disability', 'disabled'],
      answer: 'No, I do not have a disability',
    },
  ],
}

class ProfileStore {
  private profile: Profile = DEFAULT_PROFILE
  private loaded = false

  async load(): Promise<void> {
    const result = await chrome.storage.local.get(PROFILE_STORAGE_KEY)
    if (result[PROFILE_STORAGE_KEY]) {
      // merge with default so new default rules added in updates are picked up
      // unless the user has explicitly customized the profile.
      this.profile = result[PROFILE_STORAGE_KEY] as Profile
    } else {
      this.profile = DEFAULT_PROFILE
      // persist default so the user has something to edit on first run
      await chrome.storage.local.set({ [PROFILE_STORAGE_KEY]: this.profile })
    }
    this.loaded = true
  }

  get(): Profile {
    if (!this.loaded) {
      // Synchronous getters are needed in places where load() has been
      // awaited at startup. Returning DEFAULT_PROFILE is a safe fallback.
      return DEFAULT_PROFILE
    }
    return this.profile
  }

  async set(profile: Profile): Promise<void> {
    this.profile = profile
    await chrome.storage.local.set({ [PROFILE_STORAGE_KEY]: profile })
  }

  async reset(): Promise<Profile> {
    await this.set(DEFAULT_PROFILE)
    return DEFAULT_PROFILE
  }

  /**
   * Look up profile-based fallback answers for a field.
   *
   * Returns matching rules formatted as SavedAnswer-shaped objects so they
   * can be merged with the regular saved-answer results downstream.
   */
  match(fieldPath: FieldPath): SavedAnswer[] {
    const profile = this.get()
    if (!fieldPath?.fieldName) return []
    const fieldNameLower = fieldPath.fieldName.toLowerCase()
    const matches: SavedAnswer[] = []
    let pseudoId = -1000 // negative ids so they cannot collide with saved answers
    for (const rule of profile.rules || []) {
      if (!rule || rule.answer === undefined || rule.answer === null || rule.answer === '') {
        continue
      }
      if (rule.fieldType && rule.fieldType !== fieldPath.fieldType) {
        continue
      }
      const hit = (rule.keywords || []).some((kw) =>
        fieldNameLower.includes(kw.toLowerCase())
      )
      if (hit) {
        matches.push({
          id: pseudoId--,
          page: fieldPath.page,
          section: fieldPath.section || '',
          fieldType: fieldPath.fieldType,
          fieldName: fieldPath.fieldName,
          answer: rule.answer,
          matchType: 'profile',
        })
      }
    }
    return matches
  }
}

export const profileStore = new ProfileStore()
