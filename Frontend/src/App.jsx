import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Scanner from './pages/Scanner';
import History from './pages/History';

function App() {
  const isAuthenticated = () => {
    return !!localStorage.getItem('token');
  };

  const ProtectedRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/scanner" 
          element={
            <ProtectedRoute>
              <Scanner />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/history" 
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to={isAuthenticated() ? "/scanner" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
