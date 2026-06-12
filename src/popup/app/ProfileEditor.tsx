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
      answer: 'No',
    },
    {
      label: 'Will you now or in the future require sponsorship?',
      keywords: ['now or in the future', 'in the future require sponsorship'],
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
      label: 'How did you hear about us?',
      keywords: ['how did you hear', 'how did you find', 'referral source'],
      answer: 'LinkedIn',
    },
    {
      label: 'Gender',
      keywords: ['gender'],
      answer: 'Decline to self-identify',
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
      answer: 'I do not want to answer',
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
        Each rule's <code>keywords</code> are matched (case-insensitive,
        substring) against the question label. The first matching rule's{' '}
        <code>answer</code> is used.
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
