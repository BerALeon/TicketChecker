const API_URL = '/api'; // Using relative path since frontend and backend are on the same server

export const login = async (username, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return res.json();
};

export const validateTicket = async (ticketData) => {
  // Offline Stub: Check if offline
  if (!navigator.onLine) {
    console.log('App is offline, saving to local queue (stub)');
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    queue.push({ ...ticketData, timestamp: new Date().toISOString() });
    localStorage.setItem('offline_queue', JSON.stringify(queue));
    
    return {
      status: 'OFFLINE_PENDING',
      message: 'Sin conexión. Boleto guardado localmente para validación posterior.',
      folio: ticketData.folio || 'N/A'
    };
  }

  const res = await fetch(`${API_URL}/ticket/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticketData)
  });
  return res.json();
};

export const getHistory = async () => {
  const res = await fetch(`${API_URL}/ticket/history/today`);
  return res.json();
};
