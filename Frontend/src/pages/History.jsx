import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../services/api';

export default function History() {
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getHistory();
        setHistory(data);
      } catch {
        // error al cargar historial
      }
    };
    fetchHistory();
  }, []);

  return (
    <Box sx={{ bgcolor: 'transparent', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
        <IconButton color="inherit" onClick={() => navigate('/scanner')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="bold">Historial de Hoy</Typography>
      </Box>

      <Box sx={{ p: 2, flex: 1 }}>
        <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: 'primary.main' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Folio</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Película</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Hora Función</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Asientos</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Escaneado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">No hay escaneos válidos hoy.</TableCell>
              </TableRow>
            ) : (
              history.map((row) => (
                <TableRow key={row.folio}>
                  <TableCell>{row.folio}</TableCell>
                  <TableCell>{row.pelicula}</TableCell>
                  <TableCell>{row.horario || 'N/A'}</TableCell>
                  <TableCell>{row.asientos ? row.asientos.join(', ') : 'N/A'}</TableCell>
                  <TableCell>{new Date(row.scannedAt).toLocaleTimeString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      </Box>
    </Box>
  );
}
