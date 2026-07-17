'use client';

import { createTheme } from '@mui/material/styles';

export const sisbenPalette = {
  primaryBlue: '#0066CC',
  primaryBlueDark: '#004B99',
  primaryBlueLight: '#EAF3FC',
  sisbenRed: '#E30613',
  sisbenRedDark: '#B0000B',
  yellow: '#FCD116',
  yellowSoft: '#FFF7D1',
  background: '#F4F8FC',
  surface: '#FFFFFF',
  surfaceSoft: '#F8FBFF',
  textPrimary: '#263238',
  textSecondary: '#607D8B',
  border: '#D9E2EC',
};

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: sisbenPalette.primaryBlue,
      dark: sisbenPalette.primaryBlueDark,
      light: '#3385D6',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: sisbenPalette.sisbenRed,
      dark: sisbenPalette.sisbenRedDark,
      light: '#F04A55',
      contrastText: '#FFFFFF',
    },
    background: {
      default: sisbenPalette.background,
      paper: sisbenPalette.surface,
    },
    text: {
      primary: sisbenPalette.textPrimary,
      secondary: sisbenPalette.textSecondary,
    },
    success: {
      main: '#2E7D32',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: sisbenPalette.yellow,
      dark: '#C9A600',
      light: sisbenPalette.yellowSoft,
      contrastText: sisbenPalette.textPrimary,
    },
    error: {
      main: sisbenPalette.sisbenRed,
      dark: sisbenPalette.sisbenRedDark,
      contrastText: '#FFFFFF',
    },
    info: {
      main: sisbenPalette.primaryBlue,
      contrastText: '#FFFFFF',
    },
    divider: sisbenPalette.border,
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: ['Inter', 'Roboto', 'Arial', 'sans-serif'].join(','),
    h4: {
      fontWeight: 900,
      color: sisbenPalette.textPrimary,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 900,
      color: sisbenPalette.textPrimary,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 800,
      color: sisbenPalette.textPrimary,
    },
    button: {
      textTransform: 'none',
      fontWeight: 800,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          backgroundColor: sisbenPalette.background,
        },
        body: {
          backgroundColor: sisbenPalette.background,
          color: sisbenPalette.textPrimary,
        },
        '*': {
          boxSizing: 'border-box',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: sisbenPalette.surface,
          color: sisbenPalette.textPrimary,
          borderBottom: `1px solid ${sisbenPalette.border}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${sisbenPalette.border}`,
          boxShadow: '0 14px 34px rgba(0, 77, 153, 0.07)',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 800,
          textTransform: 'none',
          '&.MuiButton-containedPrimary': {
            backgroundColor: sisbenPalette.primaryBlue,
            color: '#FFFFFF',
          },
          '&.MuiButton-containedPrimary:hover': {
            backgroundColor: sisbenPalette.primaryBlueDark,
          },
          '&.MuiButton-containedSecondary': {
            backgroundColor: sisbenPalette.sisbenRed,
            color: '#FFFFFF',
          },
          '&.MuiButton-containedSecondary:hover': {
            backgroundColor: sisbenPalette.sisbenRedDark,
          },
          '&.MuiButton-outlinedPrimary': {
            borderColor: sisbenPalette.primaryBlue,
            color: sisbenPalette.primaryBlue,
          },
          '&.MuiButton-outlinedPrimary:hover': {
            borderColor: sisbenPalette.primaryBlueDark,
            backgroundColor: 'rgba(0, 102, 204, 0.06)',
          },
          '&.MuiButton-outlinedSecondary': {
            borderColor: sisbenPalette.sisbenRed,
            color: sisbenPalette.sisbenRed,
          },
          '&.MuiButton-outlinedSecondary:hover': {
            borderColor: sisbenPalette.sisbenRedDark,
            backgroundColor: 'rgba(227, 6, 19, 0.06)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 800,
          borderRadius: 10,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: sisbenPalette.primaryBlueLight,
          color: sisbenPalette.textPrimary,
          fontWeight: 900,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: sisbenPalette.primaryBlue,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: sisbenPalette.primaryBlue,
            borderWidth: 2,
          },
        },
        notchedOutline: {
          borderColor: sisbenPalette.border,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          fontWeight: 600,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },
  },
});