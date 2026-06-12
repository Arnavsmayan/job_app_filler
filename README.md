# Job App Filler

Chrome extension that autofills job application fields on Workday and Greenhouse sites.

## Setup

```bash
npm i
npm start
```

Load the `dist/` folder as an unpacked extension at `chrome://extensions/`.

## API key (required for AI fallback)

Open `config.py` and paste your OpenAI key into `OPENAI_API_KEY`. Then
`npm run build` and reload the extension. The key is read at build time and
baked into the bundle (it never leaves your machine except on actual
OpenAI API calls).

> ⚠️ **Do not commit your real key.** The committed `config.py` ships with
> an empty key by design. After you paste yours locally, run
> `git update-index --skip-worktree config.py` to keep the change out of
> diffs, or revert it before each commit.

## Updating

After pulling changes, rebuild and hit "Reload" on the extensions page.
Saved answers and your profile persist as long as you reload (not remove +
re-add) the extension from the same directory.

## Supported Sites

- Workday
- Greenhouse (boards.greenhouse.io, job-boards.greenhouse.io, boards.eu.greenhouse.io)

## Fill priority

For every field, the extension tries answers in this order:

1. **Saved answers** — anything you clicked Save on previously.
2. **Profile rules** — keyword-matched answers from the **Profile** tab.
3. **AI fallback** — `gpt-5.4-mini` via your OpenAI key (Profile is sent as
   context). Each field's answer is cached locally so repeat visits cost no
   tokens.

The AI never overrides a saved answer or a matching profile rule.

## Auto-advance

When `AUTO_ADVANCE = True` in `config.py` (default), after all required
fields on a Workday page are filled the extension auto-clicks
**Save and Continue / Next**, advances to the next page, and repeats until
it reaches a page with a **Submit** / **Submit Application** /
**Confirm** button — at which point it stops so you click the final
Submit yourself.

## Profile (Pre-defined Answers)

Click the extension icon and open the **Profile** tab to pre-define answers
for common questions (visa status, work authorization, sponsorship, EEO/EEOC
demographic questions, etc.). The profile is a JSON document with four parts:

- `fields` — quick-fill personal info (name, email, phone, address, etc.).
- `experience` — ordered list of work experience entries. Drives multi-position
  **Work Experience 1..N** sections in Workday. Most-recent first.
- `education` — ordered list of education entries. Drives multi-position
  **Education 1..N** sections in Workday.
- `rules` — list of `{ keywords, answer, fieldType? }` entries for general
  questions. Each rule's `keywords` are matched (case-insensitive substring)
  against the question label on the form. The first matching rule's `answer`
  is used.

When the page loads, any field whose label matches a profile rule is filled
in automatically — no need to click the Fill button. Multi-position sections
are auto-expanded (the extension clicks the "Add" button until the section
count matches the profile) and each entry is filled from the corresponding
array index. Saved answers (from manually filling a field once) always take
priority over profile rules.

### Experience entry shape

```json
{
  "jobTitle": "Software Engineer Intern",
  "company": "Acme Corp",
  "location": "New York, NY",
  "startMonth": "06",
  "startYear": "2024",
  "endMonth": "08",
  "endYear": "2024",
  "currentlyWorking": false,
  "description": "Built X, shipped Y."
}
```

### Education entry shape

```json
{
  "school": "State University",
  "degree": "Bachelor of Science",
  "fieldOfStudy": "Computer Science",
  "startMonth": "08",
  "startYear": "2021",
  "endMonth": "05",
  "endYear": "2025",
  "gpa": "3.8"
}
```

### Rule example

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

