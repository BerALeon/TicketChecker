import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import { login } from '../services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await login(username, password);
      if (res.success) {
        // Validación estricta para SonarQube (S8475: Browser storage should not be poisoned)
        const tokenRegex = /^[a-zA-Z0-9\-_./=]+$/;
        if (typeof res.token === 'string' && tokenRegex.test(res.token)) {
          localStorage.setItem('token', res.token);
          navigate('/scanner');
        } else {
          setError('El servidor devolvió un token con formato inválido.');
        }
      } else {
        setError(res.message);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error de conexión al servidor.');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default', p: 2 }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" align="center" gutterBottom fontWeight="bold">
          Acceso al Sistema
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="Usuario"
            margin="normal"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            fullWidth
            label="Contraseña"
            type="password"
            margin="normal"
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            sx={{ mt: 3 }}
          >
            Ingresar
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
