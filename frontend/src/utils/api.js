// API Configuration - Hardcoded for now
export const API_BASE_URL = 'https://enterprise-integration-test-automation-backend-production.up.railway.app';
export const WS_URL = 'wss://enterprise-integration-test-automation-backend-production.up.railway.app/ws';

// Debug: Log environment variables
console.log('Environment Variables:', {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_WS_URL: import.meta.env.VITE_WS_URL,
  API_BASE_URL,
  WS_URL
});

// API Helper Functions
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('🔗 url:', url);
  // Debug: Log the actual URL being used
  console.log('🔗 API Request URL:', url);
  console.log('🔗 API_BASE_URL:', API_BASE_URL);
  console.log('🔗 Endpoint:', endpoint);
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Add authorization header if token exists
  const token = localStorage.getItem('token');
  if (token) {
    defaultOptions.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

// WebSocket Helper
export const createWebSocket = () => {
  return new WebSocket(WS_URL);
};
