import React, { FC, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'

const AI_SETTINGS_KEY = 'aiSettings_v1'
const LLM_CACHE_KEY = 'llmCache_v1'

type AiSettings = {
  apiKey: string
  model: string
  enabled: boolean
  dailyTokenBudget: number
  tokensUsedToday: number
  lastResetDate: string
}

const DEFAULTS: AiSettings = {
  apiKey: '',
  model: 'gpt-5.4-mini',
  enabled: false,
  dailyTokenBudget: 2_500_000,
  tokensUsedToday: 0,
  lastResetDate: '',
}

type Status =
  | { kind: 'idle' }
  | { kind: 'saved' }
  | { kind: 'cleared' }
  | { kind: 'error'; message: string }

export const AiSettingsEditor: FC = () => {
  const [settings, setSettings] = useState<AiSettings>(DEFAULTS)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    chrome.storage.local.get(AI_SETTINGS_KEY, (result) => {
      const stored = result[AI_SETTINGS_KEY] as Partial<AiSettings> | undefined
      setSettings({ ...DEFAULTS, ...(stored || {}) })
    })
  }, [])

  const persist = (next: AiSettings) => {
    chrome.storage.local.set({ [AI_SETTINGS_KEY]: next }, () => {
      if (chrome.runtime.lastError) {
        setStatus({
          kind: 'error',
          message: chrome.runtime.lastError.message || 'Save failed',
        })
        return
      }
      setSettings(next)
      setStatus({ kind: 'saved' })
      setTimeout(() => setStatus({ kind: 'idle' }), 1500)
    })
  }

  const handleSave = () => persist(settings)

  const handleClearCache = () => {
    chrome.storage.local.remove(LLM_CACHE_KEY, () => {
      if (chrome.runtime.lastError) {
        setStatus({
          kind: 'error',
          message: chrome.runtime.lastError.message || 'Clear failed',
        })
        return
      }
      setStatus({ kind: 'cleared' })
      setTimeout(() => setStatus({ kind: 'idle' }), 1500)
    })
  }

  const handleResetUsage = () => {
    persist({ ...settings, tokensUsedToday: 0, lastResetDate: '' })
  }

  const usagePct =
    settings.dailyTokenBudget > 0
      ? Math.min(
          100,
          Math.round((settings.tokensUsedToday / settings.dailyTokenBudget) * 100)
        )
      : 0

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        AI fallback. When neither saved answers nor profile rules can fill a
        field, the extension asks an LLM (default: <code>gpt-5.4-mini</code>)
        for a value. Answers are <strong>cached locally per field</strong> so
        repeat visits cost no tokens.
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mb: 2 }}>
        Your API key is stored locally in browser storage and is sent only to
        the model provider's API on each LLM call. Reload the job page after
        saving for changes to take effect.
      </Typography>

      <Stack spacing={2}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.enabled}
              onChange={(e) =>
                setSettings({ ...settings, enabled: e.target.checked })
              }
            />
          }
          label="Enable AI fallback"
        />

        <TextField
          label="OpenAI API key"
          type="password"
          fullWidth
          size="small"
          value={settings.apiKey}
          onChange={(e) =>
            setSettings({ ...settings, apiKey: e.target.value.trim() })
          }
          placeholder="sk-..."
          autoComplete="off"
        />

        <TextField
          label="Model"
          fullWidth
          size="small"
          value={settings.model}
          onChange={(e) => setSettings({ ...settings, model: e.target.value })}
          helperText="Default: gpt-5.4-mini"
        />

        <TextField
          label="Daily token budget (input + output)"
          type="number"
          fullWidth
          size="small"
          value={settings.dailyTokenBudget}
          onChange={(e) =>
            setSettings({
              ...settings,
              dailyTokenBudget: Number(e.target.value) || 0,
            })
          }
        />

        <Box>
          <Typography variant="caption" sx={{ display: 'block' }}>
            Used today: {settings.tokensUsedToday.toLocaleString()} /{' '}
            {settings.dailyTokenBudget.toLocaleString()} ({usagePct}%)
            {settings.lastResetDate && (
              <> — last reset {settings.lastResetDate}</>
            )}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button variant="contained" size="small" onClick={handleSave}>
            Save
          </Button>
          <Button variant="outlined" size="small" onClick={handleClearCache}>
            Clear answer cache
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="warning"
            onClick={handleResetUsage}
          >
            Reset usage
          </Button>
        </Stack>

        {status.kind === 'saved' && <Alert severity="success">Saved.</Alert>}
        {status.kind === 'cleared' && (
          <Alert severity="success">Cache cleared.</Alert>
        )}
        {status.kind === 'error' && (
          <Alert severity="error">{status.message}</Alert>
        )}
      </Stack>
    </Box>
  )
}
