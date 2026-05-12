import React, { FC } from 'react'
import { EmotionCache } from '@emotion/cache'
import { CacheProvider } from '@emotion/react'

import { Box, Grid, ThemeProvider } from '@mui/material'
import { theme } from '@src/shared/utils/react'
import { ContextProvider } from './AppContext'

import { BaseFormInput } from './services/formFields/baseFormInput'
import { FieldWidgetButtons } from './FieldWidget/FieldWidgetButtons'
import Logo from '@src/shared/components/Logo'

const Main: FC = () => {
  return (
    <Box my={'4px'}>
      <Grid container spacing={1} alignItems="center">
        <Grid item>
          <Logo />
        </Grid>
        <Grid item>
          <FieldWidgetButtons />
        </Grid>
      </Grid>
    </Box>
  )
}

export const App: React.FC<{
  backend: BaseFormInput<any>
  emotionCache?: EmotionCache
  portalContainer?: HTMLElement
}> = ({ backend, emotionCache, portalContainer }) => {
  const content = (
    <ThemeProvider theme={theme}>
      <ContextProvider backend={backend} portalContainer={portalContainer}>
        <Main />
      </ContextProvider>
    </ThemeProvider>
  )

  if (emotionCache) {
    return <CacheProvider value={emotionCache}>{content}</CacheProvider>
  }

  return content
}
