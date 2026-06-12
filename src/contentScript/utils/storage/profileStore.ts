/**
 * Profile-based pre-defined answers.
 *
 * Lets the user pre-define answers for common questions (visa eligibility,
 * work authorization, etc.) using keyword rules. When a job application form
 * field is encountered for which no saved answer exists, the field name is
 * matched against the keywords in each rule. Matching rules contribute
 * fallback answers that the autofill flow uses.
 *
 * Also supports multi-position repeating sections (Work Experience 1..N,
 * Education 1..N) so the extension can fill out experience/education
 * sections automatically — like Simplify, but driven by the local profile
 * and the existing field backends (so it's fast).
 */

import { FieldPath } from '@src/shared/utils/types'
import { SavedAnswer } from './DataStoreTypes'
import { sectionBaseName, sectionNumber } from './DataStore'

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

export type ExperienceEntry = {
  jobTitle?: string
  company?: string
  location?: string
  startMonth?: string // "01".."12" or "1".."12"
  startYear?: string // "2024"
  endMonth?: string
  endYear?: string
  currentlyWorking?: boolean
  description?: string
}

export type EducationEntry = {
  school?: string
  degree?: string
  fieldOfStudy?: string
  startMonth?: string
  startYear?: string
  endMonth?: string
  endYear?: string
  gpa?: string
}

export type Profile = {
  rules: ProfileRule[]
  /** quick-fill personal info commonly requested across forms */
  fields?: { [key: string]: any }
  /** ordered list of work experience entries (most recent first) */
  experience?: ExperienceEntry[]
  /** ordered list of education entries (most recent first) */
  education?: EducationEntry[]
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
    country: 'India',
    linkedin: '',
    website: '',
    github: '',
  },
  experience: [
    {
      jobTitle: '',
      company: '',
      location: '',
      startMonth: '',
      startYear: '',
      endMonth: '',
      endYear: '',
      currentlyWorking: false,
      description: '',
    },
  ],
  education: [
    {
      school: '',
      degree: '',
      fieldOfStudy: '',
      startMonth: '',
      startYear: '',
      endMonth: '',
      endYear: '',
      gpa: '',
    },
  ],
  rules: [
    {
      label: 'Authorized to work WITHOUT sponsorship (F1 holder => No)',
      keywords: [
        'without sponsorship',
        'without requiring sponsorship',
        'without need for sponsorship',
        'without the need for sponsorship',
        'authorized to work in the united states without',
        'authorized to work without',
      ],
      answer: 'No',
    },
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
      label: 'Current visa / immigration status',
      keywords: [
        'visa status',
        'current visa',
        'immigration status',
        'current immigration',
        'work visa',
        'visa type',
      ],
      answer: 'F-1 Student Visa (OPT/CPT eligible)',
    },
    {
      label: 'Citizenship / nationality',
      keywords: [
        'citizenship',
        'country of citizenship',
        'nationality',
        'are you a citizen',
        'citizen of which country',
      ],
      answer: 'India',
    },
    {
      label: 'Are you a US citizen?',
      keywords: ['us citizen', 'u.s. citizen', 'united states citizen', 'american citizen'],
      answer: 'No',
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
      label: 'Connections / known employees at company',
      keywords: [
        'know anyone',
        'know any current',
        'know any employee',
        'connections at',
        'do you have any connections',
        'referred by',
        'referred you',
        'employee referral',
      ],
      answer: 'No',
    },
    {
      label: 'Notice period / availability to start',
      keywords: [
        'notice period',
        'how soon can you start',
        'available to start',
        'earliest start date',
        'when can you start',
        'availability to start',
      ],
      answer: 'Immediate',
    },
    {
      label: 'Willing to relocate?',
      keywords: ['willing to relocate', 'open to relocating', 'open to relocation', 'relocate'],
      answer: 'Yes',
    },
    {
      label: 'Willing to travel?',
      keywords: ['willing to travel', 'open to travel', 'travel for work', 'comfortable with travel'],
      answer: 'Yes',
    },
    {
      label: 'Preferred pronouns',
      keywords: ['pronouns', 'preferred pronouns', 'what are your pronouns'],
      answer: 'He/Him',
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

/** field-name keywords -> entry property name (experience) */
const EXPERIENCE_FIELD_MAP: { [prop: string]: string[] } = {
  jobTitle: ['job title', 'title', 'position', 'role title'],
  company: ['company', 'employer', 'organization', 'organisation'],
  location: ['location', 'work location', 'city'],
  startDate: ['from'],
  endDate: ['to'],
  currentlyWorking: ['currently work', 'current job', 'i currently', 'present role'],
  description: ['description', 'responsibilities', 'role description', 'summary', 'duties'],
}

/** field-name keywords -> entry property name (education) */
const EDUCATION_FIELD_MAP: { [prop: string]: string[] } = {
  school: ['school', 'university', 'institution', 'college'],
  degree: ['degree'],
  fieldOfStudy: ['field of study', 'major', 'area of study', 'concentration'],
  startDate: ['from'],
  endDate: ['to'],
  gpa: ['gpa', 'overall result', 'grade point'],
}

const SECTION_BASE_EXPERIENCE = ['work experience', 'experience', 'employment', 'work history']
const SECTION_BASE_EDUCATION = ['education', 'academic']

function matchesSectionBase(sectionBase: string, candidates: string[]): boolean {
  const lower = sectionBase.toLowerCase()
  return candidates.some((c) => lower === c || lower.includes(c))
}

function findEntryFieldKey(
  fieldName: string,
  map: { [key: string]: string[] }
): string | null {
  const lower = (fieldName || '').toLowerCase()
  for (const [key, keywords] of Object.entries(map)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return key
    }
  }
  return null
}

