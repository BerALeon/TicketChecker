import { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Alert } from '@mui/material';
import { setupConfig } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Setup({ onSetupComplete }) {
  const navigate = useNavigate();
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('8001');
  const [terminalId, setTerminalId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSetup = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!ip || !port || !terminalId) {
      setError('Por favor completa todos los campos.');
      return;
    }

    const constructedUrl = `http://${ip}:${port}/`;

    setIsLoading(true);
    try {
      const res = await setupConfig(constructedUrl, terminalId);
      if (res.message && res.message.includes('exitosamente')) {
        onSetupComplete();
        navigate('/scanner');
      } else {
        setError(res.message || 'Error al guardar la configuración.');
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      bgcolor: 'transparent',
      pt: 2,
      px: 2
    }}>
      <Paper sx={{ p: 3, pt: 2, width: '100%', maxWidth: 400, borderRadius: 2, boxShadow: 3 }}>
        <Typography variant="h5" align="center" fontWeight="bold" gutterBottom>
          Configuración Inicial
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
          Por favor, ingresa los datos del complejo para comenzar a validar boletos.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSetup}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="IP del Servidor (Sales Portal)"
              variant="outlined"
              margin="normal"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="10.55.55.78"
              disabled={isLoading}
            />
            <TextField
              label="Puerto"
              variant="outlined"
              margin="normal"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="8001"
              disabled={isLoading}
              sx={{ width: '120px' }}
            />
          </Box>
          <TextField
            fullWidth
            label="ID de Terminal"
            variant="outlined"
            margin="normal"
            value={terminalId}
            onChange={(e) => setTerminalId(e.target.value)}
            placeholder="DE-PIL2-A1"
            disabled={isLoading}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            disabled={isLoading}
            sx={{ mt: 3, py: 1.5, fontWeight: 'bold' }}
          >
            {isLoading ? 'Guardando...' : 'Guardar y Continuar'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
