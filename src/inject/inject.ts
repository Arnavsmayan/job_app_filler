import { RegisterInputs as workday } from './app/services/formFields/workday'
import { RegisterInputs as greenhouse } from './app/services/formFields/greenhouse'
import { RegisterInputs as greenhouseReact } from './app/services/formFields/greenhouseReact'
import { expandRepeatingSections } from './app/services/formFields/workday/RepeatingSections'
import { tryAutoAdvance } from './app/services/formFields/workday/AutoAdvance'

declare const process: { env: { [key: string]: any } }
const AUTO_ADVANCE_ENABLED: boolean = process.env.AUTO_ADVANCE === true

type InputSetup = (node: Node) => Promise<void>
const inputRegistrars: [string, InputSetup][] = [
  ['myworkdayjobs.com', workday],
  ['myworkdaysite.com', workday],
  ['job-boards.greenhouse.io', greenhouseReact],
  ['boards.greenhouse.io', greenhouse],
  ['boards.eu.greenhouse.io', greenhouse],
]
const getRegisterInput = (domain: string): InputSetup => {
  return inputRegistrars.find((site) => {
    return domain.endsWith(site[0])
  })[1]
}

const isWorkday = (domain: string): boolean => {
  return domain.includes('myworkdayjobs.com') || domain.includes('myworkdaysite.com')
}

const run = async () => {
  const domain = window.location.host
  const RegisterInputs = getRegisterInput(domain)
  let lastPage = ''
  let advanceTimer: ReturnType<typeof setTimeout> | null = null

  const scheduleAutoAdvance = () => {
    if (!AUTO_ADVANCE_ENABLED) return
    if (advanceTimer) clearTimeout(advanceTimer)
    // Debounced: only fires after the DOM has been quiet for 3s,
    // giving async LLM fallbacks time to land.
    advanceTimer = setTimeout(() => {
      advanceTimer = null
      tryAutoAdvance()
    }, 3000)
  }

  const observer = new MutationObserver(async (_) => {
    RegisterInputs(document)

    if (isWorkday(domain)) {
      const currentPage = document.querySelector('h2')?.innerText || ''
      if (currentPage && currentPage !== lastPage) {
        lastPage = currentPage
        setTimeout(() => expandRepeatingSections(), 500)
      }
      scheduleAutoAdvance()
    }
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  RegisterInputs(document)

  if (isWorkday(domain)) {
    lastPage = document.querySelector('h2')?.innerText || ''
    await expandRepeatingSections()
    scheduleAutoAdvance()
  }
}

/**
 * Prevent the injected script from running until the tab is revealed.
 * For example, when you open multiple tabs at once.
 */
if (!document.hidden) {
  run()
} else {
  const f = () => {
    run()
    document.removeEventListener('visibilitychange', f)
  }
  document.addEventListener('visibilitychange', f)
}
