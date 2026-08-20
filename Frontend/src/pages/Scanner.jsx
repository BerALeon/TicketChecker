import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Paper, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { validateTicket, getConfigStatus } from '../services/api';

export default function Scanner() {
  const [scanResult, setScanResult] = useState(null);
  const [statusColor, setStatusColor] = useState('transparent');
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerMode, setScannerMode] = useState('Camera');
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  
  // Password Modal State
  const [openPasswordModal, setOpenPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleConfigClick = () => {
    handleMenuClose();
    setPasswordInput('');
    setPasswordError(false);
    setOpenPasswordModal(true);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === 'Cinemex2026') {
      setOpenPasswordModal(false);
      navigate('/setup');
    } else {
      setPasswordError(true);
    }
  };

  useEffect(() => {
    getConfigStatus().then(res => {
      if (res.scannerMode) {
        setScannerMode(res.scannerMode);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    scannerRef.current = new Html5Qrcode("reader");

    return () => {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === 2 /* SCANNING */ || state === 3 /* PAUSED */) {
          scannerRef.current.stop().catch(console.error);
        }
      }
    };
  }, []);

  const toggleScanner = async () => {
    if (!scannerRef.current) return;

    if (isScannerActive) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        setIsScannerActive(false);
      } catch (err) {
        console.warn('Scanner stop warning:', err);
      }
    } else {
      try {
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10 },
          onScanSuccess
        );
        setIsScannerActive(true);
      } catch (err) {
        console.error('Camera start error:', err);
        if (!window.isSecureContext) {
          alert('⚠️ ERROR DE SEGURIDAD:\n\nLa cámara requiere una conexión segura (HTTPS) para funcionar.\n\nPor favor, accede a la aplicación utilizando HTTPS en lugar de HTTP, o configura los permisos del navegador.');
        } else {
          alert(`Error al iniciar la cámara: ${err.message || err}\n\nAsegúrate de haber dado los permisos de cámara al navegador.`);
        }
      }
    }
  };

  const onScanSuccess = async (decodedText) => {
    try {
      if (scannerRef.current?.getState() === 2 /* SCANNING */) {
        await scannerRef.current.stop();
        setIsScannerActive(false);
      }
    } catch (err) {
      console.warn('Scanner stop on success warning:', err);
    }

    try {
      let ticketData;
      try {
        ticketData = JSON.parse(decodedText);
      } catch (err) {
        console.debug('No JSON format detected:', err);
        ticketData = { folio: decodedText, pelicula: "QR de Prueba" };
      }

      const res = await validateTicket(ticketData);

      setScanResult(res);

      if (navigator.vibrate) {
        navigator.vibrate([200]);
      }

      if (res.status === 'VALID') {
        setStatusColor('#4CAF50');
      } else if (res.status === 'INVALID') {
        setStatusColor('#F44336');
      } else if (res.status === 'DUPLICATE' || res.status === 'EARLY') {
        setStatusColor('#FF9800');
      }

    } catch (err) {
      console.error('Validation error:', err);
      setScanResult({ status: 'ERROR', message: 'QR Inválido o formato incorrecto.' });
      setStatusColor('#F44336');
    }
  };

  useEffect(() => {
    if (scannerMode !== 'USB') return;

    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      // Ignorar lectura si hay un modal abierto o hay un resultado en pantalla
      if (openPasswordModal || openMenu || scanResult) return;

      const currentTime = Date.now();
      
      // Si el tiempo entre teclas es muy largo, no es un scanner USB
      if (currentTime - lastKeyTime > 50) {
        barcodeBuffer = ''; 
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 0) {
          onScanSuccess(barcodeBuffer);
          barcodeBuffer = '';
        }
      } else if (e.key.length === 1) { // Caracteres normales
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scannerMode, openPasswordModal, openMenu, scanResult]);

  const handleAcceptResult = () => {
    setScanResult(null);
    setStatusColor('transparent');
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: 'transparent',
      border: `16px solid ${statusColor}`,
      transition: 'border-color 0.3s ease',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <img src="/images/Logo.png" alt="Logo" style={{ height: '32px', borderRadius: '4px' }} />
          <Typography variant="h6" fontWeight="bold">Validación de Boletos</Typography>
        </Box>
        <Box>
          <IconButton color="inherit" onClick={handleMenuClick}>
            <MenuIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={openMenu}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => { handleMenuClose(); navigate('/history'); }}>
              <ListItemIcon>
                <HistoryIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Historial</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleConfigClick}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Configuración</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Box sx={{ display: scanResult ? 'none' : 'block', width: '100%', maxWidth: 400, position: 'relative' }}>
          <div className="scanner-container" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isScannerActive && scannerMode === 'Camera' ? 'transparent' : 'rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
            {isScannerActive && scannerMode === 'Camera' && (
              <>
                <div className="scanner-guides"></div>
                <div className="scan-line"></div>
              </>
            )}
            
            {scannerMode === 'Camera' ? (
              <Box id="reader" sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }} />
            ) : (
              <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <QrCodeScannerIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2, opacity: 0.8 }} />
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  Escáner Listo
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Este dispositivo se conecta por USB. El sistema está listo para leer el código.
                </Typography>
              </Box>
            )}
          </div>
          
          {scannerMode === 'Camera' && (
            <Button 
              variant="contained"
              color={isScannerActive ? "error" : "primary"}
              fullWidth
              onClick={toggleScanner}
              sx={{ mt: 3, py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
            >
              {isScannerActive ? "Apagar Escáner" : "Escanear Boletos"}
            </Button>
          )}
        </Box>
        
        {scanResult && (
          <Paper sx={{ p: 4, width: '100%', maxWidth: 400, textAlign: 'center', bgcolor: statusColor, color: 'white' }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {scanResult.status === 'VALID' && '✅ VÁLIDO'}
              {scanResult.status === 'EARLY' && '⚠️ MUY TEMPRANO'}
              {scanResult.status === 'INVALID' && '❌ INVÁLIDO'}
              {scanResult.status === 'DUPLICATE' && '⚠️ DUPLICADO'}
              {scanResult.status === 'ERROR' && '❌ ERROR'}
            </Typography>
            <Typography variant="h6" gutterBottom>{scanResult.message}</Typography>
            {scanResult.folio && (
              <Box sx={{ mt: 2, textAlign: 'left', bgcolor: 'rgba(255,255,255,0.2)', p: 2, borderRadius: 1 }}>
                <Typography><strong>Folio:</strong> {scanResult.folio}</Typography>
                {scanResult.pelicula && <Typography><strong>Película:</strong> {scanResult.pelicula}</Typography>}
                {scanResult.horario && <Typography><strong>Horario:</strong> {scanResult.horario}</Typography>}
                {scanResult.asientos && scanResult.asientos.length > 0 && <Typography><strong>Asientos:</strong> {scanResult.asientos.join(', ')}</Typography>}
              </Box>
            )}
            <Button 
              variant="contained" 
              fullWidth 
              onClick={handleAcceptResult}
              sx={{ 
                mt: 3, 
                bgcolor: 'white', 
                color: statusColor, 
                fontWeight: 'bold', 
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': { bgcolor: '#f0f0f0' } 
              }}
            >
              ACEPTAR
            </Button>
          </Paper>
        )}
      </Box>

      {/* Modal de Contraseña para Configuración */}
      <Dialog open={openPasswordModal} onClose={() => setOpenPasswordModal(false)}>
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 'bold' }}>Acceso Restringido</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Ingrese la contraseña de administrador para modificar la configuración.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Contraseña"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            error={passwordError}
            helperText={passwordError ? "Contraseña incorrecta" : ""}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handlePasswordSubmit();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPasswordModal(false)}>Cancelar</Button>
          <Button onClick={handlePasswordSubmit} variant="contained" color="primary">
            Aceptar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
