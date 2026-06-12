import React, { FC, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

const PROFILE_STORAGE_KEY = 'profileAnswers_v1'

const DEFAULT_PROFILE_TEMPLATE = {
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
        'right to work',
        'work authorization',
      ],
      answer: 'Yes',
    },
    {
      label: 'Do you require visa sponsorship?',
      keywords: [
        'require sponsorship',
        'need sponsorship',
        'visa sponsorship',
        'sponsorship for employment visa',
      ],
      answer: 'Yes',
    },
    {
      label: 'Will you now or in the future require sponsorship?',
      keywords: ['now or in the future', 'in the future require sponsorship'],
      answer: 'Yes',
    },
    {
      label: 'Current visa / immigration status',
      keywords: ['visa status', 'current visa', 'immigration status', 'visa type'],
      answer: 'F-1 Student Visa (OPT/CPT eligible)',
    },
    {
      label: 'Citizenship / nationality',
      keywords: ['citizenship', 'country of citizenship', 'nationality'],
      answer: 'India',
    },
    {
      label: 'Are you a US citizen?',
      keywords: ['us citizen', 'u.s. citizen', 'united states citizen'],
      answer: 'No',
    },
    {
      label: 'Are you 18 or older?',
      keywords: ['18 years', '18 or older', 'at least 18'],
      answer: 'Yes',
    },
    {
      label: 'Have you been convicted of a felony?',
      keywords: ['convicted of a felony', 'criminal conviction'],
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
        'referred by',
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
      ],
      answer: 'Immediate',
    },
    {
      label: 'Willing to relocate?',
      keywords: ['willing to relocate', 'open to relocating', 'relocate'],
      answer: 'Yes',
    },
    {
      label: 'Willing to travel?',
      keywords: ['willing to travel', 'open to travel', 'travel for work'],
      answer: 'Yes',
    },
    {
      label: 'Preferred pronouns',
      keywords: ['pronouns', 'preferred pronouns'],
      answer: 'He/Him',
    },
    {
      label: 'How did you hear about us?',
      keywords: ['how did you hear', 'how did you find', 'referral source'],
      answer: 'Other',
    },
    {
      label: 'Gender',
      keywords: ['gender'],
      answer: 'Male',
    },
    {
      label: 'Race / Ethnicity',
      keywords: ['race', 'ethnicity'],
      answer: 'Decline to self-identify',
    },
    {
      label: 'Veteran status',
      keywords: ['veteran status', 'protected veteran'],
      answer: 'I am not a protected veteran',
    },
    {
      label: 'Disability status',
      keywords: ['disability status', 'have a disability'],
      answer: 'No, I do not have a disability',
    },
  ],
}

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string }

export const ProfileEditor: FC = () => {
  const [text, setText] = useState<string>('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    chrome.storage.local.get(PROFILE_STORAGE_KEY, (result) => {
      const profile = result[PROFILE_STORAGE_KEY] || DEFAULT_PROFILE_TEMPLATE
      setText(JSON.stringify(profile, null, 2))
    })
  }, [])

  const handleSave = () => {
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      setStatus({ kind: 'error', message: 'Invalid JSON: ' + (e as Error).message })
      return
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.rules)) {
      setStatus({
        kind: 'error',
        message: 'Profile must be an object with a "rules" array.',
      })
      return
    }
    setStatus({ kind: 'saving' })
    chrome.storage.local.set({ [PROFILE_STORAGE_KEY]: parsed }, () => {
      if (chrome.runtime.lastError) {
        setStatus({
          kind: 'error',
          message: chrome.runtime.lastError.message || 'Save failed',
        })
        return
      }
      setStatus({ kind: 'saved' })
      setTimeout(() => setStatus({ kind: 'idle' }), 1500)
    })
  }

  const handleReset = () => {
    setText(JSON.stringify(DEFAULT_PROFILE_TEMPLATE, null, 2))
    setStatus({ kind: 'idle' })
  }

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Pre-defined answers for common questions (visa, work auth, etc.) are
        used to autofill fields automatically when no saved answer exists.
        Reload the job page after saving for changes to take effect.
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
        <strong>experience</strong> / <strong>education</strong> arrays drive
        multi-position Work Experience / Education sections (Workday). Add as
        many entries as you need — the extension will auto-add and fill those
        sections on page load. <strong>rules</strong> are matched
        (case-insensitive substring) against the question label; the first
        matching rule's <code>answer</code> is used.
      </Typography>
      <TextField
        multiline
        minRows={14}
        maxRows={20}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        InputProps={{
          sx: {
            fontFamily: 'monospace',
            fontSize: '0.75rem',
          },
        }}
      />
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button variant="contained" size="small" onClick={handleSave}>
          Save
        </Button>
        <Button variant="outlined" size="small" onClick={handleReset}>
          Reset to defaults
        </Button>
      </Stack>
      {status.kind === 'saved' && (
        <Alert severity="success" sx={{ mt: 1 }}>
          Saved.
        </Alert>
      )}
      {status.kind === 'error' && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {status.message}
        </Alert>
      )}
    </Box>
  )
}
