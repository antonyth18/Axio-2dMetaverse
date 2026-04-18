// src/config/api.ts

export const getBaseUrl = (port: string, protocol: 'http' | 'ws' = 'http'): string => {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    
    // Auto-detect if we are running over LAN
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const baseProtocol = protocol === 'ws' ? 'ws' : 'http';
      return `${baseProtocol}://${hostname}:${port}`;
    }
  }

  // Fallback to localhost for dev
  const baseProtocol = protocol === 'ws' ? 'ws' : 'http';
  return `${baseProtocol}://localhost:${port}`;
};

export const HTTP_API_URL = getBaseUrl('3000');
export const WS_URL = getBaseUrl('8081', 'ws');
export const GO_API_URL = getBaseUrl('8082');
export const LIVEKIT_URL = getBaseUrl('7880', 'ws');
