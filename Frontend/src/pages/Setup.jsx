import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, Alert, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel } from '@mui/material';
import { setupConfig, getConfigStatus } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Setup({ onSetupComplete }) {
  const navigate = useNavigate();
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('8001');
  const [terminalId, setTerminalId] = useState('');
  const [scannerMode, setScannerMode] = useState('Camera');
  
  const [initialIp, setInitialIp] = useState('');
  const [initialPort, setInitialPort] = useState('8001');
  const [initialTerminalId, setInitialTerminalId] = useState('');
  const [initialScannerMode, setInitialScannerMode] = useState('Camera');
  
  const [isConfiguredState, setIsConfiguredState] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await getConfigStatus();
        if (res.isConfigured) {
          setIsConfiguredState(true);
          setInitialTerminalId(res.terminalId);
          setTerminalId(res.terminalId);
          setInitialScannerMode(res.scannerMode || 'Camera');
          setScannerMode(res.scannerMode || 'Camera');
          
          if (res.url) {
            // Extraer IP y Puerto de http://IP:PORT/
            try {
              const urlObj = new URL(res.url);
              setInitialIp(urlObj.hostname);
              setIp(urlObj.hostname);
              const p = urlObj.port || '80';
              setInitialPort(p);
              setPort(p);
            } catch (e) {
              console.warn("Error parsing URL:", res.url);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching config status:", err);
      } finally {
        setIsPageLoading(false);
      }
    };
    fetchConfig();
  }, []);

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
      const res = await setupConfig(constructedUrl, terminalId, scannerMode);
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

  const handleCancel = () => {
    navigate('/scanner');
  };

  const isModified = ip !== initialIp || port !== initialPort || terminalId !== initialTerminalId || scannerMode !== initialScannerMode;
  const isSaveDisabled = isLoading || (isConfiguredState && !isModified);

  if (isPageLoading) return null;

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
              placeholder="Ingrese IP"
              disabled={isLoading}
            />
            <TextField
              label="Puerto"
              variant="outlined"
              margin="normal"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="Ingrese Pto."
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
            placeholder="Ingrese ID de Terminal"
            disabled={isLoading}
          />

          <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
            <FormLabel component="legend">Modo de Escáner</FormLabel>
            <RadioGroup
              row
              value={scannerMode}
              onChange={(e) => setScannerMode(e.target.value)}
            >
              <FormControlLabel value="Camera" control={<Radio />} label="Cámara del Dispositivo" disabled={isLoading} />
              <FormControlLabel value="USB" control={<Radio />} label="Pistola Escáner (USB)" disabled={isLoading} />
            </RadioGroup>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            {isConfiguredState && (
              <Button
                variant="outlined"
                color="inherit"
                fullWidth
                size="large"
                onClick={handleCancel}
                disabled={isLoading}
                sx={{ py: 1.5, fontWeight: 'bold' }}
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              disabled={isSaveDisabled}
              sx={{ py: 1.5, fontWeight: 'bold' }}
            >
              {isLoading ? 'Guardando...' : 'Guardar y Continuar'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
