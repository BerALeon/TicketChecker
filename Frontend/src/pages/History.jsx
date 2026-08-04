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
      } catch (err) {
        console.error("Error fetching history", err);
      }
    };
    fetchHistory();
  }, []);

  return (
    <Box sx={{ p: 2, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/scanner')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight="bold">Historial de Hoy</Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: 'primary.main' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Folio</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Película</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Hora</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">No hay escaneos válidos hoy.</TableCell>
              </TableRow>
            ) : (
              history.map((row) => (
                <TableRow key={row.folio}>
                  <TableCell>{row.folio}</TableCell>
                  <TableCell>{row.pelicula}</TableCell>
                  <TableCell>{new Date(row.scannedAt).toLocaleTimeString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
