import { createRoot } from 'react-dom/client'
import { BaseFormInput } from '../baseFormInput'
import { getElement } from '@src/shared/utils/getElements'
import { createShadowContainer } from '../../../utils/createShadowContainer'
import { App } from '../../../App'
import React from 'react'

export abstract class GreenhouseReactBaseInput<
  AnswerType
> extends BaseFormInput<AnswerType> {
  get labelDisplayElement(): HTMLElement {
    return this.labelElement
  }
  abstract get labelElement(): HTMLElement

  sectionElement(): HTMLElement {
    return getElement(
      this.element,
      `ancestor::div[@jaf-section][1]`
    )
  }

  get section(): string {
    return this.sectionElement()?.getAttribute("jaf-section") || ""
  }
  attachReactApp(app: React.ReactNode, inputContainer: HTMLElement): void {
    const rootElement = document.createElement('div')
    rootElement.classList.add('jaf-widget')
    this.labelDisplayElement.insertAdjacentElement('afterend', rootElement)
    const { appMount, emotionCache } = createShadowContainer(rootElement)
    createRoot(appMount).render(
      <App backend={this} emotionCache={emotionCache} portalContainer={appMount} />
    )
  }
}
