'use client';
import * as React from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { useServerInsertedHTML } from 'next/navigation';

export function AppMuiProvider({ children }: { children: React.ReactNode }) {
  const [cache] = React.useState(() => {
    let insertionPoint: HTMLElement | undefined = undefined;
    if (typeof document !== 'undefined') {
      insertionPoint = document.querySelector('meta[name="emotion-insertion-point"]') as HTMLElement | null || undefined;
    }
    const c = createCache({ key: 'mui', insertionPoint, prepend: true });
    c.compat = true;
    return c;
  });
  useServerInsertedHTML(() => {
    const names = Object.keys(cache.inserted);
    if (names.length === 0) return null;
    return (
      <style
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{
          __html: names.map((n) => cache.inserted[n]).join(' '),
        }}
      />
    );
  });
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
    <CacheProvider value={cache}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </CacheProvider>
  );
}

export default AppMuiProvider;
