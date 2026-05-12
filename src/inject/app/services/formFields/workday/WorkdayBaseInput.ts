import { createRoot } from 'react-dom/client'
import { getElement } from '@src/shared/utils/getElements'
import { BaseFormInput } from '../baseFormInput'
import { createShadowContainer } from '../../../utils/createShadowContainer'
import { App } from '../../../App'
import React from 'react'

export abstract class WorkdayBaseInput<
  AnswerType
> extends BaseFormInput<AnswerType> {

  attachReactApp(
    app: React.ReactNode,
    inputContainer: HTMLElement
  ) {
    const rootElement = document.createElement('div')
    rootElement.classList.add('jaf-widget')
    inputContainer.insertBefore(rootElement, inputContainer.lastChild)
    const { appMount, emotionCache } = createShadowContainer(rootElement)
    createRoot(appMount).render(
      <App backend={this} emotionCache={emotionCache} portalContainer={appMount} />
    )
  }


  get sectionLabelXpath(): string {
    const primaryXpath = [
      'ancestor::fieldset', // get the nearest ancestor fieldset element
      '/parent::div', // get parent div element of above fieldset element
      `[.//div[@job-app-filler='${this.uuid}']]`, // the above div/fieldset element must contain this forminput's main element.
      '[1]', // first (nearest) div/fieldset to match this criteria
      '//h4', // get the h4 child of the above div/fieldset. 
    ].join('')

    /**
     * different method found occasionally
     */
    const secondaryXpath = [ 
      'ancestor::div[@role="group"][1]', // nearest ancestor div roll group
      `[.//div[@job-app-filler='${this.uuid}']]`, // the above div/fieldset element must contain this forminput's main element.
      "[1]",
      "//h4[@id]" // h4 needs an id attribute because repeating sections will reference that id, but non-repeating sections with h4s won't.
    ].join("")

    return `(${primaryXpath} | ${secondaryXpath})`
  }

  get sectionLabelElement(): HTMLElement {
    return getElement(this.element, this.sectionLabelXpath)
  }
  
  public get section(): string {
    // must always return a string, even a blank one.
    return this.sectionLabelElement?.innerText || ''
  }
}
