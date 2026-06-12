import React, { FC, useState } from 'react'
import './popup.css'
import {
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Snackbar,
  SnackbarCloseReason,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'

import { ThemeProvider } from '@emotion/react'
import { theme } from '@src/shared/utils/react'
import { ContentCopyIcon, GitHubIcon, OpenInNewIcon } from '@src/shared/utils/icons'
import { LogoTitleBar } from '@src/shared/components/LogoTitleBar'
import { ProfileEditor } from './ProfileEditor'
import { AiSettingsEditor } from './AiSettingsEditor'

const EMAIL_ADDRESS = 'berellevy+chromeextensions@gmail.com'

export const App: FC<{}> = () => {
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false)
  const [snackbarMessage, setSnackbarMessage] = useState<string>('')
  const [tab, setTab] = useState<number>(0)
  const handleCloseSnackbar = (
    event: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason
  ) => {
    setSnackbarOpen(false)
  }

  return (
    <ThemeProvider theme={theme}>
      <Box pb={'1em'} sx={{ minWidth: 460 }}>
        <LogoTitleBar>Job App Filler</LogoTitleBar>
      </Box>
      <Box component={'main'}>
        <Container sx={{ my: 2 }}>
          <Tabs
            value={tab}
            onChange={(_e, v) => setTab(v)}
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Home" />
            <Tab label="Profile" />
            <Tab label="AI" />
          </Tabs>
          {tab === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                The Best Autofill Since Sliced Bread.
              </Typography>
              <Stack direction={'row'} spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    chrome.tabs.query(
                      { active: true, currentWindow: true },
                      (tabs) => {
                        chrome.tabs
                          .sendMessage(tabs[0].id, {
                            type: 'SHOW_WHATS_NEW',
                          })
                          .catch((err) => {
                            setSnackbarMessage('Only works on workday sites.')
                            setSnackbarOpen(true)
                          }),
                          () => {}
                      }
                    )
                  }}
                >
                  what's new?
                </Button>
                <Button
                  variant="outlined"
                  href="https://youtu.be/JYMATq9siIY"
                  target="_blank"
                  endIcon={<OpenInNewIcon />}
                >
                  Tutorial
                </Button>
              </Stack>
              <Divider sx={{ my: 2 }} />

              <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>
                Feaures
              </Typography>
              <Typography mb={1}>Works. Well.</Typography>
              <Typography mb={1}>Completely free, No login required.</Typography>
              <Typography mb={1}>
                Your data is stored locally, on your browser and isn't sent{' '}
                <em>anywhere</em>.
              </Typography>
              <Typography mb={1}>
                Pre-defined answers (visa, work auth, etc.) autofill on page
                load — see the <strong>Profile</strong> tab.
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box my={1}>
                <Button
                  target="_blank"
                  href="https://github.com/berellevy/job_app_filler"
                  startIcon={<GitHubIcon />}
                  variant="outlined"
                >
                  Contribute
                </Button>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Tooltip title={EMAIL_ADDRESS}>
                  <Button
                    href={'mailto:' + EMAIL_ADDRESS}
                    size="small"
                    variant="text"
                    target="_blank"
                  >
                    Contact
                  </Button>
                </Tooltip>
                <Tooltip title="Copy email address">
                  <IconButton
                    size={'small'}
                    onClick={() => {
                      navigator.clipboard.writeText(EMAIL_ADDRESS)
                      setSnackbarMessage('Copied.')
                      setSnackbarOpen(true)
                    }}
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}
          {tab === 1 && <ProfileEditor />}
          {tab === 2 && <AiSettingsEditor />}
        </Container>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={2000}
          onClose={handleCloseSnackbar}
          message={snackbarMessage}
        />
      </Box>
    </ThemeProvider>
  )
}