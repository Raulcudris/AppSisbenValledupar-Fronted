'use client';

import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#188194',
      dark: '#0B2A45',
      light: '#00A9D6',
    },
    secondary: {
      main: '#008ED6',
    },
    background: {
      default: '#F4F9FC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0B2A45',
      secondary: '#64748B',
    },
    success: {
      main: '#22C55E',
    },
    warning: {
      main: '#FBBF24',
    },
    error: {
      main: '#EF4444',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: ['Inter', 'Roboto', 'Arial', 'sans-serif'].join(','),
    h4: { fontWeight: 800 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 24px rgba(11, 42, 69, 0.06)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
  },
});
