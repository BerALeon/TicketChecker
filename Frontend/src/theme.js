import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#EE2A43', // Cinemex Red Pantone 711 CP
    },
    secondary: {
      main: '#1A1A1A', // Dark grey/black used in Cinemex branding
    },
    success: {
      main: '#4CAF50', // Solid green
    },
    error: {
      main: '#F44336', // Solid red
    },
    warning: {
      main: '#FF9800', // Solid orange
    },
    background: {
      default: '#F5F5F5',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Maison Neue", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Flat design
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: 'none',
          border: '1px solid #e0e0e0',
        },
      },
    },
  },
});

export default theme;
