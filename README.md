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

