const API_URL = '/api'; // Using relative path since frontend and backend are on the same server

export const getConfigStatus = async () => {
  const res = await fetch(`${API_URL}/config/status`, {
    cache: 'no-store'
  });
  return res.json();
};

export const setupConfig = async (url, terminalId) => {
  const res = await fetch(`${API_URL}/config/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, terminalId })
  });
  return res.json();
};

export const validateTicket = async (ticketData) => {
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
