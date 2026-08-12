import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Paper, IconButton } from '@mui/material';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import HistoryIcon from '@mui/icons-material/History';
import { validateTicket } from '../services/api';

export default function Scanner() {
  const [scanResult, setScanResult] = useState(null);
  const [statusColor, setStatusColor] = useState('transparent');
  const [isScannerActive, setIsScannerActive] = useState(false);
  const scannerRef = useRef(null);
  const navigate = useNavigate();

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
      } catch {
        // scanner already stopped
      }
    } else {
      try {
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10 },
          onScanSuccess
        );
        setIsScannerActive(true);
      } catch {
        // could not start camera
      }
    }
  };

  const onScanSuccess = async (decodedText) => {
    try {
      if (scannerRef.current?.getState() === 2 /* SCANNING */) {
        await scannerRef.current.stop();
        setIsScannerActive(false);
      }
    } catch {
      // scanner already stopped
    }

    try {
      let ticketData;
      try {
        ticketData = JSON.parse(decodedText);
      } catch {
        // Fallback for plain text QRs during testing
        ticketData = { folio: decodedText, pelicula: "QR de Prueba" };
      }

      const res = await validateTicket(ticketData);

      setScanResult(res);

      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate([200]);
      }

      if (res.status === 'VALID') {
        setStatusColor('#4CAF50'); // Solid Green
      } else if (res.status === 'INVALID') {
        setStatusColor('#F44336'); // Solid Red
      } else if (res.status === 'DUPLICATE') {
        setStatusColor('#FF9800'); // Solid Orange
      }

    } catch {
      setScanResult({ status: 'ERROR', message: 'QR Inválido o formato incorrecto.' });
      setStatusColor('#F44336');
    }
  };

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
        <IconButton color="inherit" onClick={() => navigate('/history')}>
          <HistoryIcon />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Box sx={{ display: scanResult ? 'none' : 'block', width: '100%', maxWidth: 400, position: 'relative' }}>
          <div className="scanner-container" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isScannerActive ? 'transparent' : 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
            {isScannerActive && (
              <>
                <div className="scanner-guides"></div>
                <div className="scan-line"></div>
              </>
            )}
            <Box id="reader" sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }} />
          </div>
          
          <Button 
            variant="contained"
            color={isScannerActive ? "error" : "primary"}
            fullWidth
            onClick={toggleScanner}
            sx={{ mt: 3, py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
          >
            {isScannerActive ? "Apagar Escáner" : "Escanear Boletos"}
          </Button>
        </Box>
        
        {scanResult && (
          <Paper sx={{ p: 4, width: '100%', maxWidth: 400, textAlign: 'center', bgcolor: statusColor, color: 'white' }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {scanResult.status === 'VALID' && '✅ VÁLIDO'}
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
    </Box>
  );
}
