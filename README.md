# Job App Filler

Chrome extension that autofills job application fields on Workday and Greenhouse sites.

## Setup

```bash
npm i
npm start
```

Load the `dist/` folder as an unpacked extension at `chrome://extensions/`.

## Updating

After pulling changes, rebuild and hit "Reload" on the extensions page. Saved answers persist as long as you reload (not remove + re-add) the extension from the same directory.

## Supported Sites

- Workday
- Greenhouse (boards.greenhouse.io, job-boards.greenhouse.io, boards.eu.greenhouse.io)

## Profile (Pre-defined Answers)

Click the extension icon and open the **Profile** tab to pre-define answers
for common questions (visa status, work authorization, sponsorship, EEO/EEOC
demographic questions, etc.). The profile is a JSON document with two parts:

- `fields` — quick-fill personal info (name, email, phone, address, etc.).
- `rules` — a list of `{ keywords, answer, fieldType? }` entries. Each rule's
  `keywords` are matched (case-insensitive substring) against the question
  label on the form. The first matching rule's `answer` is used.

When the page loads, any field whose label matches a profile rule is filled
in automatically — no need to click the Fill button. Saved answers (from
manually filling a field once) always take priority over profile rules.

Example rule:

```json
{
  "label": "Do you require visa sponsorship?",
  "keywords": ["require sponsorship", "visa sponsorship", "need sponsorship"],
  "answer": "No"
}
```

For Yes/No radio buttons (Workday `BooleanRadio`) the answer must match the
button label exactly (e.g. `"Yes"` or `"No"`). For dropdowns, use the option
text. The profile is stored locally in your browser and never leaves your
machine.

