import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Setup from './pages/Setup';
import Scanner from './pages/Scanner';
import History from './pages/History';
import { getConfigStatus } from './services/api';
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ isConfigured, children }) => {
  return isConfigured ? children : <Navigate to="/setup" />;
};

function App() {
  const [isConfigured, setIsConfigured] = useState(null);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await getConfigStatus();
        setIsConfigured(res.isConfigured);
      } catch (err) {
        setIsConfigured(false);
      }
    };
    checkConfig();
  }, []);

  if (isConfigured === null) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }



  return (
    <Router>
      <Routes>
        <Route path="/setup" element={isConfigured ? <Navigate to="/scanner" /> : <Setup onSetupComplete={() => setIsConfigured(true)} />} />
        <Route 
          path="/scanner" 
          element={
            <ProtectedRoute isConfigured={isConfigured}>
              <Scanner />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/history" 
          element={
            <ProtectedRoute isConfigured={isConfigured}>
              <History />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to={isConfigured ? "/scanner" : "/setup"} />} />
      </Routes>
    </Router>
  );
}

export default App;
