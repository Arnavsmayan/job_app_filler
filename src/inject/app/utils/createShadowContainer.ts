import createCache, { EmotionCache } from '@emotion/cache'

export interface ShadowContainer {
  shadowRoot: ShadowRoot
  appMount: HTMLDivElement
  emotionCache: EmotionCache
}

export function createShadowContainer(hostElement: HTMLDivElement): ShadowContainer {
  const shadowRoot = hostElement.attachShadow({ mode: 'open' })

  const styleContainer = document.createElement('style')
  shadowRoot.appendChild(styleContainer)

  const appMount = document.createElement('div')
  shadowRoot.appendChild(appMount)

  const emotionCache = createCache({
    key: 'jaf',
    container: styleContainer,
    prepend: true,
  })

  return { shadowRoot, appMount, emotionCache }
}
