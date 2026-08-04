import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Paper, IconButton } from '@mui/material';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import HistoryIcon from '@mui/icons-material/History';
import { validateTicket } from '../services/api';

export default function Scanner() {
  const [scanResult, setScanResult] = useState(null);
  const [statusColor, setStatusColor] = useState('transparent');
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10 },
          onScanSuccess
        );
      } catch (err) {
        console.error("Failed to start scanner", err);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const onScanSuccess = async (decodedText) => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
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
      } else if (res.status === 'OFFLINE_PENDING') {
        setStatusColor('#2196F3'); // Solid Blue for offline
      }

      // Resume scanning after 3 seconds
      setTimeout(async () => {
        setScanResult(null);
        setStatusColor('transparent');
        try {
          if (scannerRef.current && !scannerRef.current.isScanning) {
            await scannerRef.current.start(
              { facingMode: "environment" },
              { fps: 10 },
              onScanSuccess
            );
          }
        } catch (e) {
          console.error("Resume failed", e);
        }
      }, 3000);

    } catch (e) {
      setScanResult({ status: 'ERROR', message: 'QR Inválido o formato incorrecto.' });
      setStatusColor('#F44336');

      setTimeout(async () => {
        setScanResult(null);
        setStatusColor('transparent');
        if (scannerRef.current && !scannerRef.current.isScanning) {
          await scannerRef.current.start(
            { facingMode: "environment" },
            { fps: 10 },
            onScanSuccess
          );
        }
      }, 3000);
    }
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
          <div className="scanner-container">
            <div className="scanner-guides"></div>
            <div className="scan-line"></div>
            <Box id="reader" sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }} />
          </div>
        </Box>
        
        {scanResult && (
          <Paper sx={{ p: 4, width: '100%', maxWidth: 400, textAlign: 'center', bgcolor: statusColor, color: 'white' }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {scanResult.status === 'VALID' && '✅ VÁLIDO'}
              {scanResult.status === 'INVALID' && '❌ INVÁLIDO'}
              {scanResult.status === 'DUPLICATE' && '⚠️ DUPLICADO'}
              {scanResult.status === 'OFFLINE_PENDING' && '💾 GUARDADO OFFLINE'}
              {scanResult.status === 'ERROR' && '❌ ERROR'}
            </Typography>
            <Typography variant="h6" gutterBottom>{scanResult.message}</Typography>
            {scanResult.folio && (
              <Box sx={{ mt: 2, textAlign: 'left', bgcolor: 'rgba(255,255,255,0.2)', p: 2, borderRadius: 1 }}>
                <Typography><strong>Folio:</strong> {scanResult.folio}</Typography>
                {scanResult.pelicula && <Typography><strong>Película:</strong> {scanResult.pelicula}</Typography>}
                {scanResult.asientos && <Typography><strong>Asientos:</strong> {scanResult.asientos.join(', ')}</Typography>}
              </Box>
            )}
          </Paper>
        )}
      </Box>
    </Box>
  );
}