/**
 * Format a value into the shape the field-type's fill code expects.
 * - MonthYear  -> [month, year]
 * - SingleCheckbox / BooleanCheckbox -> boolean
 * - Dropdown / DropdownSearchable / SimpleDropdown -> [value] (string in array)
 * - everything else (TextInput, TextArea, etc.) -> raw value
 */
function formatAnswer(value: any, fieldType: string): any {
  if (value === undefined || value === null || value === '') return undefined
  if (fieldType === 'MonthYear') {
    if (Array.isArray(value)) return value
    return undefined
  }
  if (fieldType === 'Year') {
    if (Array.isArray(value)) return value[1] ?? value[0]
    return value
  }
  if (fieldType === 'SingleCheckbox') {
    return Boolean(value)
  }
  if (fieldType === 'SimpleDropdown' || fieldType === 'Dropdown') {
    return Array.isArray(value) ? value : [String(value)]
  }
  return value
}

function getDateTuple(
  entry: any,
  which: 'start' | 'end'
): [string, string] | undefined {
  const month = entry[which + 'Month']
  const year = entry[which + 'Year']
  if (!month && !year) return undefined
  return [String(month || ''), String(year || '')]
}

class ProfileStore {
  private profile: Profile = DEFAULT_PROFILE
  private loaded = false

  async load(): Promise<void> {
    const result = await chrome.storage.local.get(PROFILE_STORAGE_KEY)
    if (result[PROFILE_STORAGE_KEY]) {
      this.profile = result[PROFILE_STORAGE_KEY] as Profile
    } else {
      this.profile = DEFAULT_PROFILE
      await chrome.storage.local.set({ [PROFILE_STORAGE_KEY]: this.profile })
    }
    this.loaded = true
  }

  get(): Profile {
    if (!this.loaded) {
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

  /** counts of profile-defined repeating-section base names */
  sectionCounts(): { [baseName: string]: number } {
    const profile = this.get()
    const counts: { [baseName: string]: number } = {}
    if (profile.experience && profile.experience.length > 0) {
      const validCount = profile.experience.filter((e) => isExperienceFilled(e)).length
      if (validCount > 0) {
        counts['Work Experience'] = validCount
      }
    }
    if (profile.education && profile.education.length > 0) {
      const validCount = profile.education.filter((e) => isEducationFilled(e)).length
      if (validCount > 0) {
        counts['Education'] = validCount
      }
    }
    return counts
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

    // 1) section-aware experience / education matches first (most specific).
    if (fieldPath.section) {
      const base = sectionBaseName(fieldPath.section)
      const num = sectionNumber(fieldPath.section)

      if (matchesSectionBase(base, SECTION_BASE_EXPERIENCE)) {
        const entry = profile.experience?.[num - 1]
        if (entry) {
          const key = findEntryFieldKey(fieldPath.fieldName, EXPERIENCE_FIELD_MAP)
          if (key) {
            let value: any
            if (key === 'startDate') value = getDateTuple(entry, 'start')
            else if (key === 'endDate') value = getDateTuple(entry, 'end')
            else value = (entry as any)[key]
            const formatted = formatAnswer(value, fieldPath.fieldType)
            if (formatted !== undefined) {
              matches.push({
                id: pseudoId--,
                page: fieldPath.page,
                section: fieldPath.section,
                fieldType: fieldPath.fieldType,
                fieldName: fieldPath.fieldName,
                answer: formatted,
                matchType: 'profile-experience',
              })
            }
          }
        }
      } else if (matchesSectionBase(base, SECTION_BASE_EDUCATION)) {
        const entry = profile.education?.[num - 1]
        if (entry) {
          const key = findEntryFieldKey(fieldPath.fieldName, EDUCATION_FIELD_MAP)
          if (key) {
            let value: any
            if (key === 'startDate') value = getDateTuple(entry, 'start')
            else if (key === 'endDate') value = getDateTuple(entry, 'end')
            else value = (entry as any)[key]
            const formatted = formatAnswer(value, fieldPath.fieldType)
            if (formatted !== undefined) {
              matches.push({
                id: pseudoId--,
                page: fieldPath.page,
                section: fieldPath.section,
                fieldType: fieldPath.fieldType,
                fieldName: fieldPath.fieldName,
                answer: formatted,
                matchType: 'profile-education',
              })
            }
          }
        }
      }
    }

    // 2) keyword rules (general-purpose).
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

function isExperienceFilled(e: ExperienceEntry): boolean {
  return Boolean(e && (e.jobTitle || e.company))
}

function isEducationFilled(e: EducationEntry): boolean {
  return Boolean(e && (e.school || e.degree || e.fieldOfStudy))
}

export const profileStore = new ProfileStore()
