# -----------------------------------------------------------------------------
# job_app_filler — local config.
#
# Webpack reads this at build time and bakes the values into the extension
# bundle. After editing: run `npm run build` and reload the extension at
# chrome://extensions/.
#
# !!! DO NOT COMMIT YOUR ACTUAL OPENAI_API_KEY !!!
# Paste your key into OPENAI_API_KEY locally; revert it before `git commit`.
# Or use `git update-index --skip-worktree config.py` after editing locally.
# -----------------------------------------------------------------------------

# OpenAI API key used for the AI fallback. Sent only to https://api.openai.com.
OPENAI_API_KEY = ""

# Model to use for the AI fallback.
OPENAI_MODEL = "gpt-5.4-mini"

# Daily input+output token budget. AI fallback stops calling once this is hit.
DAILY_TOKEN_BUDGET = 2_500_000

# Auto-advance through "Save and Continue" / "Next" buttons until the
# review/submit screen, leaving you to click the final Submit yourself.
AUTO_ADVANCE = True

# AI fallback enabled by default.
AI_ENABLED = True
