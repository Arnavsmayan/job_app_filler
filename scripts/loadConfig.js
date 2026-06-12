/**
 * Parse the user's local config.py into a plain JS object.
 *
 * config.py uses simple `KEY = value` assignments — only literal types
 * (strings, ints, floats, booleans, underscored ints). We don't run Python;
 * we read the file as text and pull out the values we care about.
 */

const fs = require('fs')
const path = require('path')

const CONFIG_PATH = path.resolve(__dirname, '..', 'config.py')

const DEFAULTS = {
  OPENAI_API_KEY: '',
  OPENAI_MODEL: 'gpt-5.4-mini',
  DAILY_TOKEN_BUDGET: 2_500_000,
  AUTO_ADVANCE: true,
  AI_ENABLED: true,
}

function parseValue(raw) {
  const v = raw.trim()
  if (v === 'True') return true
  if (v === 'False') return false
  if (v === 'None') return null
  // Quoted string
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1)
  }
  // Number with optional underscores (e.g. 2_500_000)
  const numMatch = v.replace(/_/g, '').match(/^-?\d+(\.\d+)?$/)
  if (numMatch) {
    return Number(v.replace(/_/g, ''))
  }
  return v
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { ...DEFAULTS }
  }
  const text = fs.readFileSync(CONFIG_PATH, 'utf8')
  const out = { ...DEFAULTS }
  for (const line of text.split(/\r?\n/)) {
    const stripped = line.trim()
    if (!stripped || stripped.startsWith('#')) continue
    const m = stripped.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*(#.*)?$/)
    if (!m) continue
    const [, key, raw] = m
    if (!(key in DEFAULTS)) continue
    out[key] = parseValue(raw)
  }
  return out
}

module.exports = { loadConfig }
