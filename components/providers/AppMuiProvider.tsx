'use client';
import * as React from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export function AppMuiProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useMemo(
    () =>
      createTheme({
        typography: {
          fontFamily:
            '"IBM Plex Sans Arabic","IBM Plex Sans","Segoe UI",Tahoma,Arial,"Noto Sans Arabic","Noto Sans",sans-serif',
        },
      }),
    [],
  );
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

export default AppMuiProvider;

